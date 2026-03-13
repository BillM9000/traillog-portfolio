// Shared CSV + Print utilities used by Reports, GearList, Itinerary

export function exportCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => {
      const v = r[h] ?? "";
      const s = String(v).replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    }).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function printHTML(title, bodyHTML) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #333; max-width: 900px; margin: 0 auto; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      h2 { font-size: 15px; color: #666; margin-top: 0; font-weight: 400; }
      table { border-collapse: collapse; width: 100%; margin: 12px 0; }
      th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 12px; }
      th { background: #f5f5f0; font-weight: 600; }
      .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
      .badge-packed { background: #d4e8b8; color: #3a4d2a; }
      .badge-own { background: #e8e0d0; color: #5a4a3a; }
      .badge-need { background: #f0e0c0; color: #7a5a2a; }
      .section { margin-top: 20px; }
      .meta { font-size: 11px; color: #999; margin-bottom: 16px; }
      @media print { body { padding: 12px; } .no-print { display: none; } }
    </style>
  </head><body>${bodyHTML}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
}
