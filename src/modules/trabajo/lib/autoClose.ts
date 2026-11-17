import type { Shift } from '../data/types';
import { scheduleFor } from './schedule';
import { combine } from './time';

/** A partir de esta hora del día de entrada, una entrada sin salida se cierra sola. */
export const AUTO_CLOSE_TIME = '22:00';

/**
 * Si olvidaste fichar la salida: hora de salida que hay que poner (ISO) o null si no toca.
 *
 * - Solo en días laborables (con jornada) y a partir de las 22:00 del día de entrada.
 * - La salida es la de tu horario de ese día (19:00 de lunes a jueves, 15:00 el viernes).
 * - Si entraste después de esa hora (turno de tarde/noche) no se toca: no sabemos cuándo saliste.
 *
 * Una PWA no puede ejecutarse con la app cerrada: se aplica en cuanto se abre la app
 * (o a las 22:00 si está abierta).
 */
export function autoCloseEnd(shift: Shift, now: Date = new Date()): string | null {
  if (shift.endAt !== null) return null;
  const schedule = scheduleFor(shift.date);
  if (!schedule.expectedMinutes) return null;
  if (now.getTime() < Date.parse(combine(shift.date, AUTO_CLOSE_TIME))) return null;
  const end = combine(shift.date, schedule.end);
  if (Date.parse(end) <= Date.parse(shift.startAt)) return null;
  return end;
}
