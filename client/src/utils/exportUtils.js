// Shared Excel + Print utilities used by Reports, GearList, Itinerary
// ExcelJS is lazy-loaded on first export to keep initial bundle small

let _ExcelJS = null;
async function getExcelJS() {
  if (!_ExcelJS) {
    const mod = await import("exceljs");
    _ExcelJS = mod.default || mod;
  }
  return _ExcelJS;
}

// ── Color palette (TrailLog brand) ──
const COLORS = {
  headerBg: "3A4D2A",       // dark forest green
  headerFont: "FFFFFF",     // white
  accentBg: "D4E8B8",       // light green
  accentFont: "3A4D2A",     // forest green
  altRowBg: "F5F5F0",       // warm off-white
  borderColor: "C8C4B8",    // warm gray
  dangerBg: "FEE2E2",       // light red
  dangerFont: "DC2626",     // red
  warningBg: "FFF3E0",      // light orange
  warningFont: "B8740A",    // orange
  infoBg: "E8F0FE",         // light blue
  infoFont: "3B6BB0",       // blue
  successBg: "D4E8B8",      // light green
  successFont: "3A4D2A",    // green
};

function applyHeaderStyle(row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerBg } };
    cell.font = { bold: true, color: { argb: COLORS.headerFont }, size: 11, name: "Calibri" };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      bottom: { style: "medium", color: { argb: COLORS.headerBg } },
    };
  });
  row.height = 22;
}

function applyDataStyles(ws, startRow, endRow, numCols) {
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    const isAlt = (r - startRow) % 2 === 1;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > numCols) return;
      if (isAlt) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.altRowBg } };
      }
      cell.font = { size: 10, name: "Calibri" };
      cell.alignment = { vertical: "middle", wrapText: false };
      cell.border = {
        bottom: { style: "thin", color: { argb: COLORS.borderColor } },
      };
    });
  }
}

function autoFitColumns(ws, rows, headers) {
  headers.forEach((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[h] ?? "").length)
    );
    ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 3, 8), 45);
  });
}

function addAutoFilter(ws, headers) {
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
}

function addTitleRow(ws, title, numCols) {
  ws.insertRow(1, [title]);
  ws.mergeCells(1, 1, 1, numCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.font = { bold: true, size: 14, name: "Calibri", color: { argb: COLORS.headerBg } };
  titleCell.alignment = { vertical: "middle" };
  ws.getRow(1).height = 24;
  // Push header filter down
  return 2; // new header row
}

function saveWorkbook(wb, filename) {
  wb.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}

/**
 * Build a professional worksheet from rows.
 * @param {ExcelJS.Workbook} wb
 * @param {string} name - Sheet tab name (max 31 chars)
 * @param {Object[]} rows - Array of objects
 * @param {Object} [opts] - { title?, conditionalFormat?, skipFilter? }
 */
function addSheet(wb, name, rows, opts = {}) {
  const ws = wb.addWorksheet(name.slice(0, 31));

  if (!rows.length) {
    ws.addRow(["No data"]);
    return ws;
  }

  const headers = Object.keys(rows[0]);
  let headerRowNum = 1;

  // Optional title row
  if (opts.title) {
    headerRowNum = addTitleRow(ws, opts.title, headers.length);
  }

  // Header row
  const headerRow = ws.addRow(headers);
  applyHeaderStyle(headerRow);

  // Data rows
  const startDataRow = headerRowNum + 1;
  rows.forEach(r => {
    const values = headers.map(h => r[h] ?? "");
    ws.addRow(values);
  });
  const endDataRow = startDataRow + rows.length - 1;

  applyDataStyles(ws, startDataRow, endDataRow, headers.length);
  autoFitColumns(ws, rows, headers);

  if (!opts.skipFilter) {
    ws.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: headerRowNum, column: headers.length },
    };
  }

  // Freeze header row
  ws.views = [{ state: "frozen", ySplit: headerRowNum }];

  // Conditional formatting callback
  if (opts.conditionalFormat) {
    opts.conditionalFormat(ws, headers, startDataRow, endDataRow);
  }

  return ws;
}

/**
 * Export a multi-sheet Excel workbook with professional formatting.
 * @param {Object[]} sheets - Array of { name, rows, title?, conditionalFormat? }
 * @param {string} filename
 */
export async function exportXLSX(sheets, filename) {
  const ExcelJS = await getExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "TrailLog";
  wb.created = new Date();

  sheets.forEach(({ name, rows, title, conditionalFormat }) => {
    addSheet(wb, name, rows, { title, conditionalFormat });
  });

  await saveWorkbook(wb, filename);
}

/**
 * Export with summary sheet + detail sheets.
 * @param {Object} summary - { title, stats: [{ label, value }], rows? }
 * @param {Object[]} sheets - detail sheets
 * @param {string} filename
 */
export async function exportXLSXWithSummary(summary, sheets, filename) {
  const ExcelJS = await getExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "TrailLog";
  wb.created = new Date();

  // Summary sheet
  const ws = wb.addWorksheet("Summary");
  ws.addRow([summary.title]);
  ws.mergeCells(1, 1, 1, 3);
  ws.getCell(1, 1).font = { bold: true, size: 16, name: "Calibri", color: { argb: COLORS.headerBg } };
  ws.getRow(1).height = 28;

  // Generated date
  ws.addRow(["Generated", new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })]);
  ws.getCell(2, 1).font = { bold: true, size: 10, name: "Calibri", color: { argb: "888888" } };
  ws.getCell(2, 2).font = { size: 10, name: "Calibri", color: { argb: "888888" } };
  ws.addRow([]);

  // Stats
  if (summary.stats) {
    summary.stats.forEach(({ label, value, color }) => {
      const row = ws.addRow([label, value]);
      row.getCell(1).font = { bold: true, size: 11, name: "Calibri" };
      row.getCell(2).font = { bold: true, size: 12, name: "Calibri", color: { argb: color || COLORS.headerBg } };
      row.getCell(1).border = { bottom: { style: "thin", color: { argb: COLORS.borderColor } } };
      row.getCell(2).border = { bottom: { style: "thin", color: { argb: COLORS.borderColor } } };
    });
  }

  ws.getColumn(1).width = 25;
  ws.getColumn(2).width = 30;
  ws.getColumn(3).width = 20;

  // Summary table rows if provided
  if (summary.rows?.length) {
    ws.addRow([]);
    addSheet(wb, "Summary", []); // placeholder, will use existing ws
    // Actually add as a sub-table on the summary sheet
    const headers = Object.keys(summary.rows[0]);
    const hRow = ws.addRow(headers);
    applyHeaderStyle(hRow);
    summary.rows.forEach((r, idx) => {
      const vals = headers.map(h => r[h] ?? "");
      const dataRow = ws.addRow(vals);
      if (idx % 2 === 1) {
        dataRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.altRowBg } };
        });
      }
      dataRow.eachCell((cell) => {
        cell.font = { size: 10, name: "Calibri" };
        cell.border = { bottom: { style: "thin", color: { argb: COLORS.borderColor } } };
      });
    });
    autoFitColumns(ws, summary.rows, headers);
  }

  // Detail sheets
  sheets.forEach(({ name, rows, title, conditionalFormat }) => {
    addSheet(wb, name, rows, { title, conditionalFormat });
  });

  await saveWorkbook(wb, filename);
}

// ── Status-based cell coloring for gear exports ──
export function gearStatusFormat(ws, headers, startRow, endRow) {
  const statusCol = headers.indexOf("Status");
  if (statusCol < 0) return;
  for (let r = startRow; r <= endRow; r++) {
    const cell = ws.getCell(r, statusCol + 1);
    const val = String(cell.value).toLowerCase();
    if (val === "packed") {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.successBg } };
      cell.font = { size: 10, name: "Calibri", bold: true, color: { argb: COLORS.successFont } };
    } else if (val === "owned" || val === "own") {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.infoBg } };
      cell.font = { size: 10, name: "Calibri", color: { argb: COLORS.infoFont } };
    } else if (val === "needed" || val === "need") {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.warningBg } };
      cell.font = { size: 10, name: "Calibri", color: { argb: COLORS.warningFont } };
    } else if (val === "unchecked" || val === "—") {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.dangerBg } };
      cell.font = { size: 10, name: "Calibri", color: { argb: COLORS.dangerFont } };
    }
  }
}

// ── Gear matrix cell coloring (status values as cell content) ──
export function gearMatrixFormat(ws, headers, startRow, endRow) {
  // Skip Name and Participation columns (first 2)
  for (let c = 3; c <= headers.length; c++) {
    for (let r = startRow; r <= endRow; r++) {
      const cell = ws.getCell(r, c);
      const val = String(cell.value).toLowerCase();
      if (val === "packed") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.successBg } };
        cell.font = { size: 10, name: "Calibri", bold: true, color: { argb: COLORS.successFont } };
      } else if (val === "owned") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.infoBg } };
        cell.font = { size: 10, name: "Calibri", color: { argb: COLORS.infoFont } };
      } else if (val === "needed") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.warningBg } };
        cell.font = { size: 10, name: "Calibri", color: { argb: COLORS.warningFont } };
      } else if (val === "—") {
        cell.font = { size: 10, name: "Calibri", color: { argb: "CCCCCC" } };
      }
    }
  }
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
