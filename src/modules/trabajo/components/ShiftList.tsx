import { ChevronRight } from 'lucide-react';
import type { Shift } from '../data/types';
import { dayOf, formatHM, shiftMinutes, timeOf } from '../lib/time';

interface Props {
  shifts: Shift[];
  onSelect: (s: Shift) => void;
}

/** Registros de un día: "08:03 – 16:30 · 8 h 27 min". Tocar uno lo edita. */
export function ShiftList({ shifts, onSelect }: Props) {
  return (
    <ul className="divide-y divide-border/60 border-y border-border/60">
      {shifts.map((s) => {
        const open = s.endAt === null;
        const nextDay = s.endAt && dayOf(s.endAt) !== s.date;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s)}
              className="flex w-full items-center gap-3 py-3 text-left active:opacity-70"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-lg leading-tight font-semibold tabular-nums">
                  {timeOf(s.startAt)} – {open ? <span className="text-accent">ahora</span> : timeOf(s.endAt!)}
                  {nextDay && <span className="ml-1 text-xs font-normal text-muted">(+1 día)</span>}
                </span>
                <span className="block truncate text-sm text-muted">{open ? 'Dentro' : s.note || 'Jornada'}</span>
              </span>
              <span className="font-semibold tabular-nums">{open ? '…' : formatHM(shiftMinutes(s))}</span>
              <ChevronRight className="size-4 text-muted" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
