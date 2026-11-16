import { useLiveQuery } from 'dexie-react-hooks';
import { dexieTrabajoRepository } from './dexieRepository';
import type { TrabajoRepository } from './repository';

/**
 * Punto de entrada de datos para las pantallas del módulo Trabajo.
 * Los hooks devuelven `undefined` mientras cargan.
 */
export const trabajoRepo: TrabajoRepository = dexieTrabajoRepository;

/** Tramo abierto (null si no estoy dentro). */
export const useOpenShift = () => useLiveQuery(async () => (await trabajoRepo.getOpenShift()) ?? null, []);

/** Tramos entre dos fechas YYYY-MM-DD (incluidas). */
export const useShifts = (from: string, to: string) =>
  useLiveQuery(() => trabajoRepo.listShifts(from, to), [from, to]);
