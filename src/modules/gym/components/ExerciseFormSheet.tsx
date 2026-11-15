import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet } from '@/core/components/Sheet';
import { Field } from '@/core/components/Field';
import { Button } from '@/core/components/Button';
import { Stepper } from '@/core/components/Stepper';
import { DEFAULT_REPS, DEFAULT_SETS, WEIGHT_STEP, type Exercise, type ExerciseInput } from '../data/types';

interface Props {
  open: boolean;
  /** Si se pasa, el formulario edita ese ejercicio; si no, crea uno nuevo. */
  exercise?: Exercise | null;
  onSubmit: (input: ExerciseInput) => void | Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

export function ExerciseFormSheet({ open, exercise, onSubmit, onDelete, onClose }: Props) {
  const [name, setName] = useState('');
  const [sets, setSets] = useState<number | null>(DEFAULT_SETS);
  const [reps, setReps] = useState<number | null>(DEFAULT_REPS);
  const [weight, setWeight] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(exercise?.name ?? '');
    setSets(exercise?.targetSets ?? DEFAULT_SETS);
    setReps(exercise?.targetReps ?? DEFAULT_REPS);
    setWeight(exercise?.initialWeight ?? null);
  }, [open, exercise]);

  const valid = name.trim().length > 0 && (sets ?? 0) > 0 && (reps ?? 0) > 0;

  return (
    <Sheet open={open} title={exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          await onSubmit({ name, targetSets: sets!, targetReps: reps!, initialWeight: weight });
          onClose();
        }}
      >
        <Field
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="p. ej. Press militar"
          autoFocus={!exercise}
          maxLength={60}
        />
        <div className="grid grid-cols-2 gap-3">
          <Stepper label="Series" value={sets} onChange={setSets} step={1} min={1} />
          <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={1} />
        </div>
        <Stepper
          label="Peso inicial (opcional)"
          value={weight}
          onChange={setWeight}
          step={WEIGHT_STEP}
          unit="kg"
          allowEmpty
          decimal
        />
        <div className="flex gap-3 pt-1">
          {exercise && onDelete && (
            <Button variant="danger" size="lg" onClick={onDelete} aria-label="Borrar ejercicio">
              <Trash2 className="size-5" />
            </Button>
          )}
          <Button type="submit" size="lg" block disabled={!valid}>
            {exercise ? 'Guardar' : 'Añadir'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
