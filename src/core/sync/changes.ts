import type { DBCore, DBCoreTable, Middleware } from 'dexie';

/**
 * Middleware de Dexie que avisa cuando cambia una tabla de un módulo (cualquier
 * escritura: put, add, delete, bulk...). Las tablas `core_*` no se sincronizan.
 * Mientras se aplican cambios bajados de la nube no avisa (no hay nada que subir).
 */
let applyingRemote = 0;
const listeners = new Set<() => void>();

export function onLocalChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function whileApplyingRemote<T>(fn: () => Promise<T>): Promise<T> {
  applyingRemote++;
  try {
    return await fn();
  } finally {
    applyingRemote--;
  }
}

export const changeNotifier: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'sync-changes',
  create(down) {
    return {
      ...down,
      table(name: string): DBCoreTable {
        const table = down.table(name);
        if (name.startsWith('core_')) return table;
        return {
          ...table,
          mutate: (req) =>
            table.mutate(req).then((res) => {
              if (!applyingRemote) for (const fn of listeners) fn();
              return res;
            }),
        };
      },
    };
  },
};
