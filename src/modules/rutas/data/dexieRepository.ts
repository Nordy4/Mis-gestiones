import { db } from '@/core/db/db';
import { newId, nowIso } from '@/core/lib/ids';
import { safeHttpUrl } from '@/core/lib/links';
import type { RutasRepository } from './repository';
import type { MotoRoute, MotoRouteInput } from './types';

const routes = () => db.table<MotoRoute, string>('rutas_routes');

/** Valida antes de guardar: nombre obligatorio y solo enlaces http(s). */
function clean(input: MotoRouteInput): MotoRouteInput {
  const url = safeHttpUrl(input.url);
  if (!url) throw new Error('El enlace debe empezar por http:// o https://');
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new Error('Ponle un nombre a la ruta');
  return { name, url };
}

export const dexieRutasRepository: RutasRepository = {
  async listRoutes() {
    const list = await routes()
      .filter((r) => !r.archivedAt)
      .toArray();
    return list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  },

  async addRoute(input) {
    const now = nowIso();
    const route: MotoRoute = { id: newId(), ...clean(input), archivedAt: null, createdAt: now, updatedAt: now };
    await routes().add(route);
    return route;
  },

  async updateRoute(id, input) {
    await routes().update(id, { ...clean(input), updatedAt: nowIso() });
  },

  async archiveRoute(id) {
    const now = nowIso();
    await routes().update(id, { archivedAt: now, updatedAt: now });
  },

  async exportAll() {
    return { routes: await routes().toArray() };
  },

  async importAll(data) {
    await db.transaction('rw', routes(), async () => {
      await routes().clear();
      await routes().bulkAdd(data.routes);
    });
  },
};
