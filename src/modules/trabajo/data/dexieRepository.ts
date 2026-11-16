import { db } from '@/core/db/db';
import { newId, nowIso } from '@/core/lib/ids';
import type { TrabajoRepository } from './repository';
import type { Shift } from './types';
import { dayOf } from '../lib/time';

const shifts = () => db.table<Shift, string>('trabajo_shifts');

const findOpen = () => shifts().filter((s) => s.endAt === null).first();

export const dexieTrabajoRepository: TrabajoRepository = {
  getOpenShift: () => findOpen(),

  async clockIn() {
    return db.transaction('rw', shifts(), async () => {
      if (await findOpen()) throw new Error('Ya has fichado la entrada. Ficha la salida primero.');
      const now = nowIso();
      const shift: Shift = { id: newId(), date: dayOf(now), startAt: now, endAt: null, note: '', createdAt: now, updatedAt: now };
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
    await db.transaction('rw', shifts(), async () => {
      await shifts().clear();
      await shifts().bulkAdd(data.shifts);
    });
  },
};
