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

/** 90 → "+1 h 30 min" · −45 → "−45 min" · 0 → "0 h" */
export function formatBalance(minutes: number): string {
  if (minutes === 0) return '0 h';
  return `${minutes > 0 ? '+' : '−'}${formatHM(Math.abs(minutes))}`;
}
