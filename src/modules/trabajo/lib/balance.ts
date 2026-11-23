import type { Shift } from '../data/types';
import { scheduleFor } from './schedule';
import { formatHM, totalMinutes } from './time';

/**
 * Saldo de horas extra: por cada día con registros, horas trabajadas − horas de la jornada
 * (`scheduleFor`). Positivo = horas extra; negativo = horas que faltan.
 *
 * - Solo cuentan los días con algún registro: un día sin registros (vacaciones, festivo,
 *   baja o antes de usar la app) no resta.
 * - Un día con un tramo abierto (estás dentro, o se olvidó fichar la salida) aún no cuenta,
 *   para no restar la jornada entera a media mañana.
 * - Los días futuros no cuentan. En fin de semana la jornada es 0: todo suma.
 */
export function balanceMinutes(shifts: Shift[], today: string, from?: string): number {
  const byDay = new Map<string, Shift[]>();
  for (const s of shifts) {
    if (s.date > today || (from && s.date < from)) continue;
    const list = byDay.get(s.date);
    if (list) list.push(s);
    else byDay.set(s.date, [s]);
  }
  let total = 0;
  for (const [date, list] of byDay) {
    if (list.some((s) => s.endAt === null)) continue;
    total += totalMinutes(list) - scheduleFor(date).expectedMinutes;
  }
  return total;
}

/** Un día de horas extra = una jornada de L–J (9 h). */
export const BALANCE_DAY_MINUTES = 9 * 60;

/**
 * Saldo en días + horas (cada 9 h = 1 día):
 * 90 → "+1 h 30 min" · 600 → "+1 d 1 h" · 1080 → "+2 d" · −45 → "−45 min" · 0 → "0 h"
 */
export function formatBalance(minutes: number): string {
  if (minutes === 0) return '0 h';
  const abs = Math.abs(minutes);
  const days = Math.floor(abs / BALANCE_DAY_MINUTES);
  const rest = abs % BALANCE_DAY_MINUTES;
  const parts = [days ? `${days} d` : '', rest || !days ? formatHM(rest) : ''].filter(Boolean);
  return `${minutes > 0 ? '+' : '−'}${parts.join(' ')}`;
}
