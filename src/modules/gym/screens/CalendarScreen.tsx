import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CalendarX2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { IconButton } from '@/core/components/Button';
import { ConfirmSheet } from '@/core/components/Sheet';
import { formatDateLong, todayKey } from '@/core/lib/format';
import { gymRepo, useRoutineNames, useWorkouts } from '../data/hooks';
import type { Workout } from '../data/types';
import { GymTabs } from '../components/GymTabs';
import { ActiveWorkoutBanner } from '../components/ActiveWorkoutBanner';
import { formatDuration } from '../lib/timer';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function CalendarScreen() {
  const [params, setParams] = useSearchParams();
  const today = todayKey();
  const selected = params.get('dia') ?? today;
  const [y0, m0] = selected.split('-').map(Number);
  const [month, setMonth] = useState({ year: y0, month: m0 - 1 });
  const [deleting, setDeleting] = useState<Workout | null>(null);

  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const firstWeekday = (new Date(month.year, month.month, 1).getDay() + 6) % 7; // lunes = 0
  const from = keyOf(month.year, month.month, 1);
  const to = keyOf(month.year, month.month, daysInMonth);

  const workouts = useWorkouts(from, to);
  const names = useRoutineNames();

  const byDay = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of workouts ?? []) map.set(w.date, [...(map.get(w.date) ?? []), w]);
    return map;
  }, [workouts]);

  const totalSeconds = (workouts ?? []).reduce((s, w) => s + (w.durationSeconds ?? 0), 0);
  const selectedWorkouts = byDay.get(selected) ?? [];
  const monthLabel = new Date(month.year, month.month, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const shiftMonth = (delta: number) =>
    setMonth(({ year, month: m }) => {
      const d = new Date(year, m + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const select = (day: string) => setParams({ dia: day }, { replace: true });

  return (
    <Screen title="Calendario" subtitle="Tus entrenamientos" backTo="/" footer={<GymTabs />}>
      <ActiveWorkoutBanner />

      <section className="rounded-2xl border border-border/60 bg-surface p-3">
        <div className="mb-2 flex items-center">
          <IconButton label="Mes anterior" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="size-5" />
          </IconButton>
          <h2 className="flex-1 text-center font-semibold first-letter:uppercase">{monthLabel}</h2>
          <IconButton label="Mes siguiente" onClick={() => shiftMonth(1)}>
            <ChevronRight className="size-5" />
          </IconButton>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1 text-xs font-medium text-muted">
              {d}
            </div>
          ))}
          {Array.from({ length: firstWeekday }, (_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = keyOf(month.year, month.month, i + 1);
            const trained = byDay.has(day);
            const isSelected = day === selected;
            const isToday = day === today;
            return (
              <button
                key={day}
                type="button"
                onClick={() => select(day)}
                aria-label={`${formatDateLong(day)}${trained ? ', entrenado' : ''}`}
                aria-pressed={isSelected}
                className={`relative grid aspect-square place-items-center rounded-xl text-sm tabular-nums ${
                  trained ? 'bg-accent font-bold text-black' : 'text-text active:bg-surface-2'
                } ${isSelected ? 'ring-2 ring-text ring-offset-2 ring-offset-surface' : ''} ${
                  isToday && !trained ? 'font-bold text-accent' : ''
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <p className="mt-3 border-t border-border/50 pt-3 text-center text-sm text-muted">
          {workouts?.length ?? 0} entrenamiento{workouts?.length === 1 ? '' : 's'} este mes
          {totalSeconds > 0 && <> · {formatDuration(totalSeconds)}</>}
        </p>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold first-letter:uppercase">{formatDateLong(selected)}</h2>
        {selectedWorkouts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
            <CalendarX2 className="size-5 shrink-0" /> No entrenaste este día.
          </div>
        ) : (
          <ul className="grid gap-2">
            {selectedWorkouts.map((w) => (
              <li key={w.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-4">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{names?.[w.routineId] ?? 'Rutina borrada'}</span>
                  <span className="block text-sm text-muted">Empezó a las {timeOf(w.startedAt)}</span>
                </span>
                <span className="text-lg font-bold tabular-nums">{formatDuration(w.durationSeconds)}</span>
                <IconButton label="Borrar registro" onClick={() => setDeleting(w)}>
                  <Trash2 className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmSheet
        open={deleting !== null}
        title="¿Borrar este entrenamiento?"
        message="Desaparecerá del calendario. No se puede deshacer."
        confirmLabel="Borrar"
        danger
        onConfirm={() => deleting && gymRepo.deleteWorkout(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </Screen>
  );
}
