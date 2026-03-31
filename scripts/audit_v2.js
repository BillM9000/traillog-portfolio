// Audit V2: Test the hypothesis that:
// 1. ALL CAPS = Staffed ALWAYS (even if dry camp marker present, e.g. HARLAN)
// 2. "Trail" count in camps_info INCLUDES dry camps (dry is a SUBSET of trail)
// 3. Layover is exclusive (the 2nd+ day at same camp)
// 4. Staffed camp layover day counts as Layover, not Staffed

const fs = require("fs");
const path = require("path");

const seedPath = path.join(__dirname, "..", "server", "itinerary_seed.json");
const d = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

let passing = 0, failing = 0;

for (const it of d) {
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
    const campUpper = (day.camp || "").toUpperCase();
    const isAllCaps = campUpper === day.camp && day.camp !== "Camping HQ";
    const prevCamp = i > 0 ? route[i - 1].camp : null;
    const isLayover = prevCamp && prevCamp === day.camp && day.day > 1;

    if (day.camp === "Camping HQ") {
      // Base camp - skip
    } else if (isLayover) {
      actLayover++;
    } else if (isAllCaps) {
      actStaffed++;
      // ALL CAPS camp can still be dry but counts as Staffed, not Trail
    } else {
      // Trail camp (includes dry)
      actTrail++;
      if (isDry) actDry++;
    }
  }

  const issues = [];
  if (actStaffed !== expStaffed) issues.push("staffed=" + actStaffed + "/" + expStaffed);
  if (actTrail !== expTrail) issues.push("trail=" + actTrail + "/" + expTrail);
  if (actLayover !== expLayover) issues.push("layover=" + actLayover + "/" + expLayover);
  if (actDry !== expDry) issues.push("dry=" + actDry + "/" + expDry);

  if (issues.length) {
    failing++;
    console.log(it.id + ": " + issues.join(" | ") + '  camps_info="' + ci + '"');
    for (let i = 0; i < route.length; i++) {
      const day = route[i];
      const prog = day.programs || "";
      const isDry = prog.toLowerCase().includes("dry camp");
      const isAllCaps = (day.camp || "").toUpperCase() === day.camp && day.camp !== "Camping HQ";
      const prevCamp = i > 0 ? route[i - 1].camp : null;
      const isLayover = prevCamp && prevCamp === day.camp && day.day > 1;
      let type;
      if (day.camp === "Camping HQ") type = "Base";
      else if (isLayover) type = "Layover";
      else if (isAllCaps) type = "Staffed" + (isDry ? "+DRY" : "");
      else type = "Trail" + (isDry ? "+DRY" : "");
      console.log("  Day" + day.day + " " + day.camp + " -> " + type);
    }
    console.log();
  } else {
    passing++;
  }
}

console.log("=== PASS: " + passing + "  FAIL: " + failing + " / " + d.length + " ===");
