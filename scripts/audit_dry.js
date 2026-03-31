const d = require("../server/itinerary_seed.json");
const knownDry = new Set();
for (const it of d) {
  for (const r of it.route_data) {
    if ((r.programs || "").toLowerCase().includes("dry camp")) {
      knownDry.add(r.camp);
    }
  }
}
console.log("Known dry camps (marked in at least one itinerary):");
[...knownDry].sort().forEach(c => console.log("  " + c));

console.log("\nAll trail camps (mixed case = trail, ALL CAPS = staffed):");
const freq = {};
for (const it of d) {
  for (const r of it.route_data) {
    if (r.camp.toUpperCase() === r.camp) continue; // staffed
    if (r.camp === "Camping HQ") continue;
    if (!freq[r.camp]) freq[r.camp] = 0;
    freq[r.camp]++;
  }
}
Object.entries(freq).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => {
  const tag = knownDry.has(c) ? " [DRY]" : "";
  console.log("  " + c + ": " + n + tag);
});
