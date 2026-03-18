import React from "react";
import Logo from "./Logo";
import type { Adventure } from "../types";

interface RouteDay {
  day: number;
  camp: string;
  miles: number;
  elevation?: number;
  type?: string;
  notes?: string;
  water?: {
    strategy?: string;
    carry_liters?: number;
  };
  programs?: { name: string }[];
}

interface GlobalInfo {
  prohibited_items?: string[];
  conservation_project?: {
    day: number;
    description?: string;
  };
}

interface Itinerary {
  name: string;
  route_data?: RouteDay[];
  global_info?: GlobalInfo;
}

interface Props {
  adventure: Adventure | null;
  itinerary: Itinerary | null;
  onClose: () => void;
}

export default function PrintCheatSheet({ adventure, itinerary, onClose }: Props): React.JSX.Element | null {
  if (!itinerary) return null;
  const route: RouteDay[] = itinerary.route_data || [];
  const global: GlobalInfo = itinerary.global_info || {};
  const totalMiles = route.reduce((s, d) => s + d.miles, 0);

  const print = (type: "pocket" | "full"): void => {
    const w = window.open("", "_blank");
    if (!w) return;
    const dates = [adventure?.depart_date, adventure?.arrive_date, adventure?.return_date, adventure?.home_date].filter(Boolean);
    const dateRange = dates.length >= 2 ? `${dates[0]} to ${dates[dates.length - 1]}` : dates[0] || "";

    const pocketHTML = `
      <h2 style="margin:0 0 4px">${adventure?.name || itinerary.name}</h2>
      <p style="margin:0 0 8px;font-size:11px;color:#666">${dateRange} | ${totalMiles.toFixed(0)} mi total | ${route.length} days</p>
      <table style="width:100%;border-collapse:collapse;font-size:10px">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:3px 4px;text-align:left;border-bottom:1px solid #ccc">Day</th>
          <th style="padding:3px 4px;text-align:left;border-bottom:1px solid #ccc">Camp</th>
          <th style="padding:3px 4px;text-align:right;border-bottom:1px solid #ccc">Mi</th>
          <th style="padding:3px 4px;text-align:right;border-bottom:1px solid #ccc">Elev</th>
          <th style="padding:3px 4px;text-align:left;border-bottom:1px solid #ccc">Type</th>
          <th style="padding:3px 4px;text-align:left;border-bottom:1px solid #ccc">Notes</th>
        </tr></thead>
        <tbody>${route.map(d => `
          <tr style="border-bottom:1px solid #eee${d.type === 'Dry Camp' ? ';background:#fff8f0' : ''}">
            <td style="padding:2px 4px;font-weight:bold">${d.day}</td>
            <td style="padding:2px 4px">${d.camp}</td>
            <td style="padding:2px 4px;text-align:right">${d.miles}</td>
            <td style="padding:2px 4px;text-align:right">${d.elevation ? d.elevation.toLocaleString() + "'" : ""}</td>
            <td style="padding:2px 4px;font-size:9px">${d.type || ""}</td>
            <td style="padding:2px 4px;font-size:9px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.notes || ""}</td>
          </tr>
        `).join("")}</tbody>
      </table>
      <div style="margin-top:8px;font-size:9px;color:#888">
        <strong>DRY CAMPS:</strong> ${route.filter(d => d.type === "Dry Camp").map(d => `Day ${d.day} (${d.camp})`).join(", ") || "None"}
        ${global.prohibited_items ? `<br><strong>PROHIBITED:</strong> ${global.prohibited_items.slice(0, 5).join(", ")}` : ""}
      </div>
    `;

    const fullHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;border-bottom:2px solid #2a3d2e;padding-bottom:8px">
        <div>
          <h1 style="margin:0;font-size:20px;color:#2a3d2e">${adventure?.name || itinerary.name}</h1>
          <p style="margin:2px 0 0;font-size:12px;color:#666">${dateRange}</p>
        </div>
      </div>

      ${pocketHTML}

      ${route.some(d => d.water) ? `
        <h3 style="margin:12px 0 4px;font-size:13px;color:#8a6d3b">Water Strategy</h3>
        <div style="font-size:10px">${route.filter(d => d.water).map(d =>
          `<div style="margin-bottom:4px"><strong>Day ${d.day} (${d.camp}):</strong> ${d.water!.strategy || ""}${d.water!.carry_liters ? ` — Carry ${d.water!.carry_liters}L min` : ""}</div>`
        ).join("")}</div>
      ` : ""}

      ${route.some(d => d.programs?.length) ? `
        <h3 style="margin:12px 0 4px;font-size:13px;color:#4a7a55">Programs</h3>
        <div style="font-size:10px">${route.filter(d => d.programs?.length).map(d =>
          `<div style="margin-bottom:3px"><strong>Day ${d.day}:</strong> ${d.programs!.map(p => p.name).join(", ")}</div>`
        ).join("")}</div>
      ` : ""}

      ${global.prohibited_items ? `
        <h3 style="margin:12px 0 4px;font-size:13px;color:#c03030">Prohibited Items</h3>
        <div style="font-size:10px">${global.prohibited_items.map(i => `<span style="margin-right:8px">&#x2717; ${i}</span>`).join("")}</div>
      ` : ""}

      ${global.conservation_project ? `
        <h3 style="margin:12px 0 4px;font-size:13px;color:#4a7a55">Conservation Project — Day ${global.conservation_project.day}</h3>
        <div style="font-size:10px">${global.conservation_project.description || ""}</div>
      ` : ""}

      <div style="margin-top:12px;font-size:9px;color:#aaa;text-align:center">Generated by TrailLog — traillog.gracezero.ai</div>
    `;

    w.document.write(`<!DOCTYPE html><html><head><title>${adventure?.name || "Trek"} Cheat Sheet</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;max-width:750px;margin:0 auto}@media print{body{padding:10px}}</style>
    </head><body>${type === "pocket" ? pocketHTML : fullHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[999]" onClick={onClose}>
      <div onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="bg-[#1a2420] rounded-xl p-6 w-[300px] text-center shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-[#3d5a45]">
        <Logo size={40} />
        <h3 className="text-[#d4c8a8] my-3 mb-1.5 font-[Georgia,serif]">Print Itinerary</h3>
        <p className="text-[#8a9a8a] text-xs mb-4">No cell phones on the trail — take a paper copy!</p>
        <div className="flex flex-col gap-2">
          <button onClick={() => print("pocket")}
            className="py-2.5 rounded-btn border-none bg-[#4a7a55] text-white text-[13px] font-semibold cursor-pointer">
            Print Pocket Card
          </button>
          <button onClick={() => print("full")}
            className="py-2.5 rounded-btn border border-[#4a7a55] bg-transparent text-[#7aba7a] text-[13px] font-semibold cursor-pointer">
            Print Full Summary
          </button>
          <button onClick={onClose}
            className="py-2 rounded-btn border border-[#3d5a45] bg-transparent text-[#8a9a8a] text-xs cursor-pointer mt-1">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
