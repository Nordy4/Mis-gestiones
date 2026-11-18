import { useLiveQuery } from 'dexie-react-hooks';
import { dexieRutasRepository } from './dexieRepository';
import type { RutasRepository } from './repository';

/**
 * Punto de entrada de datos para las pantallas del módulo Rutas.
 * Los hooks devuelven `undefined` mientras cargan.
 */
export const rutasRepo: RutasRepository = dexieRutasRepository;

export { generateAiRoute, type AiRouteResult } from './aiRoute';

export const useRoutes =() => useLiveQuery(() => rutasRepo.listRoutes(), []);
