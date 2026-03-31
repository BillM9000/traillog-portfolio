// Comprehensive audit: Check ALL categories across ALL itineraries
// Uses exact same logic as Itinerary.tsx to derive camp types

const fs = require("fs");
const path = require("path");

const seedPath = path.join(__dirname, "..", "server", "itinerary_seed.json");
const d = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

let totalIssues = 0;

for (const it of d) {
  const route = it.route_data || [];
  const ci = it.camps_info || "";

  // Parse camps_info expected counts
  const dryM = ci.match(/(\d+)\s*Dry/i);
  const staffM = ci.match(/(\d+)\s*Staffed/i);
  const trailM = ci.match(/(\d+)\s*Trail/i);
  const layM = ci.match(/(\d+)\s*Layover/i);

  const expDry = dryM ? parseInt(dryM[1]) : 0;
  const expStaffed = staffM ? parseInt(staffM[1]) : 0;
  const expTrail = trailM ? parseInt(trailM[1]) : 0;
  const expLayover = layM ? parseInt(layM[1]) : 0;

  // Count actuals using EXACT same logic as Itinerary.tsx
  let actDry = 0, actStaffed = 0, actTrail = 0, actLayover = 0, actBase = 0;
  const details = [];

  for (let i = 0; i < route.length; i++) {
    const day = route[i];
    const prog = day.programs || "";
    const isDry = prog.toLowerCase().includes("dry camp");
    const campUpper = (day.camp || "").toUpperCase();
    const isStaffedByCase = campUpper === day.camp && day.camp !== "Camping HQ" && !isDry;
    const prevCamp = i > 0 ? route[i - 1].camp : null;
    const isLayover = (day.miles === 0 && day.day > 1) || (prevCamp && prevCamp === day.camp && day.day > 1);

    let type;
    if (day.camp === "Camping HQ") { type = "Base"; actBase++; }
    else if (isLayover) { type = "Layover"; actLayover++; }
    else if (isDry) { type = "Dry"; actDry++; }
    else if (isStaffedByCase) { type = "Staffed"; actStaffed++; }
    else { type = "Trail"; actTrail++; }

    details.push({ day: day.day, camp: day.camp, type, miles: day.miles, prog: prog.substring(0, 50) });
  }

  const issues = [];
  if (actDry !== expDry) issues.push("dry=" + actDry + "/" + expDry);
  if (actStaffed !== expStaffed) issues.push("staffed=" + actStaffed + "/" + expStaffed);
  if (actTrail !== expTrail) issues.push("trail=" + actTrail + "/" + expTrail);
  if (actLayover !== expLayover) issues.push("layover=" + actLayover + "/" + expLayover);

  const empty = route.filter(r => !r.programs || !r.programs.trim());
  if (empty.length) issues.push("empty days=" + empty.map(r => r.day).join(","));

  if (issues.length) {
    totalIssues++;
    console.log(it.id + ": " + issues.join(" | "));
    console.log("  camps_info: " + ci);
    details.forEach(d => {
      const marker = d.prog ? "" : " ***EMPTY***";
      console.log("  Day" + d.day + " " + d.camp + " (" + d.miles + "mi) -> " + d.type + marker);
    });
    console.log();
  }
}

console.log("=== " + totalIssues + " / " + d.length + " itineraries have issues ===");
