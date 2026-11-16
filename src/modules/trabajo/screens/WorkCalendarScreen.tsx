import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Plus } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button } from '@/core/components/Button';
import { ConfirmSheet } from '@/core/components/Sheet';
import { MonthCalendar, monthRange, type CalendarMonth } from '@/core/components/MonthCalendar';
import { formatDateLong, todayKey } from '@/core/lib/format';
import { trabajoRepo, useShifts } from '../data/hooks';
import type { Shift } from '../data/types';
import { ShiftList } from '../components/ShiftList';
import { ShiftSheet } from '../components/ShiftSheet';
import { TrabajoTabs } from '../components/TrabajoTabs';
import { formatHM, formatHoursShort, totalMinutes } from '../lib/time';

/** Calendario con las horas trabajadas cada día y el detalle del día elegido. */
export function WorkCalendarScreen() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('dia') ?? todayKey();
  const [y, m] = selected.split('-').map(Number);
  const [month, setMonth] = useState<CalendarMonth>({ year: y, month: m - 1 });
  const { from, to } = monthRange(month);
  const shifts = useShifts(from, to);
  // El día elegido puede ser de otro mes que el que se ve.
  const dayShifts = useShifts(selected, selected);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [deleting, setDeleting] = useState<Shift | null>(null);

  const minutesByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of shifts ?? []) map.set(s.date, (map.get(s.date) ?? 0) + totalMinutes([s]));
    return map;
  }, [shifts]);

  const daysWorked = [...minutesByDay.values()].filter((v) => v > 0).length;
  const monthMinutes = totalMinutes(shifts ?? []);

  return (
    <Screen title="Calendario" subtitle="Horas trabajadas" backTo="/" footer={<TrabajoTabs />}>
      <MonthCalendar
        month={month}
        onMonthChange={setMonth}
        selected={selected}
        onSelect={(day) => setParams({ dia: day }, { replace: true })}
        isMarked={(day) => (minutesByDay.get(day) ?? 0) > 0}
        renderDetail={(day) => {
          const min = minutesByDay.get(day) ?? 0;
          return min > 0 ? `${formatHoursShort(min)}h` : null;
        }}
        describeDay={(day) => {
          const min = minutesByDay.get(day) ?? 0;
          return min > 0 ? `${formatHM(min)} trabajadas` : undefined;
        }}
        footer={
          <>
            {formatHM(monthMinutes)} este mes · {daysWorked} día{daysWorked === 1 ? '' : 's'}
          </>
        }
      />

      <section className="mt-4">
        <div className="mb-1 flex items-center justify-between pl-1">
          <h2 className="text-sm font-semibold first-letter:uppercase">
            {formatDateLong(selected)}
            {dayShifts && dayShifts.length > 0 && (
              <span className="ml-2 font-normal text-muted">· {formatHM(totalMinutes(dayShifts))}</span>
            )}
          </h2>
          <Button variant="ghost" onClick={() => setAdding(true)} className="-mr-2 text-accent">
            <Plus className="size-4" /> Añadir
          </Button>
        </div>
        {dayShifts && dayShifts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
            Sin horas registradas este día.
          </p>
        ) : (
          dayShifts && <ShiftList shifts={dayShifts} onSelect={setEditing} />
        )}
      </section>

      <ShiftSheet
        open={adding}
        defaultDate={selected}
        onSubmit={(input) => trabajoRepo.addShift(input).then(() => undefined)}
        onClose={() => setAdding(false)}
      />
      <ShiftSheet
        open={editing !== null}
        shift={editing}
        onSubmit={(input) => trabajoRepo.updateShift(editing!.id, input)}
        onDelete={() => {
          setDeleting(editing);
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />
      <ConfirmSheet
        open={deleting !== null}
        title="¿Borrar este registro?"
        message="Se quitarán estas horas. No se puede deshacer."
        confirmLabel="Borrar"
        danger
        onConfirm={() => deleting && trabajoRepo.deleteShift(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </Screen>
  );
}
