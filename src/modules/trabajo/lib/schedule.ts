/**
 * Horario habitual del usuario. Se usa para:
 *  - restar la comida al calcular las horas de cada día,
 *  - prerrellenar entrada/salida al añadir horas a mano.
 *
 * L–J: 9:00–19:00 con 1 h de comida (9 h efectivas).
 * V:   9:00–15:00 sin comida (6 h).
 * Fin de semana: no es día laborable; si se registra algo, sin comida.
 */
export interface DaySchedule {
  start: string;
  end: string;
  breakMinutes: number;
  /** Horas efectivas esperadas ese día (para comparar con lo trabajado). */
  expectedMinutes: number;
}

const WORKDAY: DaySchedule = { start: '09:00', end: '19:00', breakMinutes: 60, expectedMinutes: 9 * 60 };
const FRIDAY: DaySchedule = { start: '09:00', end: '15:00', breakMinutes: 0, expectedMinutes: 6 * 60 };
const WEEKEND: DaySchedule = { start: '09:00', end: '15:00', breakMinutes: 0, expectedMinutes: 0 };

/** Opciones de comida que se pueden elegir en un registro. */
export const BREAK_OPTIONS = [0, 30, 60, 90];

/** Horario de un día (YYYY-MM-DD). */
export function scheduleFor(date: string): DaySchedule {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).getDay(); // 0 = domingo
  if (weekday === 5) return FRIDAY;
  if (weekday === 0 || weekday === 6) return WEEKEND;
  return WORKDAY;
}

/** Horas esperadas en una semana completa (L–J 9 h + V 6 h = 42 h). */
export const WEEK_EXPECTED_MINUTES = 4 * WORKDAY.expectedMinutes + FRIDAY.expectedMinutes;
