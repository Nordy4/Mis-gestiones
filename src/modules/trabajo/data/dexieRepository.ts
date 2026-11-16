import type { Transaction } from 'dexie';
import { db } from '@/core/db/db';
import { newId, nowIso } from '@/core/lib/ids';
import type { TrabajoRepository } from './repository';
import type { Shift } from './types';
import { normalizeShifts } from './normalize';
import { dayOf } from '../lib/time';
import { scheduleFor } from '../lib/schedule';

const shifts = () => db.table<Shift, string>('trabajo_shifts');

const findOpen = () => shifts().filter((s) => s.endAt === null).first();

export const dexieTrabajoRepository: TrabajoRepository = {
  getOpenShift: () => findOpen(),

  async clockIn() {
    return db.transaction('rw', shifts(), async () => {
      if (await findOpen()) throw new Error('Ya has fichado la entrada. Ficha la salida primero.');
      const now = nowIso();
      const date = dayOf(now);
      // La comida se descuenta una vez al día: si ya hay otro tramo hoy (volví de comer), este va sin comida.
      const alreadyToday = (await shifts().where('date').equals(date).count()) > 0;
      const shift: Shift = {
        id: newId(),
        date,
        startAt: now,
        endAt: null,
        breakMinutes: alreadyToday ? 0 : scheduleFor(date).breakMinutes,
        note: '',
        createdAt: now,
        updatedAt: now,
      };
      await shifts().add(shift);
      return shift;
    });
  },

  async clockOut(id) {
    const now = nowIso();
    await shifts().update(id, { endAt: now, updatedAt: now });
  },

  async listShifts(from, to) {
    const list = await shifts().where('date').between(from, to, true, true).toArray();
    return list.sort((a, b) => a.startAt.localeCompare(b.startAt));
  },

  async addShift(input) {
    const now = nowIso();
    const shift: Shift = { id: newId(), date: dayOf(input.startAt), ...input, note: input.note.trim(), createdAt: now, updatedAt: now };
    await shifts().add(shift);
    return shift;
  },

  async updateShift(id, input) {
    await shifts().update(id, {
      ...input,
      date: dayOf(input.startAt),
      note: input.note.trim(),
      updatedAt: nowIso(),
    });
  },

  async deleteShift(id) {
    await shifts().delete(id);
  },

  async exportAll() {
    return { shifts: await shifts().toArray() };
  },

  async importAll(data) {
    const list = normalizeShifts(data.shifts);
    await db.transaction('rw', shifts(), async () => {
      await shifts().clear();
      await shifts().bulkAdd(list);
    });
  },
};

/** Migración de la BD (setup.ts la llama al subir DB_VERSION). Idempotente. */
export async function upgradeTrabajoData(tx: Transaction): Promise<void> {
  const table = tx.table('trabajo_shifts');
  const all = await table.toArray();
  if (all.every((s) => typeof s.breakMinutes === 'number')) return;
  await table.bulkPut(normalizeShifts(all));
}
