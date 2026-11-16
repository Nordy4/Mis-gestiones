import type { Shift } from './types';
import { scheduleFor } from '../lib/schedule';

/**
 * Pone `breakMinutes` a los registros anteriores a la comida (v1 del módulo):
 * el primer tramo de cada día lleva la comida de su horario, el resto 0.
 * Idempotente: los registros que ya tienen el campo no se tocan.
 */
export function normalizeShifts(list: (Omit<Shift, 'breakMinutes'> & { breakMinutes?: number })[]): Shift[] {
  const sorted = [...list].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const dayHasBreak = new Set<string>();
  for (const s of sorted) if (typeof s.breakMinutes === 'number' && s.breakMinutes > 0) dayHasBreak.add(s.date);
  return sorted.map((s) => {
    if (typeof s.breakMinutes === 'number') return s as Shift;
    const first = !dayHasBreak.has(s.date);
    dayHasBreak.add(s.date);
    return { ...s, breakMinutes: first ? scheduleFor(s.date).breakMinutes : 0 };
  });
}
