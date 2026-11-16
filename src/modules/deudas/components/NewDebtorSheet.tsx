import { useEffect, useState } from 'react';
import { Sheet } from '@/core/components/Sheet';
import { Field } from '@/core/components/Field';
import { Button } from '@/core/components/Button';
import { parseMoneyToCents, todayKey } from '@/core/lib/format';
import type { MovementInput } from '../data/types';
import { MoneyField } from './MoneyField';

interface Props {
  open: boolean;
  onSubmit: (name: string, firstDebt?: MovementInput) => void | Promise<void>;
  onClose: () => void;
}

/** Alta de persona: nombre y, opcionalmente, lo que ya me debe. */
export function NewDebtorSheet({ open, onSubmit, onClose }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setAmount('');
      setNote('');
    }
  }, [open]);

  const cents = amount.trim() ? parseMoneyToCents(amount) : 0;
  const valid = name.trim().length > 0 && cents !== null;

  return (
    <Sheet open={open} title="Nueva persona" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          await onSubmit(
            name,
            cents ? { type: 'debt', amountCents: cents, note, date: todayKey() } : undefined,
          );
          onClose();
        }}
      >
        <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={40} />
        <MoneyField label="Me debe (opcional)" value={amount} onChange={setAmount} />
        {cents !== null && cents > 0 && (
          <Field
            label="Concepto (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="p. ej. Cena del viernes"
            maxLength={60}
          />
        )}
        {cents === null && <p className="text-sm text-danger">Escribe una cantidad válida, por ejemplo 12,50.</p>}
        <Button type="submit" size="lg" block disabled={!valid}>
          Añadir
        </Button>
      </form>
    </Sheet>
  );
}
