import { todayKey } from '@/core/lib/format';
import type { Shift } from '../data/types';

/** Día local (YYYY-MM-DD) de una marca ISO. */
export const dayOf = (iso: string) => todayKey(new Date(iso));

/** "08:03" */
export const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

/** Fecha local + "HH:MM" → ISO. */
export function combine(date: string, hhmm: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, h, min).toISOString();
}

/**
 * Entrada y salida a partir de un día y dos horas. Si la salida es igual o anterior a la
 * entrada se entiende que es al día siguiente (turno que pasa de medianoche).
 */
export function buildRange(date: string, start: string, end: string | null) {
  const startAt = combine(date, start);
  if (!end) return { startAt, endAt: null };
  let endAt = combine(date, end);
  if (Date.parse(endAt) <= Date.parse(startAt)) endAt = new Date(Date.parse(endAt) + 86_400_000).toISOString();
  return { startAt, endAt };
}

/** Minutos entre entrada y salida, sin descontar nada (0 si está abierto). */
export const spanMinutes = (s: Pick<Shift, 'startAt' | 'endAt'>) =>
  s.endAt ? Math.max(0, Math.round((Date.parse(s.endAt) - Date.parse(s.startAt)) / 60000)) : 0;

/** Minutos trabajados de un tramo: de entrada a salida menos la comida (0 si está abierto). */
export const shiftMinutes = (s: Pick<Shift, 'startAt' | 'endAt'> & { breakMinutes?: number }) =>
  s.endAt ? Math.max(0, spanMinutes(s) - (s.breakMinutes ?? 0)) : 0;

export const totalMinutes = (list: Shift[]) => list.reduce((sum, s) => sum + shiftMinutes(s), 0);

/** 450 → "7 h 30 min" · 45 → "45 min" · 0 → "0 h" */
export function formatHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h && !m) return '0 h';
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** 450 → "7,5" (horas con un decimal, para el calendario) */
export const formatHoursShort = (minutes: number) =>
  (Math.round((minutes / 60) * 10) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 });

/** Lunes (YYYY-MM-DD) de la semana de una fecha. */
export function mondayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return todayKey(dt);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + days));
}
