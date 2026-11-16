import { db } from '@/core/db/db';
import { newId, nowIso } from '@/core/lib/ids';
import type { DeudasRepository } from './repository';
import type { Debtor, DebtorSummary, Movement } from './types';

const debtors = () => db.table<Debtor, string>('deudas_debtors');
const movements = () => db.table<Movement, string>('deudas_movements');

const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ');
const signed = (m: Movement) => (m.type === 'debt' ? m.amountCents : -m.amountCents);

/** Más reciente primero: por día y, a igual día, por momento de creación. */
const newestFirst = (a: Movement, b: Movement) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

export const dexieDeudasRepository: DeudasRepository = {
  async listSummaries() {
    const [people, moves] = await Promise.all([debtors().toArray(), movements().toArray()]);
    const balance = new Map<string, number>();
    const last = new Map<string, string>();
    for (const m of moves) {
      balance.set(m.debtorId, (balance.get(m.debtorId) ?? 0) + signed(m));
      if (!last.has(m.debtorId) || m.date > last.get(m.debtorId)!) last.set(m.debtorId, m.date);
    }
    const list: DebtorSummary[] = people
      .filter((p) => !p.archivedAt)
      .map((p) => ({ debtor: p, balanceCents: balance.get(p.id) ?? 0, lastDate: last.get(p.id) ?? null }));
    return list.sort(
      (a, b) => b.balanceCents - a.balanceCents || a.debtor.name.localeCompare(b.debtor.name, 'es'),
    );
  },

  getDebtor: (id) => debtors().get(id),

  async createDebtor(name, firstDebt) {
    const now = nowIso();
    const debtor: Debtor = { id: newId(), name: cleanName(name), createdAt: now, updatedAt: now, archivedAt: null };
    await db.transaction('rw', debtors(), movements(), async () => {
      await debtors().add(debtor);
      if (firstDebt && firstDebt.amountCents > 0) {
        await movements().add({ id: newId(), debtorId: debtor.id, ...firstDebt, createdAt: now, updatedAt: now });
      }
    });
    return debtor;
  },

  async renameDebtor(id, name) {
    await debtors().update(id, { name: cleanName(name), updatedAt: nowIso() });
  },

  async archiveDebtor(id) {
    const now = nowIso();
    await debtors().update(id, { archivedAt: now, updatedAt: now });
  },

  async listMovements(debtorId) {
    const list = await movements().where('debtorId').equals(debtorId).toArray();
    return list.sort(newestFirst);
  },

  async addMovement(debtorId, input) {
    const now = nowIso();
    const m: Movement = { id: newId(), debtorId, ...input, note: input.note.trim(), createdAt: now, updatedAt: now };
    await movements().add(m);
    return m;
  },

  async updateMovement(id, input) {
    await movements().update(id, { ...input, note: input.note.trim(), updatedAt: nowIso() });
  },

  async deleteMovement(id) {
    await movements().delete(id);
  },

  async exportAll() {
    const [d, m] = await Promise.all([debtors().toArray(), movements().toArray()]);
    return { debtors: d, movements: m };
  },

  async importAll(data) {
    await db.transaction('rw', debtors(), movements(), async () => {
      await debtors().clear();
      await movements().clear();
      await debtors().bulkAdd(data.debtors);
      await movements().bulkAdd(data.movements);
    });
  },
};
