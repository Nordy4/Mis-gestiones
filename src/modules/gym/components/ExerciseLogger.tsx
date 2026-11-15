import { useEffect, useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { Stepper } from '@/core/components/Stepper';
import { Button } from '@/core/components/Button';
import { useLastWeights } from '../data/hooks';
import { WEIGHT_STEP, type Exercise, type WorkoutSet } from '../data/types';
import { PersonDot, WeightBadges } from './PersonWeights';
import { SetsTable } from './SetsTable';

interface Props {
  exercise: Exercise;
  /** Series ya hechas de este ejercicio en el entreno actual. */
  sets: WorkoutSet[];
  expanded: boolean;
  onToggle: () => void;
  onAddSet: (weight: number | null, partnerWeight: number | null, reps: number) => Promise<void>;
  onDeleteSet: (id: string) => void;
}

/** Tarjeta de un ejercicio durante el entreno: series hechas + registro rápido de la siguiente. */
export function ExerciseLogger({ exercise, sets, expanded, onToggle, onAddSet, onDeleteSet }: Props) {
  const last = useLastWeights(exercise.id);
  const [weight, setWeight] = useState<number | null>(null);
  const [partnerWeight, setPartnerWeight] = useState<number | null>(null);
  const [reps, setReps] = useState<number | null>(exercise.targetReps);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  // Prerrelleno: última serie de hoy > últimos pesos usados > pesos iniciales.
  useEffect(() => {
    if (ready || last === undefined) return;
    const lastToday = sets.at(-1);
    setWeight(lastToday ? lastToday.weight : last.weight);
    setPartnerWeight(lastToday ? (lastToday.partnerWeight ?? null) : last.partnerWeight);
    setReps(lastToday ? lastToday.reps : exercise.targetReps);
    setReady(true);
  }, [ready, last, sets, exercise.targetReps]);

  const done = sets.length;
  const complete = done >= exercise.targetSets;

  return (
    <li className={`rounded-2xl border bg-surface ${expanded ? 'border-accent/60' : 'border-border/60'}`}>
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
          </span>
          {!expanded && last && (last.weight != null || last.partnerWeight != null) && (
            <span className="mt-1.5 block">
              <WeightBadges weight={last.weight} partnerWeight={last.partnerWeight} />
            </span>
          )}
        </span>
        <ChevronDown className={`size-5 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-4 px-4 pb-4">
          {sets.length > 0 && <SetsTable sets={sets} onDelete={onDeleteSet} />}

          <Stepper
            label={
              <span className="inline-flex items-center gap-1.5">
                <PersonDot person="me" /> Mi peso
              </span>
            }
            ariaLabel="Mi peso"
            value={weight}
            onChange={setWeight}
            step={WEIGHT_STEP}
            unit="kg"
            allowEmpty
            decimal
          />
          <Stepper
            label={
              <span className="inline-flex items-center gap-1.5">
                <PersonDot person="partner" /> Peso pareja
              </span>
            }
            ariaLabel="Peso pareja"
            value={partnerWeight}
            onChange={setPartnerWeight}
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
                await onAddSet(weight, partnerWeight, reps);
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
