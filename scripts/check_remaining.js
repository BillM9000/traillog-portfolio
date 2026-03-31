const fs = require("fs");
const path = require("path");

const d = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "server", "itinerary_seed.json"), "utf-8"));

// Check the 5 failing itineraries in detail
const check = ["12-17", "12-22", "9-3", "9-5", "7-11"];
for (const id of check) {
  const it = d.find(x => x.id === id);
  if (!it) { console.log(id + " NOT FOUND"); continue; }

  console.log("=== " + id + " ===");
  console.log("camps_info: " + it.camps_info);
  console.log("route_data days: " + it.route_data.length);
  console.log("Day numbers: " + it.route_data.map(r => r.day).join(", "));

  it.route_data.forEach((r, i) => {
    console.log("  Day" + r.day + " " + r.camp + " (" + r.miles + "mi) prog: " + (r.programs || "(empty)"));
  });
  console.log();
}
