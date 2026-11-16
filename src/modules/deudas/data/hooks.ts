import { useLiveQuery } from 'dexie-react-hooks';
import { dexieDeudasRepository } from './dexieRepository';
import type { DeudasRepository } from './repository';

/**
 * Punto de entrada de datos para las pantallas del módulo Deudas.
 * Los hooks devuelven `undefined` mientras cargan.
 */
export const deudasRepo: DeudasRepository = dexieDeudasRepository;

export const useDebtorSummaries = () => useLiveQuery(() => deudasRepo.listSummaries(), []);

export const useDebtor = (id: string | undefined) =>
  useLiveQuery(async () => (id ? ((await deudasRepo.getDebtor(id)) ?? null) : null), [id]);

export const useMovements = (debtorId: string | undefined) =>
  useLiveQuery(() => (debtorId ? deudasRepo.listMovements(debtorId) : []), [debtorId]);
