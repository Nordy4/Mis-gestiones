import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Flag, Pause, Play, Trash2 } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button } from '@/core/components/Button';
import { ConfirmSheet } from '@/core/components/Sheet';
import { NotFoundScreen } from '@/core/components/NotFoundScreen';
import { formatDateLong } from '@/core/lib/format';
import { useNow } from '@/core/lib/useNow';
import { gymRepo, useActiveWorkout, useRoutine } from '../data/hooks';
import { elapsedSeconds, formatClock, formatDuration } from '../lib/timer';
import { gymPaths } from '../paths';

/** Cronómetro del entrenamiento. El tiempo se guarda en la BD: sigue contando aunque cierres la app. */
export function TimerScreen() {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const routine = useRoutine(routineId);
  const active = useActiveWorkout();
  const running = !!active && active.routineId === routineId && !active.pausedAt;
  const now = useNow(running, 250);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (routine === null || routine?.archivedAt) return <NotFoundScreen />;
  if (!routine || active === undefined) return null;

  const workout = active && active.routineId === routine.id ? active : null;
  const otherActive = active && active.routineId !== routine.id;
  const seconds = workout ? elapsedSeconds(workout, now) : 0;
  const paused = !!workout?.pausedAt;

  const start = async () => {
    setError(null);
    try {
      await gymRepo.startWorkout(routine.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const finish = async () => {
    if (!workout) return;
    const done = await gymRepo.finishWorkout(workout.id);
    navigate(gymPaths.calendar(done.date), { replace: true });
  };

  return (
    <Screen
      title={routine.name}
      subtitle={workout ? `Empezado ${formatDateLong(workout.date)}` : 'Entrenamiento'}
      backTo={gymPaths.routine(routine.id)}
      footer={
        workout ? (
          <Button size="lg" block onClick={() => setConfirmFinish(true)}>
            <Flag className="size-5" /> Terminar entrenamiento
          </Button>
        ) : (
          <Button size="lg" block onClick={start} disabled={!!otherActive}>
            <Play className="size-5" /> Empezar entrenamiento
          </Button>
        )
      }
    >
      <div className="flex min-h-full flex-col items-center justify-center py-8 text-center">
        <p className={`mb-2 text-sm font-medium ${paused ? 'text-amber-300' : workout ? 'text-accent' : 'text-muted'}`}>
          {paused ? 'En pausa' : workout ? 'Entrenando' : 'Listo para empezar'}
        </p>
        <div
          role="timer"
          aria-live="off"
          className={`text-7xl font-bold tracking-tight tabular-nums ${paused ? 'text-muted' : ''}`}
        >
          {formatClock(seconds)}
        </div>

        {workout && (
          <div className="mt-10 flex w-full max-w-xs gap-3">
            <Button
              size="lg"
              variant="secondary"
              block
              onClick={() => (paused ? gymRepo.resumeWorkout(workout.id) : gymRepo.pauseWorkout(workout.id))}
            >
              {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
              {paused ? 'Reanudar' : 'Pausar'}
            </Button>
            <Button size="lg" variant="danger" onClick={() => setConfirmDiscard(true)} aria-label="Descartar entrenamiento">
              <Trash2 className="size-5" />
            </Button>
          </div>
        )}

        {otherActive && (
          <p className="mt-8 text-sm text-muted">
            Ya tienes otro entrenamiento en curso. Termínalo antes de empezar este.
          </p>
        )}
        {error && <p className="mt-6 text-sm text-danger">{error}</p>}
        {workout && (
          <p className="mt-10 max-w-xs text-xs text-muted">
            Puedes salir o bloquear el móvil: el tiempo sigue contando. Vuelve a la rutina para ver o cambiar los pesos.
          </p>
        )}
      </div>

      <ConfirmSheet
        open={confirmFinish}
        title="¿Terminar el entrenamiento?"
        message={`Se guardará en el calendario con una duración de ${formatDuration(seconds)}.`}
        confirmLabel="Terminar"
        onConfirm={finish}
        onClose={() => setConfirmFinish(false)}
      />
      <ConfirmSheet
        open={confirmDiscard}
        title="¿Descartar el entrenamiento?"
        message="Se borra sin guardarse en el calendario."
        confirmLabel="Descartar"
        danger
        onConfirm={async () => {
          if (workout) await gymRepo.deleteWorkout(workout.id);
          navigate(gymPaths.routine(routine.id), { replace: true });
        }}
        onClose={() => setConfirmDiscard(false)}
      />
    </Screen>
  );
}
