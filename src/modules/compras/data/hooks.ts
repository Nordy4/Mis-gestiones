import { useLiveQuery } from 'dexie-react-hooks';
import { dexieComprasRepository } from './dexieRepository';
import type { ComprasRepository } from './repository';

/**
 * Punto de entrada de datos para las pantallas del módulo Compras.
 * Los hooks devuelven `undefined` mientras cargan.
 */
export const comprasRepo: ComprasRepository = dexieComprasRepository;

export const useProducts = () => useLiveQuery(() => comprasRepo.listProducts(), []);
