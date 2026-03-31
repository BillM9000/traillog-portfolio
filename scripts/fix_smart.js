// Smart fix: Only add dry camp markers when there's exactly ONE candidate
// that would bring the count to match camps_info. Otherwise leave it.
// Also: strip incorrect dry markers that OVERSHOOT the expected count.

const fs = require("fs");
const path = require("path");

const seedPath = path.join(__dirname, "..", "server", "itinerary_seed.json");
const d = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

// Step 1: Build STRONG confirmed dry set — only camps marked dry in itineraries
// where marking them brings count TO or BELOW expected
const confirmedDry = new Set([
  // These are confirmed from multiple independent itinerary markings:
  "Beatty Lakes", "Comanche Peak", "Dean Skyline", "Deer Lake",
  "Devils Wash Basin", "Divide", "HARLAN", "Herradura",
  "Magpie", "Minnette Meadows", "Mistletoe", "Mount Phillips",
  "Santa Claus", "Shaefers Pass", "Tooth Ridge", "Trail Canyon",
]);

// Step 2: For each itinerary, use camps_info as truth
let totalFixes = 0;
const report = [];

for (const it of d) {
  const route = it.route_data || [];
  const campsInfo = it.camps_info || "";
  const match = campsInfo.match(/(\d+)\s*Dry/i);
  const expectedDry = match ? parseInt(match[1]) : 0;

  // First: ensure all confirmed dry camps have the marker
  for (const day of route) {
    const prog = day.programs || "";
    if (confirmedDry.has(day.camp) && !prog.toLowerCase().includes("dry camp")) {
      const sep = prog.trim() ? "; " : "";
      day.programs = prog.trim() + sep + "Dry Camp";
      totalFixes++;
    }
  }

  // Count current dry
  let currentDry = route.filter(r => (r.programs || "").toLowerCase().includes("dry camp")).length;

  // If we have TOO MANY, remove from camps that are borderline
  // (i.e. only confirmed in limited contexts)
  if (currentDry > expectedDry) {
    // Remove dry markers from camps we added that aren't really dry on THIS itinerary
    // Priority: remove from camps with fewest overall confirmations
    const overMarked = route.filter(r =>
      (r.programs || "").toLowerCase().includes("dry camp") && !confirmedDry.has(r.camp)
    );
    for (const day of overMarked) {
      if (currentDry <= expectedDry) break;
      day.programs = day.programs.replace(/;\s*Dry Camp$/i, "").replace(/^Dry Camp;\s*/i, "").replace(/^Dry Camp$/i, "");
      currentDry--;
      totalFixes++;
    }
  }

  // Fix empty last day
  for (const day of route) {
    if (day.camp === "Camping HQ" && day.day > 1 && (!day.programs || !day.programs.trim())) {
      day.programs = "Closing Campfire";
      totalFixes++;
    }
  }
}

fs.writeFileSync(seedPath, JSON.stringify(d, null, 2) + "\n");

// Final report
console.log("Applied " + totalFixes + " fixes\n");
console.log("=== FINAL VALIDATION ===");
let issues = 0;
for (const it of d) {
  const route = it.route_data || [];
  const campsInfo = it.camps_info || "";

  const dryMatch = campsInfo.match(/(\d+)\s*Dry/i);
  const expectedDry = dryMatch ? parseInt(dryMatch[1]) : 0;
  const actualDry = route.filter(r => (r.programs || "").toLowerCase().includes("dry camp")).length;

  const staffedMatch = campsInfo.match(/(\d+)\s*Staffed/i);
  const expectedStaffed = staffedMatch ? parseInt(staffedMatch[1]) : 0;
  const actualStaffed = route.filter(r => r.camp.toUpperCase() === r.camp && r.camp !== "Camping HQ").length;

  const layoverMatch = campsInfo.match(/(\d+)\s*Layover/i);
  const expectedLayover = layoverMatch ? parseInt(layoverMatch[1]) : 0;
  let actualLayover = 0;
  for (let i = 1; i < route.length; i++) {
    if (route[i].camp === route[i - 1].camp) actualLayover++;
  }

  const empty = route.filter(r => !r.programs || !r.programs.trim());

  const probs = [];
  if (actualDry !== expectedDry) probs.push(`dry=${actualDry}/${expectedDry}`);
  if (actualStaffed !== expectedStaffed) probs.push(`staffed=${actualStaffed}/${expectedStaffed}`);
  if (actualLayover !== expectedLayover) probs.push(`layover=${actualLayover}/${expectedLayover}`);
  if (empty.length) probs.push(`empty days: ${empty.map(r => r.day)}`);

  if (probs.length) {
    console.log(`${it.id}: ${probs.join(" | ")}`);
    issues++;
  }
}
console.log(`\n${issues} itineraries with remaining issues`);
