interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** Persona que me debe (o me debía) dinero. */
export interface Debtor extends Entity {
  name: string;
  /** Si tiene valor, la persona está borrada (oculta). */
  archivedAt?: string | null;
}

/**
 * Movimiento con una persona:
 *  - 'debt'    → me debe más (le presto, pago algo por ella…)
 *  - 'payment' → me devuelve dinero
 * Las cantidades se guardan en **céntimos enteros** para evitar errores de redondeo.
 */
export interface Movement extends Entity {
  debtorId: string;
  type: 'debt' | 'payment';
  amountCents: number;
  /** Concepto opcional ("Cena", "Entradas concierto"…). */
  note: string;
  /** Día local YYYY-MM-DD. */
  date: string;
}

export interface MovementInput {
  type: Movement['type'];
  amountCents: number;
  note: string;
  date: string;
}

/** Persona con lo que me debe ahora mismo (positivo = me debe; negativo = le debo yo). */
export interface DebtorSummary {
  debtor: Debtor;
  balanceCents: number;
  lastDate: string | null;
}

export interface DeudasExport {
  debtors: Debtor[];
  movements: Movement[];
}
