import { db } from '@/core/db/db';
import { newId, nowIso } from '@/core/lib/ids';
import type { GastosRepository } from './repository';
import type { Expense, ExpenseInput } from './types';

const expenses = () => db.table<Expense, string>('gastos_expenses');

const clean = (input: ExpenseInput): ExpenseInput => ({
  ...input,
  name: input.name.trim(),
  note: input.note.trim(),
  amountCents: Math.max(0, Math.round(input.amountCents)),
});

export const dexieGastosRepository: GastosRepository = {
  async listExpenses() {
    return expenses()
      .filter((e) => !e.archivedAt)
      .toArray();
  },

  async addExpense(input) {
    const now = nowIso();
    const expense: Expense = { id: newId(), ...clean(input), archivedAt: null, createdAt: now, updatedAt: now };
    await expenses().add(expense);
    return expense;
  },

  async updateExpense(id, input) {
    await expenses().update(id, { ...clean(input), updatedAt: nowIso() });
  },

  async archiveExpense(id) {
    const now = nowIso();
    await expenses().update(id, { archivedAt: now, updatedAt: now });
  },

  async exportAll() {
    return { expenses: await expenses().toArray() };
  },

  async importAll(data) {
    await db.transaction('rw', expenses(), async () => {
      await expenses().clear();
      await expenses().bulkAdd(data.expenses);
    });
  },
};
