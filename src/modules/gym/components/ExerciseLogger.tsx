import { useEffect, useState } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { Stepper } from '@/core/components/Stepper';
import { Button } from '@/core/components/Button';
import { formatKg } from '@/core/lib/format';
import { useLastWeight } from '../data/hooks';
import { WEIGHT_STEP, type Exercise, type WorkoutSet } from '../data/types';

interface Props {
  exercise: Exercise;
  /** Series ya hechas de este ejercicio en el entreno actual. */
  sets: WorkoutSet[];
  expanded: boolean;
  onToggle: () => void;
  onAddSet: (weight: number | null, reps: number) => Promise<void>;
  onDeleteSet: (id: string) => void;
}

/** Tarjeta de un ejercicio durante el entreno: series hechas + registro rápido de la siguiente. */
export function ExerciseLogger({ exercise, sets, expanded, onToggle, onAddSet, onDeleteSet }: Props) {
  const lastWeight = useLastWeight(exercise.id);
  const [weight, setWeight] = useState<number | null>(null);
  const [reps, setReps] = useState<number | null>(exercise.targetReps);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  // Prerrelleno: última serie de hoy > último peso usado > peso inicial.
  useEffect(() => {
    if (ready || lastWeight === undefined) return;
    const lastToday = sets.at(-1);
    setWeight(lastToday ? lastToday.weight : lastWeight);
    setReps(lastToday ? lastToday.reps : exercise.targetReps);
    setReady(true);
  }, [ready, lastWeight, sets, exercise.targetReps]);

  const done = sets.length;
  const complete = done >= exercise.targetSets;

  return (
    <li
      className={`rounded-2xl border bg-surface ${expanded ? 'border-accent/60' : 'border-border/60'}`}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
            complete ? 'bg-accent text-black' : 'bg-surface-2 text-muted'
          }`}
        >
          {complete ? <Check className="size-5" /> : `${done}/${exercise.targetSets}`}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{exercise.name}</span>
          <span className="block text-sm text-muted">
            Objetivo {exercise.targetSets}×{exercise.targetReps}
            {!expanded && lastWeight != null && <> · {formatKg(lastWeight)} kg</>}
          </span>
        </span>
        <ChevronDown className={`size-5 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-4 px-4 pb-4">
          {sets.length > 0 && (
            <ol className="flex flex-wrap gap-2">
              {sets.map((s, i) => (
                <li
                  key={s.id}
                  className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pr-1 pl-3 text-sm tabular-nums"
                >
                  <span className="text-muted">{i + 1}.</span>
                  <span className="font-semibold">
                    {s.weight === null ? '—' : `${formatKg(s.weight)} kg`} × {s.reps}
                  </span>
                  <button
                    type="button"
                    aria-label={`Borrar serie ${i + 1}`}
                    onClick={() => onDeleteSet(s.id)}
                    className="grid size-7 place-items-center rounded-full text-muted active:bg-border"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ol>
          )}

          <Stepper
            label="Peso"
            value={weight}
            onChange={setWeight}
            step={WEIGHT_STEP}
            unit="kg"
            allowEmpty
            decimal
          />
          <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={1} />

          <Button
            size="lg"
            block
            disabled={!reps || saving}
            onClick={async () => {
              if (!reps) return;
              setSaving(true);
              try {
                await onAddSet(weight, reps);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Plus className="size-5" /> Guardar serie {done + 1}
          </Button>
        </div>
      )}
    </li>
  );
}
