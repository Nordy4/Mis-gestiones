import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet } from '@/core/components/Sheet';
import { Field } from '@/core/components/Field';
import { Button } from '@/core/components/Button';
import { MoneyField } from '@/core/components/MoneyField';
import { parseMoneyToCents, todayKey } from '@/core/lib/format';
import type { Expense, ExpenseInput, Period } from '../data/types';
import { PERIOD_LABEL } from '../lib/period';

interface Props {
  open: boolean;
  /** Si se pasa, edita ese gasto. */
  expense?: Expense | null;
  onSubmit: (input: ExpenseInput) => void | Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

const centsToInput = (c: number) => (c / 100).toFixed(2).replace('.', ',').replace(/,00$/, '');

/** Añadir o editar un gasto fijo. */
export function ExpenseSheet({ open, expense, onSubmit, onDelete, onClose }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<Period>('monthly');
  const [startDate, setStartDate] = useState(todayKey());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(expense?.name ?? '');
    setAmount(expense ? centsToInput(expense.amountCents) : '');
    setPeriod(expense?.period ?? 'monthly');
    setStartDate(expense?.startDate ?? todayKey());
    setNote(expense?.note ?? '');
  }, [open, expense]);

  const cents = parseMoneyToCents(amount);
  const valid = name.trim() !== '' && cents !== null && /^\d{4}-\d{2}-\d{2}$/.test(startDate);

  const chip = (active: boolean) =>
    `h-10 flex-1 rounded-lg text-sm font-semibold ${active ? 'bg-surface text-text' : 'text-muted'}`;

  return (
    <Sheet open={open} title={expense ? 'Editar gasto' : 'Nuevo gasto fijo'} onClose={onClose}>
      <form
        className="max-h-[75vh] space-y-4 overflow-y-auto pb-1"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          await onSubmit({ name, amountCents: cents!, period, startDate, note });
          onClose();
        }}
      >
        <Field
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="p. ej. Spotify, seguro de la moto"
          maxLength={60}
          autoFocus={!expense}
        />
        <MoneyField label="Importe de cada cargo" value={amount} onChange={setAmount} />

        <div>
          <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">Periodicidad</span>
          <div className="flex gap-1 rounded-xl bg-bg p-1" role="radiogroup" aria-label="Periodicidad">
            {(['monthly', 'yearly'] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={period === p}
                className={chip(period === p)}
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        <Field
          label={period === 'monthly' ? 'Fecha de un cargo (fija el día del mes)' : 'Fecha de un cargo (fija el día del año)'}
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Field
          label="Nota (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="p. ej. Cuenta familiar, póliza 1234"
          maxLength={120}
        />

        <div className="flex gap-3 pt-1">
          {expense && onDelete && (
            <Button variant="danger" size="lg" onClick={onDelete} aria-label="Borrar gasto">
              <Trash2 className="size-5" />
            </Button>
          )}
          <Button type="submit" size="lg" block disabled={!valid}>
            {expense ? 'Guardar' : 'Añadir gasto'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
