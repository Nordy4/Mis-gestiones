import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronRight, HandCoins, UserPlus } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button } from '@/core/components/Button';
import { EmptyState } from '@/core/components/EmptyState';
import { formatDateShort, formatMoney } from '@/core/lib/format';
import { deudasRepo, useDebtorSummaries } from '../data/hooks';
import type { DebtorSummary } from '../data/types';
import { NewDebtorSheet } from '../components/NewDebtorSheet';
import { deudasPaths } from '../paths';

function DebtorRow({ s }: { s: DebtorSummary }) {
  const owesMe = s.balanceCents > 0;
  const iOwe = s.balanceCents < 0;
  return (
    <li>
      <Link
        to={deudasPaths.debtor(s.debtor.id)}
        className="flex items-center gap-3 py-3 active:opacity-70"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg leading-tight font-semibold">{s.debtor.name}</span>
          <span className="block text-sm text-muted">
            {iOwe ? 'Le debes tú' : owesMe ? 'Te debe' : 'Saldado'}
            {s.lastDate && <> · {formatDateShort(s.lastDate)}</>}
          </span>
        </span>
        <span
          className={`text-lg font-semibold tabular-nums ${owesMe ? 'text-amber-300' : iOwe ? 'text-danger' : 'text-muted'}`}
        >
          {formatMoney(Math.abs(s.balanceCents))}
        </span>
        <ChevronRight className="size-4 text-muted" />
      </Link>
    </li>
  );
}

export function DebtsScreen() {
  const navigate = useNavigate();
  const summaries = useDebtorSummaries();
  const [adding, setAdding] = useState(false);

  const pending = summaries?.filter((s) => s.balanceCents !== 0) ?? [];
  const settled = summaries?.filter((s) => s.balanceCents === 0) ?? [];
  const totalOwedToMe = pending.reduce((sum, s) => sum + Math.max(0, s.balanceCents), 0);

  return (
    <Screen
      title="Deudas"
      subtitle="Lo que te deben"
      backTo="/"
      footer={
        <Button size="lg" block onClick={() => setAdding(true)}>
          <UserPlus className="size-5" /> Añadir persona
        </Button>
      }
    >
      {summaries && (
        <section className="mb-4 rounded-2xl border border-border/60 bg-surface p-4 text-center">
          <p className="text-sm text-muted">En total te deben</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-amber-300">{formatMoney(totalOwedToMe)}</p>
          <p className="mt-1 text-xs text-muted">
            {pending.length} persona{pending.length === 1 ? '' : 's'} con deuda pendiente
          </p>
        </section>
      )}

      {summaries && summaries.length === 0 && (
        <EmptyState icon={HandCoins} title="Nadie te debe nada">
          Añade a la primera persona con el botón de abajo.
        </EmptyState>
      )}

      {pending.length > 0 && (
        <ul className="divide-y divide-border/60 border-b border-border/60">
          {pending.map((s) => (
            <DebtorRow key={s.debtor.id} s={s} />
          ))}
        </ul>
      )}

      {settled.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-1 pl-1 text-sm font-semibold tracking-wide text-muted uppercase">Saldadas</h2>
          <ul className="divide-y divide-border/60 border-b border-border/60 opacity-70">
            {settled.map((s) => (
              <DebtorRow key={s.debtor.id} s={s} />
            ))}
          </ul>
        </section>
      )}

      <NewDebtorSheet
        open={adding}
        onSubmit={async (name, firstDebt) => {
          const d = await deudasRepo.createDebtor(name, firstDebt);
          if (!firstDebt) navigate(deudasPaths.debtor(d.id));
        }}
        onClose={() => setAdding(false)}
      />
    </Screen>
  );
}
