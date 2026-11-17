import { todayKey } from '@/core/lib/format';
import type { Expense, Period } from '../data/types';

export const PERIOD_LABEL: Record<Period, string> = { monthly: 'Mensual', yearly: 'Anual' };

const daysInMonth = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();

/** Fecha (clave YYYY-MM-DD) del día `day` del mes, ajustada al último día si no existe (31 → 30/28). */
function clampedDate(y: number, m0: number, day: number): string {
  return todayKey(new Date(y, m0, Math.min(day, daysInMonth(y, m0))));
}

/** Próximo cargo a partir de hoy (incluido). Mismo criterio que el calendario de Google. */
export function nextCharge(e: Pick<Expense, 'period' | 'startDate'>, today = todayKey()): string {
  if (e.startDate >= today) return e.startDate;
  const [, sm, sd] = e.startDate.split('-').map(Number);
  const [ty, tm] = today.split('-').map(Number);
  if (e.period === 'monthly') {
    const thisMonth = clampedDate(ty, tm - 1, sd);
    return thisMonth >= today ? thisMonth : clampedDate(ty, tm, sd);
  }
  const thisYear = clampedDate(ty, sm - 1, sd);
  return thisYear >= today ? thisYear : clampedDate(ty + 1, sm - 1, sd);
}

/** Lo que cuesta al mes (un gasto anual se reparte en 12). */
export const monthlyCents = (e: Pick<Expense, 'period' | 'amountCents'>) =>
  e.period === 'monthly' ? e.amountCents : e.amountCents / 12;

/** Lo que cuesta al año (un gasto mensual × 12). */
export const yearlyCents = (e: Pick<Expense, 'period' | 'amountCents'>) =>
  e.period === 'monthly' ? e.amountCents * 12 : e.amountCents;

/** "día 5 de cada mes" · "cada 12 mar" */
export function scheduleLabel(e: Pick<Expense, 'period' | 'startDate'>): string {
  const [y, m, d] = e.startDate.split('-').map(Number);
  if (e.period === 'monthly') return `Día ${d} de cada mes`;
  return `Cada ${new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
}
