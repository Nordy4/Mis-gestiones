import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarSync, ChevronRight, Plus, Repeat } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button } from '@/core/components/Button';
import { EmptyState } from '@/core/components/EmptyState';
import { ConfirmSheet, Sheet } from '@/core/components/Sheet';
import { formatDateShort, formatMoney, todayKey } from '@/core/lib/format';
import { gastosRepo, useExpenses } from '../data/hooks';
import type { Expense } from '../data/types';
import { ExpenseSheet } from '../components/ExpenseSheet';
import { monthlyCents, nextCharge, PERIOD_LABEL, scheduleLabel, yearlyCents } from '../lib/period';
import { gastosPaths } from '../paths';

/** Lista de gastos fijos (por próximo cargo) con el coste al mes y al año. */
export function ExpensesScreen() {
  const expenses = useExpenses();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [showYear, setShowYear] = useState(false);

  const today = todayKey();
  const rows = (expenses ?? [])
    .map((e) => ({ e, next: nextCharge(e, today) }))
    .sort((a, b) => a.next.localeCompare(b.next) || a.e.name.localeCompare(b.e.name));
  const perMonth = Math.round(rows.reduce((sum, r) => sum + monthlyCents(r.e), 0));
  const yearly = rows
    .map(({ e }) => ({ e, cents: yearlyCents(e) }))
    .sort((a, b) => b.cents - a.cents || a.e.name.localeCompare(b.e.name));
  const perYear = yearly.reduce((sum, y) => sum + y.cents, 0);

  return (
    <Screen
      title="Gastos fijos"
      subtitle="Suscripciones y pagos periódicos"
      backTo="/"
      actions={
        <Link
          to={gastosPaths.calendar}
          aria-label="Google Calendar"
          className="grid size-11 place-items-center rounded-full text-muted active:bg-surface-2"
        >
          <CalendarSync className="size-5" />
        </Link>
      }
      footer={
        <Button size="lg" block onClick={() => setAdding(true)}>
          <Plus className="size-5" /> Añadir gasto
        </Button>
      }
    >
      {expenses && (
        <section className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-border/60 bg-surface p-3">
            <div className="text-xs text-muted">Al mes</div>
            <div className="mt-0.5 text-xl font-bold tabular-nums text-accent">{formatMoney(perMonth)}</div>
            <div className="text-xs text-muted">anuales repartidos</div>
          </div>
          <button
            type="button"
            onClick={() => setShowYear(true)}
            disabled={rows.length === 0}
            className="rounded-2xl border border-border/60 bg-surface p-3 text-left active:bg-surface-2"
          >
            <div className="flex items-center justify-between text-xs text-muted">
              Al año {rows.length > 0 && <ChevronRight className="size-4" />}
            </div>
            <div className="mt-0.5 text-xl font-bold tabular-nums">{formatMoney(perYear)}</div>
            <div className="text-xs text-muted">
              {rows.length > 0 ? 'Ver desglose' : '0 gastos'}
            </div>
          </button>
        </section>
      )}

      {expenses && expenses.length === 0 && (
        <EmptyState icon={Repeat} title="Sin gastos fijos">
          Añade Spotify, el seguro de la moto… y verás cuánto suman al mes y al año.
        </EmptyState>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-border/60 border-b border-border/60">
          {rows.map(({ e, next }) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setEditing(e)}
                className="flex w-full items-center gap-3 py-3 text-left active:opacity-70"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg leading-tight font-semibold">{e.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {PERIOD_LABEL[e.period]} · {scheduleLabel(e)}
                  </span>
                  <span className={`block text-xs ${next === today ? 'text-amber-300' : 'text-muted'}`}>
                    {next === today ? 'Se cobra hoy' : `Próximo: ${formatDateShort(next)}`}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{formatMoney(e.amountCents)}</span>
                  <span className="block text-xs text-muted">{e.period === 'monthly' ? '/mes' : '/año'}</span>
                </span>
                <ChevronRight className="size-4 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={showYear} title={`Al año · ${formatMoney(perYear)}`} onClose={() => setShowYear(false)}>
        <ul className="max-h-[60vh] divide-y divide-border/60 overflow-y-auto">
          {yearly.map(({ e, cents }) => (
            <li key={e.id} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{e.name}</span>
                <span className="block text-xs text-muted">
                  {e.period === 'monthly' ? `${formatMoney(e.amountCents)} × 12 meses` : 'Pago anual'}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-semibold tabular-nums">{formatMoney(cents)}</span>
                <span className="block text-xs text-muted tabular-nums">
                  {perYear ? Math.round((cents / perYear) * 100) : 0} %
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-1 flex items-center justify-between border-t border-border pt-3 pb-1 font-semibold">
          <span>Total</span>
          <span className="tabular-nums text-accent">{formatMoney(perYear)}</span>
        </div>
      </Sheet>

      <ExpenseSheet
        open={adding}
        onSubmit={(input) => gastosRepo.addExpense(input).then(() => undefined)}
        onClose={() => setAdding(false)}
      />
      <ExpenseSheet
        open={editing !== null}
        expense={editing}
        onSubmit={(input) => gastosRepo.updateExpense(editing!.id, input)}
        onDelete={() => {
          setDeleting(editing);
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />
      <ConfirmSheet
        open={deleting !== null}
        title="¿Borrar este gasto?"
        message={deleting && `${deleting.name} dejará de contar y desaparecerá de tu calendario.`}
        confirmLabel="Borrar"
        danger
        onConfirm={() => deleting && gastosRepo.archiveExpense(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </Screen>
  );
}
