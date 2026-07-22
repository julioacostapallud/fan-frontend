import { formatIsoDayLabel } from '../../shared/dates';

export function exportAnalyticsCsv(
  rows: Array<Record<string, string | number | null>>,
  filename: string,
) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | null) => {
    const s = v == null ? '' : String(v);
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(';')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function csvFilenameForDay(day: string): string {
  return `analisis-${formatIsoDayLabel(day).replace(/\//g, '-')}.csv`;
}
