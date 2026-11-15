/** Fecha local de hoy en formato YYYY-MM-DD. */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "lun, 15 nov 2026" */
export function formatDateLong(key: string): string {
  return parseDateKey(key).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "15 nov" */
export function formatDateShort(key: string): string {
  return parseDateKey(key).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/** 52.5 -> "52,5" ; 50 -> "50" */
export function formatKg(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '–';
  return n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

/** Acepta "52,5" o "52.5". Devuelve null si está vacío o no es número. */
export function parseDecimal(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
