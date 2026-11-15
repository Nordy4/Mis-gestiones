import { Link } from 'react-router';
import { ChevronRight, Pause, Timer } from 'lucide-react';
import { useNow } from '@/core/lib/useNow';
import { useActiveWorkout, useRoutine } from '../data/hooks';
import { elapsedSeconds, formatClock } from '../lib/timer';
import { gymPaths } from '../paths';

/** Aviso con el entrenamiento en curso y su tiempo; lleva al cronómetro. */
export function ActiveWorkoutBanner() {
  const active = useActiveWorkout();
  const routine = useRoutine(active?.routineId);
  const now = useNow(!!active && !active.pausedAt);
  if (!active) return null;
  const paused = !!active.pausedAt;
  return (
    <Link
      to={gymPaths.workout(active.routineId)}
      className="mb-4 flex items-center gap-3 rounded-2xl border border-accent/50 bg-accent/10 p-4 active:bg-accent/20"
    >
      {paused ? <Pause className="size-6 text-accent" /> : <Timer className="size-6 animate-pulse text-accent" />}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-accent">{paused ? 'En pausa' : 'Entrenando'}</span>
        <span className="block truncate font-semibold">{routine?.name ?? '…'}</span>
      </span>
      <span className="text-xl font-bold tabular-nums">{formatClock(elapsedSeconds(active, now))}</span>
      <ChevronRight className="size-5 text-muted" />
    </Link>
  );
}
