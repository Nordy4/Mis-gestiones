import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button, IconButton } from '@/core/components/Button';
import { ConfirmSheet, Sheet } from '@/core/components/Sheet';
import { Field } from '@/core/components/Field';
import { EmptyState } from '@/core/components/EmptyState';
import { NotFoundScreen } from '@/core/components/NotFoundScreen';
import { formatDateShort, formatMoney } from '@/core/lib/format';
import { deudasRepo, useDebtor, useMovements } from '../data/hooks';
import type { Movement } from '../data/types';
import { MovementSheet } from '../components/MovementSheet';
import { deudasPaths } from '../paths';

function RenameSheet({ open, name, onSubmit, onClose }: { open: boolean; name: string; onSubmit: (n: string) => Promise<void>; onClose: () => void }) {
  const [value, setValue] = useState(name);
  useEffect(() => {
    if (open) setValue(name);
  }, [open, name]);
  return (
    <Sheet open={open} title="Cambiar nombre" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!value.trim()) return;
          await onSubmit(value);
          onClose();
        }}
      >
        <Field label="Nombre" value={value} onChange={(e) => setValue(e.target.value)} autoFocus maxLength={40} />
        <Button type="submit" size="lg" block className="mt-5" disabled={!value.trim()}>
          Guardar
        </Button>
      </form>
    </Sheet>
  );
}

export function DebtorScreen() {
  const { debtorId } = useParams();
  const navigate = useNavigate();
  const debtor = useDebtor(debtorId);
  const movements = useMovements(debtorId);

  // undefined = cerrado; 'debt' / 'payment' = nuevo de ese tipo
  const [adding, setAdding] = useState<Movement['type'] | undefined>(undefined);
  const [editing, setEditing] = useState<Movement | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<Movement | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deletingDebtor, setDeletingDebtor] = useState(false);

  if (debtor === null || debtor?.archivedAt) return <NotFoundScreen />;
  if (!debtor || !movements) return null;

  const balance = movements.reduce((s, m) => s + (m.type === 'debt' ? m.amountCents : -m.amountCents), 0);

  return (
    <Screen
      title={debtor.name}
      subtitle={`${movements.length} movimiento${movements.length === 1 ? '' : 's'}`}
      backTo={deudasPaths.home}
      actions={
        <>
          <IconButton label="Cambiar nombre" onClick={() => setRenaming(true)}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton label="Borrar persona" onClick={() => setDeletingDebtor(true)}>
            <Trash2 className="size-4" />
          </IconButton>
        </>
      }
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" variant="secondary" onClick={() => setAdding('debt')}>
            <Plus className="size-5" /> Me debe
          </Button>
          <Button size="lg" onClick={() => setAdding('payment')} disabled={movements.length === 0}>
            <ArrowDownLeft className="size-5" /> Me paga
          </Button>
        </div>
      }
    >
      <section className="mb-4 rounded-2xl border border-border/60 bg-surface p-4 text-center">
        <p className="text-sm text-muted">{balance < 0 ? 'Le debes tú' : balance > 0 ? 'Te debe' : 'Está saldado'}</p>
        <p
          className={`mt-1 text-4xl font-bold tabular-nums ${balance > 0 ? 'text-amber-300' : balance < 0 ? 'text-danger' : 'text-muted'}`}
        >
          {formatMoney(Math.abs(balance))}
        </p>
      </section>

      {movements.length === 0 ? (
        <EmptyState icon={ReceiptText} title="Sin movimientos">
          Usa «Me debe» para apuntar lo que te debe.
        </EmptyState>
      ) : (
        <>
          <h2 className="mb-1 pl-1 text-sm font-semibold tracking-wide text-muted uppercase">Historial</h2>
          <ul className="divide-y divide-border/60 border-b border-border/60">
            {movements.map((m) => {
              const isDebt = m.type === 'debt';
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(m)}
                    className="flex w-full items-center gap-3 py-3 text-left active:opacity-70"
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-full ${
                        isDebt ? 'bg-amber-400/15 text-amber-300' : 'bg-accent/15 text-accent'
                      }`}
                    >
                      {isDebt ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{m.note || (isDebt ? 'Me debe' : 'Me paga')}</span>
                      <span className="block text-sm text-muted">
                        {isDebt ? 'Deuda' : 'Pago'} · {formatDateShort(m.date)}
                      </span>
                    </span>
                    <span className={`font-semibold tabular-nums ${isDebt ? 'text-amber-300' : 'text-accent'}`}>
                      {isDebt ? '+' : '−'}
                      {formatMoney(m.amountCents)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <MovementSheet
        open={adding !== undefined}
        type={adding ?? 'debt'}
        personName={debtor.name}
        onSubmit={(input) => deudasRepo.addMovement(debtor.id, input).then(() => undefined)}
        onClose={() => setAdding(undefined)}
      />
      <MovementSheet
        open={editing !== null}
        type={editing?.type ?? 'debt'}
        movement={editing}
        personName={debtor.name}
        onSubmit={(input) => deudasRepo.updateMovement(editing!.id, input)}
        onDelete={() => {
          setDeletingMovement(editing);
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />
      <ConfirmSheet
        open={deletingMovement !== null}
        title="¿Borrar este movimiento?"
        message={deletingMovement && `${deletingMovement.note || (deletingMovement.type === 'debt' ? 'Deuda' : 'Pago')} de ${formatMoney(deletingMovement.amountCents)}. No se puede deshacer.`}
        confirmLabel="Borrar"
        danger
        onConfirm={() => deletingMovement && deudasRepo.deleteMovement(deletingMovement.id)}
        onClose={() => setDeletingMovement(null)}
      />
      <RenameSheet
        open={renaming}
        name={debtor.name}
        onSubmit={(n) => deudasRepo.renameDebtor(debtor.id, n)}
        onClose={() => setRenaming(false)}
      />
      <ConfirmSheet
        open={deletingDebtor}
        title={`¿Borrar a ${debtor.name}?`}
        message={
          balance !== 0
            ? `Todavía hay ${formatMoney(Math.abs(balance))} pendientes. Desaparecerá de la lista (sus movimientos se conservan en la copia de seguridad).`
            : 'Desaparecerá de la lista. Sus movimientos se conservan en la copia de seguridad.'
        }
        confirmLabel="Borrar"
        danger
        onConfirm={async () => {
          await deudasRepo.archiveDebtor(debtor.id);
          navigate(deudasPaths.home, { replace: true });
        }}
        onClose={() => setDeletingDebtor(false)}
      />
    </Screen>
  );
}
