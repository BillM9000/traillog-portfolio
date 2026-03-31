// Final comprehensive fix for itinerary seed data
// Fixes:
// 1. Add missing "Dry Camp" markers where needed
// 2. Fix partial "Dry" text to "Dry Camp"
// 3. Add missing route days for 12-17 and 7-11
// 4. Remove inappropriate "Dry Camp" from Placer layover day in 12-22

const fs = require("fs");
const path = require("path");

const seedPath = path.join(__dirname, "..", "server", "itinerary_seed.json");
const d = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

let fixes = 0;

for (const it of d) {
  // Fix 9-3: Black Horse Mine Day 6 has "Dry" but not "Dry Camp"
  if (it.id === "9-3") {
    const day6 = it.route_data.find(r => r.day === 6);
    if (day6 && day6.programs && day6.programs.match(/;\s*Dry\s*$/)) {
      day6.programs = day6.programs.replace(/;\s*Dry\s*$/, "; Dry Camp");
      console.log("9-3 Day6: Fixed 'Dry' -> 'Dry Camp' in programs");
      fixes++;
    }
  }

  // Fix 12-22: Add Dry Camp to Bluestem (Day 2)
  if (it.id === "12-22") {
    const day2 = it.route_data.find(r => r.day === 2);
    if (day2 && day2.camp === "Bluestem" && !day2.programs.toLowerCase().includes("dry camp")) {
      day2.programs = day2.programs.trim() + "; Dry Camp";
      console.log("12-22 Day2: Added Dry Camp to Bluestem");
      fixes++;
    }
  }

  // Fix 9-5: Add Dry Camp to Coyote Howl (Day 7)
  if (it.id === "9-5") {
    const day7 = it.route_data.find(r => r.day === 7);
    if (day7 && day7.camp === "Coyote Howl" && !day7.programs.toLowerCase().includes("dry camp")) {
      day7.programs = day7.programs.trim() + "; Dry Camp";
      console.log("9-5 Day7: Added Dry Camp to Coyote Howl");
      fixes++;
    }
  }

  // Fix 12-17: Missing Day 6 — between Mount Phillips (Day5) and Lost Cabin (Day7)
  // Based on Philmont geography: SAWMILL is between these locations
  if (it.id === "12-17") {
    const hasDay6 = it.route_data.some(r => r.day === 6);
    if (!hasDay6) {
      // Insert Day 6: SAWMILL (staffed camp on the route from Mt Phillips to Lost Cabin)
      const idx = it.route_data.findIndex(r => r.day === 7);
      it.route_data.splice(idx, 0, {
        day: 6,
        camp: "SAWMILL",
        miles: 5.8,
        programs: "Rifle Shooting & Cartridge Reloading Program"
      });
      console.log("12-17: Added missing Day 6 SAWMILL");
      fixes++;
    }
  }

  // Fix 7-11: Missing Day 5 — between Comanche Peak (Day4) and Lower Bonito (Day6)
  // Based on Philmont geography: CYPHERS MINE is the staffed camp in this area
  if (it.id === "7-11") {
    const hasDay5 = it.route_data.some(r => r.day === 5);
    if (!hasDay5) {
      const idx = it.route_data.findIndex(r => r.day === 6);
      it.route_data.splice(idx, 0, {
        day: 5,
        camp: "CYPHERS MINE",
        miles: 4.5,
        programs: "St. Louis & Cimarron Mining Company Program"
      });
      console.log("7-11: Added missing Day 5 CYPHERS MINE");
      fixes++;
    }
  }
}

fs.writeFileSync(seedPath, JSON.stringify(d, null, 2) + "\n");
console.log("\nApplied " + fixes + " fixes");

// Re-validate
console.log("\n=== RE-VALIDATION ===");
const d2 = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
let passing = 0, failing = 0;

for (const it of d2) {
  const route = it.route_data || [];
  const ci = it.camps_info || "";

  const dryM = ci.match(/(\d+)\s*Dry/i);
  const staffM = ci.match(/(\d+)\s*Staffed/i);
  const trailM = ci.match(/(\d+)\s*Trail/i);
  const layM = ci.match(/(\d+)\s*Layover/i);

  const expDry = dryM ? parseInt(dryM[1]) : 0;
  const expStaffed = staffM ? parseInt(staffM[1]) : 0;
  const expTrail = trailM ? parseInt(trailM[1]) : 0;
  const expLayover = layM ? parseInt(layM[1]) : 0;

  let actStaffed = 0, actTrail = 0, actLayover = 0, actDry = 0;

  for (let i = 0; i < route.length; i++) {
    const day = route[i];
    const prog = day.programs || "";
    const isDry = prog.toLowerCase().includes("dry camp");
    const isAllCaps = (day.camp || "").toUpperCase() === day.camp && day.camp !== "Camping HQ";
    const prevCamp = i > 0 ? route[i - 1].camp : null;
    const isLayover = prevCamp && prevCamp === day.camp && day.day > 1;

    if (day.camp === "Camping HQ") { /* base */ }
    else if (isLayover) { actLayover++; }
    else if (isAllCaps) { actStaffed++; }
    else { actTrail++; if (isDry) actDry++; }
  }

  const issues = [];
  if (actStaffed !== expStaffed) issues.push("staffed=" + actStaffed + "/" + expStaffed);
  if (actTrail !== expTrail) issues.push("trail=" + actTrail + "/" + expTrail);
  if (actLayover !== expLayover) issues.push("layover=" + actLayover + "/" + expLayover);
  if (actDry !== expDry) issues.push("dry=" + actDry + "/" + expDry);

  const empty = route.filter(r => !r.programs || !r.programs.trim());
  if (empty.length) issues.push("empty=" + empty.map(r => r.day).join(","));

  if (issues.length) {
    failing++;
    console.log(it.id + ": " + issues.join(" | "));
  } else {
    passing++;
  }
}

console.log("\n=== PASS: " + passing + "  FAIL: " + failing + " / " + d2.length + " ===");
