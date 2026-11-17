import { comprasRepo } from './hooks';
import type { ComprasExport, Product } from './types';

/** Comprobación mínima del formato antes de sustituir los datos. */
export function parseComprasExport(data: unknown): ComprasExport {
  const list = (data as { products?: unknown } | null)?.products;
  if (!Array.isArray(list)) throw new Error('Copia de Compras no válida: falta "products"');
  for (const p of list) {
    const ok = p && typeof p === 'object' && typeof p.id === 'string' && typeof p.url === 'string';
    if (!ok) throw new Error('Copia de Compras no válida: producto incompleto');
  }
  return {
    products: (list as Product[]).map((p) => ({
      ...p,
      title: p.title ?? '',
      imageUrl: p.imageUrl ?? null,
      site: p.site ?? '',
    })),
  };
}

export const comprasData = {
  exportData: () => comprasRepo.exportAll(),
  importData: (data: unknown) => comprasRepo.importAll(parseComprasExport(data)),
};
