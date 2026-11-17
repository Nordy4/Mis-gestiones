export type Period = 'monthly' | 'yearly';

/** Un gasto fijo (Spotify, seguro de la moto…). Se repite cada mes o cada año. */
export interface Expense {
  id: string;
  name: string;
  /** Importe de cada cargo, en céntimos. */
  amountCents: number;
  period: Period;
  /** Fecha del primer cargo (YYYY-MM-DD): fija el día del mes (o el día y mes del año). */
  startDate: string;
  note: string;
  /** Borrado: se archiva para no perder historial (y desaparece del calendario). */
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseInput {
  name: string;
  amountCents: number;
  period: Period;
  startDate: string;
  note: string;
}

export interface GastosExport {
  expenses: Expense[];
}
