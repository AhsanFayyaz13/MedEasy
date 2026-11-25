/**
 * Download rows as a CSV file (opens in Excel / Google Sheets).
 * columns: [{ header, value: (row) => any }]
 */
export function downloadCsv(filename, columns, rows) {
  const cell = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    // Quote when needed, and neutralise spreadsheet formulas (CSV injection).
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = [columns.map((c) => cell(c.header)).join(','), ...rows.map((r) => columns.map((c) => cell(c.value(r))).join(','))];
  // BOM so Excel reads UTF-8 (e.g. names in Urdu) correctly.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
