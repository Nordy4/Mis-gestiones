import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet } from '@/core/components/Sheet';
import { Field } from '@/core/components/Field';
import { Button } from '@/core/components/Button';
import { todayKey } from '@/core/lib/format';
import type { Shift, ShiftInput } from '../data/types';
import { buildRange, dayOf, formatHM, shiftMinutes, timeOf } from '../lib/time';
import { BREAK_OPTIONS, scheduleFor } from '../lib/schedule';

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

const breakLabel = (m: number) => (m === 0 ? 'Sin comida' : formatHM(m));

/** Añadir horas a mano (con el horario del día ya puesto) o corregir un registro. */
export function ShiftSheet({ open, shift, defaultDate, onSubmit, onDelete, onClose }: Props) {
  const [date, setDate] = useState(todayKey());
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('');
  const [breakMin, setBreakMin] = useState(60);
  const [note, setNote] = useState('');
  // Al añadir: mientras no toques horas ni comida, cambiar el día aplica el horario de ese día.
  const [touched, setTouched] = useState(false);

  const applySchedule = (d: string) => {
    const sch = scheduleFor(d);
    setStart(sch.start);
    setEnd(sch.end);
    setBreakMin(sch.breakMinutes);
  };

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setNote(shift?.note ?? '');
    if (shift) {
      setDate(shift.date);
      setStart(timeOf(shift.startAt));
      setEnd(shift.endAt ? timeOf(shift.endAt) : '');
      setBreakMin(shift.breakMinutes ?? 0);
    } else {
      const d = defaultDate ?? todayKey();
      setDate(d);
      applySchedule(d);
    }
  }, [open, shift, defaultDate]);

  // Un registro abierto (fichado y sin salida) puede seguir sin salida; uno nuevo a mano, no.
  const isOpenShift = !!shift && shift.endAt === null;
  const validTimes = /^\d{2}:\d{2}$/.test(start) && (end === '' ? isOpenShift : /^\d{2}:\d{2}$/.test(end));
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && validTimes;

  const range = valid ? buildRange(date, start, end || null) : null;
  const minutes = range?.endAt ? shiftMinutes({ ...range, breakMinutes: breakMin }) : 0;
  const nextDay = range?.endAt && dayOf(range.endAt) !== date;

  const chip = (active: boolean) =>
    `h-10 flex-1 rounded-lg text-sm font-semibold ${active ? 'bg-surface text-text' : 'text-muted'}`;

  return (
    <Sheet open={open} title={shift ? 'Editar registro' : 'Añadir horas'} onClose={onClose}>
      <form
        className="max-h-[75vh] space-y-4 overflow-y-auto pb-1"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!range) return;
          await onSubmit({ ...range, breakMinutes: breakMin, note });
          onClose();
        }}
      >
        <Field
          label="Día"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            if (!shift && !touched && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) applySchedule(e.target.value);
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Entrada"
            type="time"
            value={start}
            onChange={(e) => {
              setTouched(true);
              setStart(e.target.value);
            }}
          />
          <Field
            label={isOpenShift ? 'Salida (vacía = dentro)' : 'Salida'}
            type="time"
            value={end}
            onChange={(e) => {
              setTouched(true);
              setEnd(e.target.value);
            }}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">Comida</span>
          <div className="flex gap-1 rounded-xl bg-bg p-1" role="radiogroup" aria-label="Tiempo de comida">
            {BREAK_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={breakMin === m}
                className={chip(breakMin === m)}
                onClick={() => {
                  setTouched(true);
                  setBreakMin(m);
                }}
              >
                {m === 0 ? 'No' : formatHM(m)}
              </button>
            ))}
          </div>
        </div>

        <Field
          label="Nota (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="p. ej. Teletrabajo, guardia…"
          maxLength={60}
        />

        <p className="rounded-xl bg-bg px-3 py-2 text-sm text-muted">
          {!valid ? (
            'Indica la hora de entrada y la de salida.'
          ) : range?.endAt ? (
            <>
              Total: <strong className="text-text">{formatHM(minutes)}</strong>
              {breakMin > 0 && <> (ya restada la comida: {breakLabel(breakMin)})</>}
              {nextDay && ' · sale al día siguiente'}
            </>
          ) : (
            'Sin salida: el registro sigue abierto.'
          )}
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
