import { safeHttpUrl } from '@/core/lib/links';
import { rutasRepo } from './hooks';
import type { MotoRoute, RutasExport } from './types';

/** Comprobación mínima del formato antes de sustituir los datos. */
export function parseRutasExport(data: unknown): RutasExport {
  const list = (data as { routes?: unknown } | null)?.routes;
  if (!Array.isArray(list)) throw new Error('Copia de Rutas no válida: falta "routes"');
  for (const r of list) {
    const ok = r && typeof r === 'object' && typeof r.id === 'string' && typeof r.url === 'string';
    if (!ok) throw new Error('Copia de Rutas no válida: ruta incompleta');
  }
  return {
    routes: (list as MotoRoute[])
      // Fuera enlaces que no sean http(s) (p. ej. `javascript:` en una copia manipulada).
      .filter((r) => safeHttpUrl(r.url))
      .map((r) => ({ ...r, name: String(r.name ?? '').slice(0, 80) || 'Ruta', archivedAt: r.archivedAt ?? null })),
  };
}

export const rutasData = {
  exportData: () => rutasRepo.exportAll(),
  importData: (data: unknown) => rutasRepo.importAll(parseRutasExport(data)),
};
