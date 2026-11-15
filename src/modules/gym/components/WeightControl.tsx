import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { formatKg, parseDecimal } from '@/core/lib/format';
import { PERSON_LABEL, WEIGHT_STEP, type Person } from '../data/types';
import { PersonDot } from './PersonWeights';

interface Props {
  person: Person;
  value: number | null;
  onChange: (value: number | null) => void;
  /** Nombre del ejercicio, para los textos accesibles. */
  exerciseName: string;
}

/** Fila compacta "● Yo  [−] 50 kg [+]" para ajustar un peso al momento. */
export function WeightControl({ person, value, onChange, exerciseName }: Props) {
  // Valor local para que varios toques rápidos se acumulen sin esperar a la BD.
  const [local, setLocal] = useState(value);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => setLocal(value), [value]);

  const commit = (next: number | null) => {
    const v = next === null ? null : Math.max(0, Math.round(next * 100) / 100);
    setLocal(v);
    if (v !== value) onChange(v);
  };

  const label = `${PERSON_LABEL[person]} · ${exerciseName}`;
  const btn =
    'grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-text active:bg-border disabled:opacity-30';

  return (
    <div className="flex items-center gap-2">
      <span className="flex w-20 shrink-0 items-center gap-1.5 text-sm text-muted">
        <PersonDot person={person} />
        {PERSON_LABEL[person]}
      </span>
      <button
        type="button"
        className={btn}
        aria-label={`${label}: restar ${formatKg(WEIGHT_STEP)} kg`}
        disabled={local === null || local <= 0}
        onClick={() => commit((local ?? 0) - WEIGHT_STEP)}
      >
        <Minus className="size-5" />
      </button>
      {editing ? (
        <input
          autoFocus
          inputMode="decimal"
          aria-label={`${label}: peso en kg`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={() => {
            setEditing(false);
            commit(parseDecimal(text));
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="h-11 min-w-0 flex-1 rounded-xl bg-bg text-center text-lg font-bold tabular-nums outline-none focus:ring-2 focus:ring-accent"
        />
      ) : (
        <button
          type="button"
          aria-label={`${label}: ${local === null ? 'sin peso' : `${formatKg(local)} kg`}. Toca para escribirlo`}
          onClick={() => {
            setText(local === null ? '' : formatKg(local));
            setEditing(true);
          }}
          className="h-11 min-w-0 flex-1 rounded-xl text-center text-lg font-bold tabular-nums active:bg-surface-2"
        >
          {local === null ? <span className="text-muted">–</span> : <>{formatKg(local)} <span className="text-xs font-medium text-muted">kg</span></>}
        </button>
      )}
      <button
        type="button"
        className={btn}
        aria-label={`${label}: sumar ${formatKg(WEIGHT_STEP)} kg`}
        onClick={() => commit((local ?? 0) + WEIGHT_STEP)}
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}
