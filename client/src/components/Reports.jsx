import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useAdventure } from "../contexts/AdventureContext";
import { useToast } from "../contexts/ToastContext";
import { api } from "../api";
import { card, cardTitle, fontBody, fontDisplay } from "../utils/theme";
import { computeCrewReadiness, computeMemberReadiness } from "../utils/readiness";
import { Download, Printer, FileSpreadsheet, ClipboardList, Users, Backpack, CalendarCheck, Map, ChevronDown, ChevronUp, Package } from "lucide-react";
import { exportCSV, printHTML } from "../utils/exportUtils";

// ── Report Card Component ──
function ReportCard({ icon: Icon, title, description, formats, onCSV, onPrint, theme }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 16px", borderRadius: 12,
      background: theme.bgAlt, border: `1px solid ${theme.borderLight}`,
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: theme.accentBg, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={18} color={theme.accent} strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.heading, fontFamily: fontBody }}>{title}</div>
          <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.3 }}>{description}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {formats.includes("csv") && (
          <button onClick={onCSV} title="Download CSV" style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${theme.borderLight}`,
            background: theme.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Download size={14} color={theme.accent} />
          </button>
        )}
        {formats.includes("print") && (
          <button onClick={onPrint} title="Print" style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${theme.borderLight}`,
            background: theme.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Printer size={14} color={theme.accent} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Reports({ members, analysis, adventure, isAdmin, trekDates }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { gearCatalog, memberGearMap, skills, itinerary, adventureId, achievements } = useAdventure();
  const { addToast } = useToast();
  const currentUserId = user?.id;
  const [trainingEvents, setTrainingEvents] = useState([]);
  const [packWeights, setPackWeights] = useState({});
  const [loadingWeights, setLoadingWeights] = useState(false);

  // Fetch training events on mount
  useEffect(() => {
    if (!adventureId) return;
    api.getTrainingEvents(adventureId).then(setTrainingEvents).catch(() => {});
  }, [adventureId]);

  const crewName = adventure?.name || "Crew";
  const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // ── ADMIN: Crew Roster CSV ──
  const exportRosterCSV = () => {
    const rows = members.map(m => ({
      Name: m.name,
      Email: m.email || "(manual)",
      Type: m.user_type || "—",
      Role: m.role,
      Participation: m.participation,
      "Date Count": (m.dates || []).length,
    }));
    exportCSV(rows, `${crewName}-roster.csv`);
    addToast("Roster CSV downloaded", "success");
  };

  // ── ADMIN: Crew Roster Print ──
  const printRoster = () => {
    const trekking = members.filter(m => m.participation === "trekking");
    const support = members.filter(m => m.participation === "support");
    const section = (title, list) => {
      if (!list.length) return "";
      return `<div class="section"><h3>${title} (${list.length})</h3><table>
        <tr><th>Name</th><th>Email</th><th>Type</th><th>Role</th></tr>
        ${list.map(m => `<tr><td>${m.name}</td><td>${m.email || "—"}</td><td>${m.user_type || "—"}</td><td>${m.role}</td></tr>`).join("")}
      </table></div>`;
    };
    printHTML(`${crewName} — Crew Roster`, `
      <h1>${crewName} — Crew Roster</h1>
      <h2>${members.length} members · ${trekking.length} trekking · ${support.length} support</h2>
      <div class="meta">Generated ${now}</div>
      ${section("Trekking", trekking)}
      ${section("Support", support)}
    `);
  };

  // ── ADMIN: Gear Readiness Matrix CSV ──
  const exportGearMatrixCSV = () => {
    if (!gearCatalog.length) { addToast("No gear catalog loaded", "error"); return; }
    const rows = members.map(m => {
      const gear = memberGearMap[m.user_id] || [];
      const gearByItem = {};
      gear.forEach(g => { gearByItem[g.gear_id || g.custom_gear_id] = g.status; });
      const row = { Name: m.name, Participation: m.participation };
      gearCatalog.filter(g => g.active !== 0).forEach(g => {
        row[g.name] = gearByItem[g.id] || "—";
      });
      return row;
    });
    exportCSV(rows, `${crewName}-gear-matrix.csv`);
    addToast("Gear matrix CSV downloaded", "success");
  };

  // ── ADMIN: Pack Weight Summary CSV ──
  const exportPackWeightCSV = async () => {
    setLoadingWeights(true);
    try {
      const weights = {};
      for (const m of members) {
        if (!m.user_id) continue;
        try {
          weights[m.user_id] = await api.getMemberPackWeight(adventureId, m.user_id);
        } catch { weights[m.user_id] = null; }
      }
      const rows = members.filter(m => m.user_id).map(m => {
        const w = weights[m.user_id];
        return {
          Name: m.name,
          Participation: m.participation,
          "Personal Gear (lbs)": w ? w.base_weight_lbs : 0,
          "Food (lbs)": w ? w.food_estimate_lbs : 0,
          "Water (lbs)": w ? w.water_lbs : 0,
          "Total (lbs)": w ? w.grand_total_lbs : 0,
          "Packed Items": w ? w.item_count : 0,
        };
      });
      exportCSV(rows, `${crewName}-pack-weights.csv`);
      addToast("Pack weight CSV downloaded", "success");
    } catch { addToast("Failed to fetch pack weights", "error"); }
    setLoadingWeights(false);
  };

  // ── ADMIN: Training RSVP Summary CSV ──
  const exportRSVPCSV = () => {
    if (!trainingEvents.length) { addToast("No training events found", "error"); return; }
    const rows = trainingEvents.map(evt => {
      const going = (evt.rsvps || []).filter(r => r.status === "going").map(r => r.name).join("; ");
      const cant = (evt.rsvps || []).filter(r => r.status === "cant").map(r => r.name).join("; ");
      const goingCount = (evt.rsvps || []).filter(r => r.status === "going").length;
      const cantCount = (evt.rsvps || []).filter(r => r.status === "cant").length;
      return {
        Date: evt.date,
        Period: evt.period,
        Time: evt.time_label || "—",
        Location: evt.location || "—",
        Notes: evt.notes || "",
        "Going (#)": goingCount,
        "Can't (#)": cantCount,
        "No Reply (#)": members.length - goingCount - cantCount,
        "Going": going || "—",
        "Can't Make It": cant || "—",
      };
    });
    exportCSV(rows, `${crewName}-training-rsvps.csv`);
    addToast("RSVP summary CSV downloaded", "success");
  };

  // ── ADMIN: Crew Readiness Overview Print ──
  const printReadinessOverview = () => {
    const crew = computeCrewReadiness(members, skills, gearCatalog, memberGearMap);
    const memberRows = members.map(m => {
      const r = computeMemberReadiness(m, skills, gearCatalog, memberGearMap[m.user_id] || []);
      return `<tr><td>${m.name}</td><td>${m.participation}</td>
        <td>${r.training}%</td><td>${r.gear}%</td><td>${r.medical}%</td><td>${r.admin}%</td>
        <td><strong>${r.overall}%</strong></td></tr>`;
    }).join("");
    printHTML(`${crewName} — Crew Readiness`, `
      <h1>${crewName} — Crew Readiness Overview</h1>
      <h2>Overall: ${crew.overall}%</h2>
      <div class="meta">Generated ${now}</div>
      <table>
        <tr><th>Category</th><th>Score</th></tr>
        <tr><td>Training</td><td>${crew.training}%</td></tr>
        <tr><td>Gear</td><td>${crew.gear}%</td></tr>
        <tr><td>Medical</td><td>${crew.medical}%</td></tr>
        <tr><td>Admin</td><td>${crew.admin}%</td></tr>
        <tr><td><strong>Overall</strong></td><td><strong>${crew.overall}%</strong></td></tr>
      </table>
      <div class="section">
        <h3>Member Breakdown</h3>
        <table>
          <tr><th>Name</th><th>Role</th><th>Training</th><th>Gear</th><th>Medical</th><th>Admin</th><th>Overall</th></tr>
          ${memberRows}
        </table>
      </div>
    `);
  };

  // ── EVERYONE: My Gear Checklist Print ──
  const printMyGearChecklist = () => {
    if (!currentUserId) return;
    const myGear = memberGearMap[currentUserId] || [];
    const gearByStatus = { packed: [], owned: [], need: [], unchecked: [] };
    const activeGear = gearCatalog.filter(g => g.active !== 0);
    activeGear.forEach(g => {
      const mg = myGear.find(item => item.gear_id === g.id);
      const status = mg?.status || "unchecked";
      const entry = { name: g.name, category: g.category, weight: g.weight_oz ? `${g.weight_oz} oz (${(g.weight_oz / 16).toFixed(1)} lbs)` : "—", sharing: g.sharing_type || "personal" };
      if (status === "packed") gearByStatus.packed.push(entry);
      else if (status === "owned") gearByStatus.owned.push(entry);
      else if (status === "needed") gearByStatus.need.push(entry);
      else gearByStatus.unchecked.push(entry);
    });
    const section = (title, items) => {
      if (!items.length) return "";
      return `<div class="section"><h3>${title} (${items.length})</h3><table>
        <tr><th>☐</th><th>Item</th><th>Category</th><th>Weight</th><th>Type</th></tr>
        ${items.map(i => `<tr><td>☐</td><td>${i.name}</td><td>${i.category}</td><td>${i.weight}</td><td>${i.sharing}</td></tr>`).join("")}
      </table></div>`;
    };
    const me = members.find(m => String(m.user_id) === String(currentUserId));
    printHTML(`${me?.name || "My"} — Gear Checklist`, `
      <h1>${me?.name || "My"} — Gear Checklist</h1>
      <h2>${crewName}</h2>
      <div class="meta">Generated ${now} · ${gearByStatus.packed.length} packed · ${gearByStatus.owned.length} owned · ${gearByStatus.need.length} need · ${gearByStatus.unchecked.length} unchecked</div>
      ${section("✅ Packed", gearByStatus.packed)}
      ${section("Owned (not packed yet)", gearByStatus.owned)}
      ${section("Need to Get", gearByStatus.need)}
      ${section("Unchecked", gearByStatus.unchecked)}
    `);
  };

  // ── EVERYONE: Still Need List CSV + Print ──
  const getStillNeedData = () => {
    if (!currentUserId) return [];
    const myGear = memberGearMap[currentUserId] || [];
    const activeGear = gearCatalog.filter(g => g.active !== 0);
    // Items that are either "needed" status or completely unchecked (not owned/packed)
    return activeGear.filter(g => {
      const mg = myGear.find(item => item.gear_id === g.id);
      if (!mg) return true; // unchecked = still need
      return mg.status === "needed"; // explicitly marked as need
    }).map(g => ({
      Name: g.name,
      Category: g.category,
      Priority: g.priority || "—",
      Weight: g.weight_oz ? `${g.weight_oz} oz (${(g.weight_oz / 16).toFixed(1)} lbs)` : "—",
      Type: g.sharing_type || "personal",
    }));
  };

  const exportStillNeedCSV = () => {
    const rows = getStillNeedData();
    if (!rows.length) { addToast("All gear accounted for!", "success"); return; }
    exportCSV(rows, `${crewName}-still-need.csv`);
    addToast("Still-need list CSV downloaded", "success");
  };

  const printStillNeed = () => {
    const items = getStillNeedData();
    const me = members.find(m => String(m.user_id) === String(currentUserId));
    printHTML(`${me?.name || "My"} — Still Need List`, `
      <h1>${me?.name || "My"} — Still Need List</h1>
      <h2>${crewName} · ${items.length} items remaining</h2>
      <div class="meta">Generated ${now}</div>
      ${items.length ? `<table>
        <tr><th>☐</th><th>Item</th><th>Category</th><th>Priority</th><th>Weight</th><th>Type</th></tr>
        ${items.map(i => `<tr><td>☐</td><td>${i.Name}</td><td>${i.Category}</td><td>${i.Priority}</td><td>${i.Weight}</td><td>${i.Type}</td></tr>`).join("")}
      </table>` : "<p>All gear accounted for! 🎉</p>"}
    `);
  };

  // ── EVERYONE: Itinerary Cheat Sheet Print (reuse existing pattern) ──
  const printItinerary = () => {
    if (!itinerary) { addToast("No itinerary selected", "error"); return; }
    const days = itinerary.route_data || [];
    printHTML(`${crewName} — Itinerary`, `
      <h1>${crewName} — Itinerary Cheat Sheet</h1>
      <h2>${itinerary.name || itinerary.id} · ${itinerary.days} days · ${itinerary.difficulty || ""}</h2>
      <div class="meta">Generated ${now}</div>
      <table>
        <tr><th>Day</th><th>Camp</th><th>Miles</th><th>Elev</th><th>Gain/Loss</th><th>Programs</th><th>Notes</th></tr>
        ${days.map(d => `<tr>
          <td>${d.day}</td>
          <td>${d.camp || "—"}${d.type && d.type !== "Trail" ? ` <span style="font-size:10px;color:#888">(${d.type})</span>` : ""}</td>
          <td>${d.miles || "—"}</td>
          <td>${d.elevation ? d.elevation.toLocaleString() + "'" : "—"}</td>
          <td>${d.gain || d.loss ? `+${d.gain || 0}/-${d.loss || 0}` : "—"}</td>
          <td>${(d.programs || []).map(p => typeof p === "string" ? p : p.name).join(", ") || "—"}</td>
          <td style="font-size:11px;color:#666">${d.notes || ""}</td>
        </tr>`).join("")}
      </table>
      ${days.some(d => d.warnings?.length) ? `<div class="section"><h3>⚠️ Trail Warnings</h3><ul>
        ${days.filter(d => d.warnings?.length).map(d => d.warnings.map(w => `<li><strong>Day ${d.day} (${d.camp}):</strong> ${w}</li>`).join("")).join("")}
      </ul></div>` : ""}
    `);
  };

  return (
    <div>
      {/* Guide card */}
      <div style={{ ...card(theme), marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: theme.heading, fontFamily: fontDisplay, marginBottom: 4 }}>
          Reports
        </div>
        <div style={{ fontSize: 11, color: theme.textDimmer, lineHeight: 1.4, marginBottom: 12 }}>
          Export data for planning meetings, shakedown prep, and trek readiness.
          {isAdmin ? " Admin reports show full crew data." : ""}
        </div>

        {/* Format legend */}
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: theme.textDim }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Download size={12} /> CSV download
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Printer size={12} /> Printable
          </span>
        </div>
      </div>

      {/* Admin Reports */}
      {isAdmin && (
        <>
          <div style={{
            fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2,
            textTransform: "uppercase", marginBottom: 8, fontFamily: fontBody,
          }}>
            Admin Reports
          </div>

          <ReportCard
            icon={Users} title="Crew Roster"
            description="Names, emails, roles, participation type"
            formats={["csv", "print"]}
            onCSV={exportRosterCSV} onPrint={printRoster} theme={theme}
          />
          <ReportCard
            icon={ClipboardList} title="Gear Readiness Matrix"
            description="Every member × every gear item status grid"
            formats={["csv"]}
            onCSV={exportGearMatrixCSV} theme={theme}
          />
          <ReportCard
            icon={Backpack} title="Pack Weight Summary"
            description={loadingWeights ? "Loading weights..." : "All members' weight breakdown (personal + food + water)"}
            formats={["csv"]}
            onCSV={exportPackWeightCSV} theme={theme}
          />
          <ReportCard
            icon={CalendarCheck} title="Training RSVP Summary"
            description="Events with attendance — who's going, who can't, no reply"
            formats={["csv"]}
            onCSV={exportRSVPCSV} theme={theme}
          />
          <ReportCard
            icon={Package} title="Crew Readiness Overview"
            description="Readiness scores by category for every member"
            formats={["print"]}
            onPrint={printReadinessOverview} theme={theme}
          />
        </>
      )}

      {/* Everyone Reports */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: theme.textDim, letterSpacing: 1.2,
        textTransform: "uppercase", marginBottom: 8, marginTop: isAdmin ? 20 : 0, fontFamily: fontBody,
      }}>
        My Reports
      </div>

      <ReportCard
        icon={ClipboardList} title="My Gear Checklist"
        description="Printable packing list — packed, owned, and unchecked items"
        formats={["print"]}
        onPrint={printMyGearChecklist} theme={theme}
      />
      <ReportCard
        icon={FileSpreadsheet} title="My Still-Need List"
        description="Gear you haven't checked off yet — great as a shopping list"
        formats={["csv", "print"]}
        onCSV={exportStillNeedCSV} onPrint={printStillNeed} theme={theme}
      />
      <ReportCard
        icon={Map} title="Itinerary Cheat Sheet"
        description="Day-by-day trek summary — camps, miles, elevation, activities"
        formats={["print"]}
        onPrint={printItinerary} theme={theme}
      />
    </div>
  );
}
