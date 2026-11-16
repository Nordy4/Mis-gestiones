/**
 * Un tramo de trabajo: de la hora de entrada a la de salida.
 * Abierto (estoy trabajando) = `endAt === null`. Solo puede haber uno abierto.
 * No hay cronómetro: la duración se calcula siempre con las dos horas.
 */
export interface Shift {
  id: string;
  /** Día local de la entrada, YYYY-MM-DD (el día en el que cuenta en el calendario). */
  date: string;
  startAt: string;
  endAt: string | null;
  /** Nota opcional ("Guardia", "Teletrabajo"…). */
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftInput {
  startAt: string;
  endAt: string | null;
  note: string;
}

export interface TrabajoExport {
  shifts: Shift[];
}
