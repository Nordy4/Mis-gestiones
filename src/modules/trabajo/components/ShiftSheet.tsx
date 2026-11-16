import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet } from '@/core/components/Sheet';
import { Field } from '@/core/components/Field';
import { Button } from '@/core/components/Button';
import { todayKey } from '@/core/lib/format';
import type { Shift, ShiftInput } from '../data/types';
import { buildRange, dayOf, formatHM, shiftMinutes, timeOf } from '../lib/time';

interface Props {
  open: boolean;
  /** Si se pasa, edita ese registro; si no, añade horas a mano. */
  shift?: Shift | null;
  /** Día preseleccionado al añadir. */
  defaultDate?: string;
  onSubmit: (input: ShiftInput) => void | Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

/** Añadir horas a mano o corregir la entrada/salida de un registro. */
export function ShiftSheet({ open, shift, defaultDate, onSubmit, onDelete, onClose }: Props) {
  const [date, setDate] = useState(todayKey());
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setDate(shift ? shift.date : (defaultDate ?? todayKey()));
    setStart(shift ? timeOf(shift.startAt) : '09:00');
    setEnd(shift ? (shift.endAt ? timeOf(shift.endAt) : '') : '17:00');
    setNote(shift?.note ?? '');
  }, [open, shift, defaultDate]);

  // Un registro abierto (fichado y sin salida) puede seguir sin salida; uno nuevo a mano, no.
  const isOpenShift = !!shift && shift.endAt === null;
  const endRequired = !isOpenShift;
  const validTimes = /^\d{2}:\d{2}$/.test(start) && (end === '' ? !endRequired : /^\d{2}:\d{2}$/.test(end));
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && validTimes;

  const range = valid ? buildRange(date, start, end || null) : null;
  const minutes = range?.endAt ? shiftMinutes(range) : 0;
  const nextDay = range?.endAt && dayOf(range.endAt) !== date;

  return (
    <Sheet open={open} title={shift ? 'Editar registro' : 'Añadir horas'} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!range) return;
          await onSubmit({ ...range, note });
          onClose();
        }}
      >
        <Field label="Día" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entrada" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <Field
            label={isOpenShift ? 'Salida (vacía = sigues dentro)' : 'Salida'}
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <Field
          label="Nota (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="p. ej. Teletrabajo, guardia…"
          maxLength={60}
        />

        <p className="rounded-xl bg-bg px-3 py-2 text-sm text-muted">
          {!valid
            ? 'Indica la hora de entrada y la de salida.'
            : range?.endAt
              ? <>Total: <strong className="text-text">{formatHM(minutes)}</strong>{nextDay && ' (sale al día siguiente)'}</>
              : 'Sin salida: el registro sigue abierto.'}
        </p>

        <div className="flex gap-3 pt-1">
          {shift && onDelete && (
            <Button variant="danger" size="lg" onClick={onDelete} aria-label="Borrar registro">
              <Trash2 className="size-5" />
            </Button>
          )}
          <Button type="submit" size="lg" block disabled={!valid}>
            {shift ? 'Guardar' : 'Añadir'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
