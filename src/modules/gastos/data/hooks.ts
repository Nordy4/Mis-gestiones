import { useLiveQuery } from 'dexie-react-hooks';
import { dexieGastosRepository } from './dexieRepository';
import type { GastosRepository } from './repository';

/**
 * Punto de entrada de datos para las pantallas del módulo Gastos fijos.
 * Los hooks devuelven `undefined` mientras cargan.
 */
export const gastosRepo: GastosRepository = dexieGastosRepository;

export const useExpenses = () => useLiveQuery(() => gastosRepo.listExpenses(), []);

export { getCalendarFeed, regenerateCalendarFeed, type FeedState } from './calendarFeed';
