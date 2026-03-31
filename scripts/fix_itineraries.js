// Fix itinerary seed data:
// 1. Add "Dry Camp" to programs text for known dry camps that are missing it
// 2. Add "Closing Campfire" to empty last-day programs
// 3. Report what changed

const fs = require("fs");
const path = require("path");

const seedPath = path.join(__dirname, "..", "server", "itinerary_seed.json");
const d = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

// Known dry camps from Philmont data (confirmed across multiple itineraries)
const KNOWN_DRY = new Set([
  "Beatty Lakes", "Comanche Peak", "Dean Skyline", "Deer Lake",
  "Devils Wash Basin", "Divide", "HARLAN", "Herradura",
  "Magpie", "Minnette Meadows", "Mistletoe", "Mount Phillips",
  "Santa Claus", "Shaefers Pass", "Tooth Ridge", "Trail Canyon",
]);

let totalFixed = 0;
const changes = [];

for (const it of d) {
  const route = it.route_data || [];
  const campsInfo = it.camps_info || "";
  const match = campsInfo.match(/(\d+)\s*Dry/i);
  const expectedDry = match ? parseInt(match[1]) : 0;

  let itChanges = [];

  for (const day of route) {
    const prog = day.programs || "";
    const hasDryMarker = prog.toLowerCase().includes("dry camp");

    // Add dry camp marker if camp is known dry and not already marked
    if (KNOWN_DRY.has(day.camp) && !hasDryMarker) {
      const sep = prog.trim() ? "; " : "";
      day.programs = prog.trim() + sep + "Dry Camp";
      itChanges.push(`Day ${day.day} ${day.camp}: added Dry Camp`);
      totalFixed++;
    }

    // Fix empty last-day programs (return to base camp)
    if (day.camp === "Camping HQ" && day.day > 1 && (!prog || prog.trim() === "")) {
      day.programs = "Closing Campfire";
      itChanges.push(`Day ${day.day}: added Closing Campfire`);
      totalFixed++;
    }
  }

  if (itChanges.length > 0) {
    // Recount dry camps
    const newDryCount = route.filter(r => (r.programs || "").toLowerCase().includes("dry camp")).length;
    changes.push(`${it.id}: ${itChanges.join(", ")} [dry: ${newDryCount} vs expected: ${expectedDry}]`);
  }
}

// Write back
fs.writeFileSync(seedPath, JSON.stringify(d, null, 2) + "\n");
console.log(`Fixed ${totalFixed} entries across ${changes.length} itineraries\n`);
changes.forEach(c => console.log(c));

// Now check remaining mismatches
console.log("\n--- Remaining dry camp mismatches ---");
for (const it of d) {
  const route = it.route_data || [];
  const dryCamps = route.filter(r => (r.programs || "").toLowerCase().includes("dry camp"));
  const match2 = (it.camps_info || "").match(/(\d+)\s*Dry/i);
  const expected = match2 ? parseInt(match2[1]) : 0;
  if (dryCamps.length !== expected) {
    console.log(`${it.id}: found=${dryCamps.length} expected=${expected} camps_info="${it.camps_info}"`);
    const trailNoMarker = route.filter(r => {
      return r.camp.toUpperCase() !== r.camp
        && r.camp !== "Camping HQ"
        && !(r.programs || "").toLowerCase().includes("dry camp");
    });
    if (trailNoMarker.length > 0) {
      console.log(`  Unmarked trail camps: ${trailNoMarker.map(r => `Day${r.day} ${r.camp}`).join(", ")}`);
    }
  }
}
