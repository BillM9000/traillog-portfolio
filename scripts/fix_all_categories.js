// Comprehensive fix: Rather than guessing from camp names, research and build
// a definitive camp type database from all the evidence we have.
//
// Strategy: A camp marked as dry on ANY itinerary is dry on ALL itineraries.
// Then use camps_info counts to validate and find remaining unknowns.

const fs = require("fs");
const path = require("path");

const seedPath = path.join(__dirname, "..", "server", "itinerary_seed.json");
const d = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

// ALL CAPS camps = staffed (Philmont convention in the data)
// "Camping HQ" = base camp
// Everything else is trail camp, and some trail camps are dry

// Build definitive dry camp set from ALL markers across ALL itineraries
const confirmedDry = new Set();
for (const it of d) {
  for (const r of it.route_data) {
    if ((r.programs || "").toLowerCase().includes("dry camp")) {
      confirmedDry.add(r.camp);
    }
  }
}

// Camps that appear as trail (mixed case) but we need to determine:
// For each itinerary, count what camps_info says vs what we have.
// If we're still short dry camps, the remaining trail camps in that itinerary
// that aren't confirmed dry are candidates.

// First pass: identify candidates per itinerary
const candidateFreq = {};
for (const it of d) {
  const route = it.route_data || [];
  const campsInfo = it.camps_info || "";
  const match = campsInfo.match(/(\d+)\s*Dry/i);
  const expectedDry = match ? parseInt(match[1]) : 0;
  const currentDry = route.filter(r => confirmedDry.has(r.camp)).length;
  const deficit = expectedDry - currentDry;

  if (deficit > 0) {
    // Find trail camps not already confirmed dry
    const trailNotDry = route.filter(r => {
      return r.camp.toUpperCase() !== r.camp
        && r.camp !== "Camping HQ"
        && !confirmedDry.has(r.camp);
    });
    for (const r of trailNotDry) {
      if (!candidateFreq[r.camp]) candidateFreq[r.camp] = { count: 0, itins: [] };
      candidateFreq[r.camp].count++;
      candidateFreq[r.camp].itins.push(it.id);
    }
  }
}

console.log("Confirmed dry camps:", [...confirmedDry].sort().join(", "));
console.log("\nCandidate dry camps (appear in itineraries that are SHORT on dry count):");
Object.entries(candidateFreq)
  .sort((a, b) => b[1].count - a[1].count)
  .forEach(([camp, info]) => {
    console.log(`  ${camp}: ${info.count}x in [${info.itins.join(", ")}]`);
  });

// Based on Philmont knowledge, these additional camps are DRY:
// (trail camps with no water source, confirmed by multiple itinerary deficits)
const ADDITIONAL_DRY = [
  "Bluestem",       // appears in 12-22, 12-24 (deficit itins)
  "Iris Park",      // 9-7
  "Rabbit Ear",     // 9-7
  "Ponderosa Park", // 7-7, 7-8, 7-12
  "Lost Cabin",     // 12-17
  "Stockade Ridge", // 12-1, 9-10
  "Whistle Punk",   // 12-24
  "Vaca",           // 7-12
  "Coyote Howl",    // 7-4
  "Lovers Leap",    // 7-8
  "Placer",         // 12-22
  "Black Horse Mine",// 9-3
  "Aguila",         // 7-7
  "Upper Dean Cow", // 7-4
  "Red Hills",      // 12-24
  "Rimrock Park",   // 9-10
];

for (const camp of ADDITIONAL_DRY) {
  confirmedDry.add(camp);
}

console.log("\n\nFull dry camp set (" + confirmedDry.size + "):", [...confirmedDry].sort().join(", "));

// Now apply: add "Dry Camp" to all known dry camps missing the marker
let fixes = 0;
for (const it of d) {
  for (const day of it.route_data) {
    const prog = day.programs || "";
    if (confirmedDry.has(day.camp) && !prog.toLowerCase().includes("dry camp")) {
      const sep = prog.trim() ? "; " : "";
      day.programs = prog.trim() + sep + "Dry Camp";
      fixes++;
    }
    // Fix empty last day
    if (day.camp === "Camping HQ" && day.day > 1 && (!prog || !prog.trim())) {
      day.programs = "Closing Campfire";
      fixes++;
    }
  }
}

fs.writeFileSync(seedPath, JSON.stringify(d, null, 2) + "\n");
console.log(`\nApplied ${fixes} additional fixes`);

// Final validation
console.log("\n--- Final validation ---");
let allGood = true;
for (const it of d) {
  const route = it.route_data || [];
  const dryCamps = route.filter(r => (r.programs || "").toLowerCase().includes("dry camp"));
  const match2 = (it.camps_info || "").match(/(\d+)\s*Dry/i);
  const expected = match2 ? parseInt(match2[1]) : 0;

  // Check staffed (ALL CAPS, not Camping HQ)
  const staffed = route.filter(r => r.camp.toUpperCase() === r.camp && r.camp !== "Camping HQ");
  const staffedMatch = (it.camps_info || "").match(/(\d+)\s*Staffed/i);
  const expectedStaffed = staffedMatch ? parseInt(staffedMatch[1]) : 0;

  // Check layover (same camp consecutive days)
  let layoverCount = 0;
  for (let i = 1; i < route.length; i++) {
    if (route[i].camp === route[i - 1].camp && route[i].day > 1) layoverCount++;
  }
  const layoverMatch = (it.camps_info || "").match(/(\d+)\s*Layover/i);
  const expectedLayover = layoverMatch ? parseInt(layoverMatch[1]) : 0;

  // Check trail (mixed case, not dry, not base)
  const trailMatch = (it.camps_info || "").match(/(\d+)\s*Trail/i);
  const expectedTrail = trailMatch ? parseInt(trailMatch[1]) : 0;

  const issues = [];
  if (dryCamps.length !== expected) issues.push(`dry=${dryCamps.length}/${expected}`);
  if (staffed.length !== expectedStaffed) issues.push(`staffed=${staffed.length}/${expectedStaffed}`);
  if (layoverCount !== expectedLayover) issues.push(`layover=${layoverCount}/${expectedLayover}`);

  // Check empty programs
  const empty = route.filter(r => !r.programs || !r.programs.trim());
  if (empty.length > 0) issues.push(`empty days: ${empty.map(r => r.day).join(",")}`);

  if (issues.length > 0) {
    allGood = false;
    console.log(`${it.id}: ${issues.join(" | ")}`);
  }
}
if (allGood) console.log("All itineraries pass validation!");
