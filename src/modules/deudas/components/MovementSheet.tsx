import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet } from '@/core/components/Sheet';
import { Field } from '@/core/components/Field';
import { Button } from '@/core/components/Button';
import { formatKg, parseMoneyToCents, todayKey } from '@/core/lib/format';
import type { Movement, MovementInput } from '../data/types';
import { MoneyField } from '@/core/components/MoneyField';

interface Props {
  open: boolean;
  /** Tipo al crear. Al editar se toma del movimiento. */
  type: Movement['type'];
  /** Si se pasa, edita ese movimiento. */
  movement?: Movement | null;
  personName: string;
  onSubmit: (input: MovementInput) => void | Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

const centsToText = (c: number) => formatKg(c / 100);

/** Añadir o editar una deuda ("me debe más") o un pago ("me devuelve"). */
export function MovementSheet({ open, type, movement, personName, onSubmit, onDelete, onClose }: Props) {
  const [kind, setKind] = useState<Movement['type']>(type);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayKey());

  useEffect(() => {
    if (!open) return;
    setKind(movement?.type ?? type);
    setAmount(movement ? centsToText(movement.amountCents) : '');
    setNote(movement?.note ?? '');
    setDate(movement?.date ?? todayKey());
  }, [open, movement, type]);

  const cents = parseMoneyToCents(amount);
  const valid = cents !== null && cents > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const tab = (t: Movement['type'], label: string) => (
    <button
      type="button"
      onClick={() => setKind(t)}
      className={`h-10 flex-1 rounded-lg text-sm font-semibold ${kind === t ? 'bg-surface text-text' : 'text-muted'}`}
    >
      {label}
    </button>
  );

  return (
    <Sheet
      open={open}
      title={movement ? 'Editar movimiento' : kind === 'debt' ? `${personName} me debe más` : `${personName} me paga`}
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          await onSubmit({ type: kind, amountCents: cents!, note, date });
          onClose();
        }}
      >
        <div className="flex gap-1 rounded-xl bg-bg p-1">
          {tab('debt', 'Me debe')}
          {tab('payment', 'Me paga')}
        </div>
        <MoneyField label="Cantidad" value={amount} onChange={setAmount} autoFocus={!movement} />
        <Field
          label="Concepto (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={kind === 'debt' ? 'p. ej. Entradas del concierto' : 'p. ej. Bizum'}
          maxLength={60}
        />
        <Field label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="flex gap-3 pt-1">
          {movement && onDelete && (
            <Button variant="danger" size="lg" onClick={onDelete} aria-label="Borrar movimiento">
              <Trash2 className="size-5" />
            </Button>
          )}
          <Button type="submit" size="lg" block disabled={!valid}>
            {movement ? 'Guardar' : kind === 'debt' ? 'Añadir deuda' : 'Registrar pago'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
