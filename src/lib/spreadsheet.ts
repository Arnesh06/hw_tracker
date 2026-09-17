import "server-only";
import ExcelJS from "exceljs";
import Papa from "papaparse";

export type Row = Record<string, string | number | null | undefined>;

export function toCsv(headers: { key: string; header: string }[], rows: Row[]) {
  const data = rows.map((r) => headers.map((h) => sanitizeCell(r[h.key])));
  // BOM so Excel opens UTF-8 correctly.
  return "\uFEFF" + Papa.unparse({ fields: headers.map((h) => h.header), data });
}

export async function toXlsx(sheetName: string, headers: { key: string; header: string }[], rows: Row[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "HW-Track";
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName.slice(0, 31));
  ws.columns = headers.map((h) => ({ header: h.header, key: h.key, width: Math.min(40, Math.max(12, h.header.length + 4)) }));
  rows.forEach((r) => {
    const out: Record<string, string | number | null> = {};
    headers.forEach((h) => {
      const v = r[h.key];
      out[h.key] = typeof v === "number" ? v : v === undefined || v === null ? null : sanitizeCell(v);
    });
    ws.addRow(out);
  });
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E5A4A" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}

/** Neutralises spreadsheet formula injection (=, +, -, @ at the start). */
function sanitizeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const v = value as unknown as Record<string, unknown>;
    if ("result" in v) return cellToString(v.result as ExcelJS.CellValue);
    if ("richText" in v && Array.isArray(v.richText)) {
      return (v.richText as { text: string }[]).map((t) => t.text).join("");
    }
    if ("text" in v) return String(v.text ?? "");
    if ("error" in v) return "";
    return "";
  }
  return String(value);
}

/** Parses the first sheet of an .xlsx or a .csv into header-keyed rows. */
export async function parseSpreadsheet(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
    });
    return { headers: result.meta.fields ?? [], rows: result.data };
  }

  if (name.endsWith(".xlsx")) {
    const wb = new ExcelJS.Workbook();
    const buf = await file.arrayBuffer();
    await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
    const ws = wb.worksheets[0];
    if (!ws) return { headers: [], rows: [] };
    const headers: string[] = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = cellToString(cell.value).trim();
    });
    const rows: Record<string, string>[] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: Record<string, string> = {};
      let hasValue = false;
      headers.forEach((h, i) => {
        if (!h) return;
        const s = cellToString(row.getCell(i + 1).value).trim();
        if (s) hasValue = true;
        obj[h] = s;
      });
      if (hasValue) rows.push(obj);
    });
    return { headers: headers.filter(Boolean), rows };
  }

  throw new Error("Upload a .csv or .xlsx file.");
}
