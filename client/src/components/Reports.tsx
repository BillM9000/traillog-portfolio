import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useAdventure } from "../contexts/AdventureContext";
import { useToast } from "../contexts/ToastContext";
import { api } from "../api";
import { card, cardTitle, fontBody, fontDisplay } from "../utils/theme";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { computeCrewReadiness, computeMemberReadiness } from "../utils/readiness";
import { Printer, FileSpreadsheet, ClipboardList, Users, Backpack, CalendarCheck, Map, ChevronDown, ChevronUp, Package } from "lucide-react";
import { exportXLSX, exportXLSXWithSummary, printHTML, gearStatusFormat, gearMatrixFormat } from "../utils/exportUtils";
import type { LucideIcon } from "lucide-react";
import type { Adventure, AdventureMember, TrekDates, ThemeColors, TrainingEvent, GearCatalogItem, MemberGearItem, PackWeightResult } from "../types";

// ── Report Card Component ──
interface ReportCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  formats: string[];
  onXLSX?: () => void;
  onPrint?: () => void;
  theme: ThemeColors;
  compact?: boolean;
}

function ReportCard({ icon: Icon, title, description, formats, onXLSX, onPrint, theme, compact }: ReportCardProps) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: compact ? "10px 14px" : "14px 16px", borderRadius: compact ? 10 : 12,
      background: theme.bgAlt, border: `1px solid ${theme.borderLight}`,
      marginBottom: compact ? 6 : 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: compact ? 10 : 12, flex: 1, minWidth: 0 }}>
        <div style={{
          width: compact ? 32 : 36, height: compact ? 32 : 36, borderRadius: compact ? 8 : 10, flexShrink: 0,
          background: theme.accentBg, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={compact ? 16 : 18} color={theme.accent} strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: theme.heading, fontFamily: fontBody }}>{title}</div>
          <div style={{ fontSize: compact ? 11 : 12, color: theme.textMuted, lineHeight: 1.3 }}>{description}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {formats.includes("xlsx") && (
          <button onClick={onXLSX} title="Download Excel" style={{
            width: compact ? 30 : 32, height: compact ? 30 : 32, borderRadius: 8, border: `1px solid ${theme.borderLight}`,
            background: theme.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <FileSpreadsheet size={14} color={theme.accent} />
          </button>
        )}
        {formats.includes("print") && (
          <button onClick={onPrint} title="Print" style={{
            width: compact ? 30 : 32, height: compact ? 30 : 32, borderRadius: 8, border: `1px solid ${theme.borderLight}`,
            background: theme.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Printer size={14} color={theme.accent} />
          </button>
        )}
      </div>
    </div>
  );
}

interface ReportsProps {
  members: AdventureMember[];
  analysis: unknown;
  adventure: Adventure | null;
  isAdmin: boolean;
  trekDates: TrekDates | null;
}

export default function Reports({ members, analysis, adventure, isAdmin, trekDates }: ReportsProps) {
  const { theme } = useTheme();
  const isDesktop = useIsDesktop();
  const { user } = useAuth();
  const { gearCatalog, memberGearMap, skills, itinerary, adventureId, achievements } = useAdventure();
  const { addToast } = useToast();
  const currentUserId = user?.id;
  const [trainingEvents, setTrainingEvents] = useState<TrainingEvent[]>([]);
  const [packWeights, setPackWeights] = useState<Record<number, PackWeightResult | null>>({});
  const [loadingWeights, setLoadingWeights] = useState(false);

  // Fetch training events on mount
  useEffect(() => {
    if (!adventureId) return;
    api.getTrainingEvents(adventureId).then(setTrainingEvents).catch(() => {});
  }, [adventureId]);

  const crewName = adventure?.name || "Crew";
  const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // ── ADMIN: Crew Roster XLSX ──
  const exportRosterXLSX = async () => {
    const trekking = members.filter(m => m.participation === "trekking");
    const support = members.filter(m => m.participation === "support");
    const mapMember = (m: AdventureMember) => ({
      Name: m.name,
      Email: m.email || "(manual)",
      Type: m.user_type || "\u2014",
      Role: m.role,
      Participation: m.participation,
      "Date Count": (m.dates || []).length,
    });
    await exportXLSXWithSummary(
      {
        title: `${crewName} \u2014 Crew Roster`,
        stats: [
          { label: "Total Members", value: members.length },
          { label: "Trekking", value: trekking.length, color: "3A4D2A" },
          { label: "Support", value: support.length, color: "3B6BB0" },
        ],
      },
      [
        { name: "All Members", rows: members.map(mapMember), title: `All Members (${members.length})` },
        { name: "Trekking", rows: trekking.map(mapMember), title: `Trekking (${trekking.length})` },
        { name: "Support", rows: support.map(mapMember), title: `Support (${support.length})` },
      ],
      `${crewName}-roster.xlsx`
    );
    addToast("Roster downloaded", "success");
  };

  // ── ADMIN: Crew Roster Print ──
  const printRoster = () => {
    const trekking = members.filter(m => m.participation === "trekking");
    const support = members.filter(m => m.participation === "support");
    const section = (title: string, list: AdventureMember[]) => {
      if (!list.length) return "";
      return `<div class="section"><h3>${title} (${list.length})</h3><table>
        <tr><th>Name</th><th>Email</th><th>Type</th><th>Role</th></tr>
        ${list.map(m => `<tr><td>${m.name}</td><td>${m.email || "\u2014"}</td><td>${m.user_type || "\u2014"}</td><td>${m.role}</td></tr>`).join("")}
      </table></div>`;
    };
    printHTML(`${crewName} \u2014 Crew Roster`, `
      <h1>${crewName} \u2014 Crew Roster</h1>
      <h2>${members.length} members \u00B7 ${trekking.length} trekking \u00B7 ${support.length} support</h2>
      <div class="meta">Generated ${now}</div>
      ${section("Trekking", trekking)}
      ${section("Support", support)}
    `);
  };

  // ── ADMIN: Gear Readiness Matrix XLSX (tabs per status) ──
  const exportGearMatrixXLSX = async () => {
    if (!gearCatalog.length) { addToast("No gear catalog loaded", "error"); return; }
    const activeGear = gearCatalog.filter(g => (g as GearCatalogItem & { active?: number }).active !== 0);
    // Full matrix
    const matrixRows = members.map(m => {
      const gear = memberGearMap[m.user_id as number] || [];
      const gearByItem: Record<number, string> = {};
      gear.forEach(g => { gearByItem[g.gear_catalog_id] = g.status; });
      const row: Record<string, unknown> = { Name: m.name, Participation: m.participation };
      activeGear.forEach(g => { row[g.name] = gearByItem[g.id] || "\u2014"; });
      return row;
    });
    // Need tab — items each member still needs
    const needRows: Record<string, string>[] = [];
    members.forEach(m => {
      const gear = memberGearMap[m.user_id as number] || [];
      const gearByItem: Record<number, string> = {};
      gear.forEach(g => { gearByItem[g.gear_catalog_id] = g.status; });
      activeGear.forEach(g => {
        const status = gearByItem[g.id] || "\u2014";
        if (status === "needed" || status === "\u2014") {
          needRows.push({ Member: m.name, Item: g.name, Category: g.category, Status: status === "needed" ? "Need" : "Unchecked" });
        }
      });
    });
    // Packed tab
    const packedRows: Record<string, string>[] = [];
    members.forEach(m => {
      const gear = memberGearMap[m.user_id as number] || [];
      const gearByItem: Record<number, string> = {};
      gear.forEach(g => { gearByItem[g.gear_catalog_id] = g.status; });
      activeGear.forEach(g => {
        if (gearByItem[g.id] === "packed") {
          packedRows.push({ Member: m.name, Item: g.name, Category: g.category });
        }
      });
    });
    // Own tab
    const ownRows: Record<string, string>[] = [];
    members.forEach(m => {
      const gear = memberGearMap[m.user_id as number] || [];
      const gearByItem: Record<number, string> = {};
      gear.forEach(g => { gearByItem[g.gear_catalog_id] = g.status; });
      activeGear.forEach(g => {
        if (gearByItem[g.id] === "owned") {
          ownRows.push({ Member: m.name, Item: g.name, Category: g.category });
        }
      });
    });
    const totalItems = activeGear.length * members.length;
    const packedCount = packedRows.length;
    const ownCount = ownRows.length;
    const needCount = needRows.filter(r => r.Status === "Need").length;
    const uncheckedCount = needRows.filter(r => r.Status === "Unchecked").length;
    await exportXLSXWithSummary(
      {
        title: `${crewName} \u2014 Gear Readiness Matrix`,
        stats: [
          { label: "Total Member\u00D7Item Slots", value: totalItems },
          { label: "Packed", value: packedCount, color: "3A4D2A" },
          { label: "Owned", value: ownCount, color: "3B6BB0" },
          { label: "Need", value: needCount, color: "B8740A" },
          { label: "Unchecked", value: uncheckedCount, color: "DC2626" },
          { label: "Completion", value: `${totalItems > 0 ? Math.round(((packedCount + ownCount) / totalItems) * 100) : 0}%`, color: "3A4D2A" },
        ],
      },
      [
        { name: "Full Matrix", rows: matrixRows, title: "Full Gear Matrix", conditionalFormat: gearMatrixFormat },
        { name: "Need", rows: needRows.length ? needRows : [{ Note: "Everyone is fully accounted for!" }], conditionalFormat: gearStatusFormat },
        { name: "Owned", rows: ownRows.length ? ownRows : [{ Note: "No items in owned status" }] },
        { name: "Packed", rows: packedRows.length ? packedRows : [{ Note: "No items packed yet" }] },
      ],
      `${crewName}-gear-matrix.xlsx`
    );
    addToast("Gear matrix downloaded", "success");
  };

  // ── ADMIN: Pack Weight Summary XLSX ──
  const exportPackWeightXLSX = async () => {
    setLoadingWeights(true);
    try {
      const weights: Record<number, PackWeightResult | null> = {};
      for (const m of members) {
        if (!m.user_id) continue;
        try {
          weights[m.user_id] = await api.getMemberPackWeight(adventureId, m.user_id);
        } catch { weights[m.user_id] = null; }
      }
      const rows = members.filter(m => m.user_id).map(m => {
        const w = weights[m.user_id as number];
        return {
          Name: m.name,
          Participation: m.participation,
          "Personal Gear (lbs)": w ? Number(w.base_weight.toFixed(1)) : 0,
          "Food (lbs)": w ? Number(w.food_weight.toFixed(1)) : 0,
          "Water (lbs)": w ? Number(w.water_weight.toFixed(1)) : 0,
          "Total (lbs)": w ? Number(w.total_weight.toFixed(1)) : 0,
          "Packed Items": w ? w.item_count : 0,
        };
      });
      const avgTotal = rows.length ? (rows.reduce((s, r) => s + r["Total (lbs)"], 0) / rows.length).toFixed(1) : "0";
      const maxTotal = rows.length ? Math.max(...rows.map(r => r["Total (lbs)"])).toFixed(1) : "0";
      await exportXLSXWithSummary(
        {
          title: `${crewName} \u2014 Pack Weight Summary`,
          stats: [
            { label: "Members", value: rows.length },
            { label: "Average Total Weight", value: `${avgTotal} lbs`, color: "3A4D2A" },
            { label: "Heaviest Pack", value: `${maxTotal} lbs`, color: "DC2626" },
          ],
        },
        [{ name: "Pack Weights", rows, title: "Member Pack Weights" }],
        `${crewName}-pack-weights.xlsx`
      );
      addToast("Pack weights downloaded", "success");
    } catch { addToast("Failed to fetch pack weights", "error"); }
    setLoadingWeights(false);
  };

  // ── ADMIN: Training RSVP Summary XLSX ──
  const exportRSVPXLSX = async () => {
    if (!trainingEvents.length) { addToast("No training events found", "error"); return; }
    const summaryRows = trainingEvents.map(evt => {
      const going = (evt.rsvps || []).filter(r => r.status === "going").map(r => r.user_name).join("; ");
      const cant = (evt.rsvps || []).filter(r => r.status === "cant").map(r => r.user_name).join("; ");
      const goingCount = (evt.rsvps || []).filter(r => r.status === "going").length;
      const cantCount = (evt.rsvps || []).filter(r => r.status === "cant").length;
      return {
        Date: evt.date, Period: evt.period, Time: evt.time_label || "\u2014",
        Location: evt.location || "\u2014", Notes: evt.notes || "",
        "Going (#)": goingCount, "Can't (#)": cantCount,
        "No Reply (#)": members.length - goingCount - cantCount,
        "Going": going || "\u2014", "Can't Make It": cant || "\u2014",
      };
    });
    // Per-member attendance sheet
    const attendanceRows = members.map(m => {
      const row: Record<string, string> = { Name: m.name };
      trainingEvents.forEach(evt => {
        const rsvp = (evt.rsvps || []).find(r => String(r.user_id) === String(m.user_id));
        row[`${evt.date} ${evt.period}`] = rsvp ? (rsvp.status === "going" ? "Going" : "Can't") : "No Reply";
      });
      return row;
    });
    await exportXLSXWithSummary(
      {
        title: `${crewName} \u2014 Training RSVP Summary`,
        stats: [
          { label: "Training Events", value: trainingEvents.length },
          { label: "Members", value: members.length },
        ],
      },
      [
        { name: "Events Summary", rows: summaryRows, title: "Events Summary" },
        { name: "Member Attendance", rows: attendanceRows, title: "Member Attendance Grid" },
      ],
      `${crewName}-training-rsvps.xlsx`
    );
    addToast("RSVP summary downloaded", "success");
  };

  // ── ADMIN: Crew Readiness Overview Print ──
  const printReadinessOverview = () => {
    const crew = computeCrewReadiness(members, skills, gearCatalog, memberGearMap);
    const memberRows = members.map(m => {
      const r = computeMemberReadiness(m, skills, gearCatalog, memberGearMap);
      return `<tr><td>${m.name}</td><td>${m.participation}</td>
        <td>${r}%</td>
        <td><strong>${r}%</strong></td></tr>`;
    }).join("");
    printHTML(`${crewName} \u2014 Crew Readiness`, `
      <h1>${crewName} \u2014 Crew Readiness Overview</h1>
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
          <tr><th>Name</th><th>Role</th><th>Overall</th></tr>
          ${memberRows}
        </table>
      </div>
    `);
  };

  // ── EVERYONE: My Gear Checklist Print ──
  const printMyGearChecklist = () => {
    if (!currentUserId) return;
    const myGear = memberGearMap[currentUserId] || [];
    const gearByStatus: Record<string, { name: string; category: string; weight: string; sharing: string }[]> = { packed: [], owned: [], need: [], unchecked: [] };
    const activeGear = gearCatalog.filter(g => (g as GearCatalogItem & { active?: number }).active !== 0);
    activeGear.forEach(g => {
      const mg = myGear.find(item => item.gear_catalog_id === g.id);
      const status = (mg?.status || "unchecked") as string;
      const entry = { name: g.name, category: g.category, weight: g.weight_lbs ? `${(g.weight_lbs * 16).toFixed(0)} oz (${g.weight_lbs.toFixed(1)} lbs)` : "\u2014", sharing: g.sharing_type || "personal" };
      if (status === "packed") gearByStatus.packed.push(entry);
      else if (status === "owned") gearByStatus.owned.push(entry);
      else if (status === "needed") gearByStatus.need.push(entry);
      else gearByStatus.unchecked.push(entry);
    });
    const section = (title: string, items: { name: string; category: string; weight: string; sharing: string }[]) => {
      if (!items.length) return "";
      return `<div class="section"><h3>${title} (${items.length})</h3><table>
        <tr><th>\u2610</th><th>Item</th><th>Category</th><th>Weight</th><th>Type</th></tr>
        ${items.map(i => `<tr><td>\u2610</td><td>${i.name}</td><td>${i.category}</td><td>${i.weight}</td><td>${i.sharing}</td></tr>`).join("")}
      </table></div>`;
    };
    const me = members.find(m => String(m.user_id) === String(currentUserId));
    printHTML(`${me?.name || "My"} \u2014 Gear Checklist`, `
      <h1>${me?.name || "My"} \u2014 Gear Checklist</h1>
      <h2>${crewName}</h2>
      <div class="meta">Generated ${now} \u00B7 ${gearByStatus.packed.length} packed \u00B7 ${gearByStatus.owned.length} owned \u00B7 ${gearByStatus.need.length} need \u00B7 ${gearByStatus.unchecked.length} unchecked</div>
      ${section("\u2705 Packed", gearByStatus.packed)}
      ${section("Owned (not packed yet)", gearByStatus.owned)}
      ${section("Need to Get", gearByStatus.need)}
      ${section("Unchecked", gearByStatus.unchecked)}
    `);
  };

  // ── EVERYONE: Still Need List CSV + Print ──
  const getStillNeedData = () => {
    if (!currentUserId) return [];
    const myGear = memberGearMap[currentUserId] || [];
    const activeGear = gearCatalog.filter(g => (g as GearCatalogItem & { active?: number }).active !== 0);
    // Items that are either "needed" status or completely unchecked (not owned/packed)
    return activeGear.filter(g => {
      const mg = myGear.find(item => item.gear_catalog_id === g.id);
      if (!mg) return true; // unchecked = still need
      return (mg.status as string) === "needed"; // explicitly marked as need
    }).map(g => ({
      Name: g.name,
      Category: g.category,
      Priority: (g as GearCatalogItem & { priority?: string }).priority || "\u2014",
      Weight: g.weight_lbs ? `${(g.weight_lbs * 16).toFixed(0)} oz (${g.weight_lbs.toFixed(1)} lbs)` : "\u2014",
      Type: g.sharing_type || "personal",
    }));
  };

  const exportStillNeedXLSX = async () => {
    const rows = getStillNeedData();
    if (!rows.length) { addToast("All gear accounted for!", "success"); return; }
    await exportXLSX([{ name: "Still Need", rows, title: "Gear Still Needed" }], `${crewName}-still-need.xlsx`);
    addToast("Still-need list downloaded", "success");
  };

  const printStillNeed = () => {
    const items = getStillNeedData();
    const me = members.find(m => String(m.user_id) === String(currentUserId));
    printHTML(`${me?.name || "My"} \u2014 Still Need List`, `
      <h1>${me?.name || "My"} \u2014 Still Need List</h1>
      <h2>${crewName} \u00B7 ${items.length} items remaining</h2>
      <div class="meta">Generated ${now}</div>
      ${items.length ? `<table>
        <tr><th>\u2610</th><th>Item</th><th>Category</th><th>Priority</th><th>Weight</th><th>Type</th></tr>
        ${items.map(i => `<tr><td>\u2610</td><td>${i.Name}</td><td>${i.Category}</td><td>${i.Priority}</td><td>${i.Weight}</td><td>${i.Type}</td></tr>`).join("")}
      </table>` : "<p>All gear accounted for!</p>"}
    `);
  };

  // ── EVERYONE: Itinerary Cheat Sheet Print (reuse existing pattern) ──
  const printItinerary = () => {
    const itineraryData = itinerary as { name?: string; id?: string; days?: number; difficulty?: string; route_data?: Array<{ day: number; camp?: string; type?: string; miles?: number; elevation?: number; gain?: number; loss?: number; programs?: Array<string | { name: string }>; notes?: string; warnings?: string[] }> } | null;
    if (!itineraryData) { addToast("No itinerary selected", "error"); return; }
    const days = itineraryData.route_data || [];
    printHTML(`${crewName} \u2014 Itinerary`, `
      <h1>${crewName} \u2014 Itinerary Cheat Sheet</h1>
      <h2>${itineraryData.name || itineraryData.id} \u00B7 ${itineraryData.days} days \u00B7 ${itineraryData.difficulty || ""}</h2>
      <div class="meta">Generated ${now}</div>
      <table>
        <tr><th>Day</th><th>Camp</th><th>Miles</th><th>Elev</th><th>Gain/Loss</th><th>Programs</th><th>Notes</th></tr>
        ${days.map(d => `<tr>
          <td>${d.day}</td>
          <td>${d.camp || "\u2014"}${d.type && d.type !== "Trail" ? ` <span style="font-size:10px;color:#888">(${d.type})</span>` : ""}</td>
          <td>${d.miles || "\u2014"}</td>
          <td>${d.elevation ? d.elevation.toLocaleString() + "'" : "\u2014"}</td>
          <td>${d.gain || d.loss ? `+${d.gain || 0}/-${d.loss || 0}` : "\u2014"}</td>
          <td>${(d.programs || []).map(p => typeof p === "string" ? p : p.name).join(", ") || "\u2014"}</td>
          <td style="font-size:11px;color:#666">${d.notes || ""}</td>
        </tr>`).join("")}
      </table>
      ${days.some(d => d.warnings?.length) ? `<div class="section"><h3>Trail Warnings</h3><ul>
        ${days.filter(d => d.warnings?.length).map(d => (d.warnings || []).map(w => `<li><strong>Day ${d.day} (${d.camp}):</strong> ${w}</li>`).join("")).join("")}
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
            <FileSpreadsheet size={12} /> Excel download
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
            formats={["xlsx", "print"]}
            onXLSX={exportRosterXLSX} onPrint={printRoster} theme={theme} compact={isDesktop}
          />
          <ReportCard
            icon={ClipboardList} title="Gear Readiness Matrix"
            description="Every member \u00D7 every gear item \u2014 tabs for Need, Owned, Packed"
            formats={["xlsx"]}
            onXLSX={exportGearMatrixXLSX} theme={theme} compact={isDesktop}
          />
          <ReportCard
            icon={Backpack} title="Pack Weight Summary"
            description={loadingWeights ? "Loading weights..." : "All members' weight breakdown (personal + food + water)"}
            formats={["xlsx"]}
            onXLSX={exportPackWeightXLSX} theme={theme} compact={isDesktop}
          />
          <ReportCard
            icon={CalendarCheck} title="Training RSVP Summary"
            description="Events summary + member attendance grid"
            formats={["xlsx"]}
            onXLSX={exportRSVPXLSX} theme={theme} compact={isDesktop}
          />
          <ReportCard
            icon={Package} title="Crew Readiness Overview"
            description="Readiness scores by category for every member"
            formats={["print"]}
            onPrint={printReadinessOverview} theme={theme} compact={isDesktop}
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
        description="Printable packing list \u2014 packed, owned, and unchecked items"
        formats={["print"]}
        onPrint={printMyGearChecklist} theme={theme} compact={isDesktop}
      />
      <ReportCard
        icon={FileSpreadsheet} title="My Still-Need List"
        description="Gear you haven't checked off yet \u2014 great as a shopping list"
        formats={["xlsx", "print"]}
        onXLSX={exportStillNeedXLSX} onPrint={printStillNeed} theme={theme} compact={isDesktop}
      />
      <ReportCard
        icon={Map} title="Itinerary Cheat Sheet"
        description="Day-by-day trek summary \u2014 camps, miles, elevation, activities"
        formats={["print"]}
        onPrint={printItinerary} theme={theme} compact={isDesktop}
      />
    </div>
  );
}
