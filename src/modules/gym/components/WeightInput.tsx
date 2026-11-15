import { useEffect, useState } from 'react';
import { formatKg, parseDecimal } from '@/core/lib/format';
import { PERSON_LABEL, type Person } from '../data/types';

interface Props {
  person: Person;
  value: number | null;
  onChange: (value: number | null) => void;
  /** Nombre del ejercicio, para el texto accesible. */
  exerciseName: string;
}

const STYLE: Record<Person, { text: string; border: string }> = {
  me: { text: 'text-me', border: 'border-me' },
  partner: { text: 'text-partner', border: 'border-partner' },
};

/** Campo de peso subrayado con el color de la persona: "45 kg". Se escribe a mano. */
export function WeightInput({ person, value, onChange, exerciseName }: Props) {
  const [text, setText] = useState(value === null ? '' : formatKg(value));
  const [focused, setFocused] = useState(false);

  // Si el valor cambia desde fuera (otra pantalla, importación), refleja el nuevo.
  useEffect(() => {
    if (!focused) setText(value === null ? '' : formatKg(value));
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const parsed = parseDecimal(text);
    const next = parsed === null ? null : Math.max(0, Math.round(parsed * 100) / 100);
    setText(next === null ? '' : formatKg(next));
    if (next !== value) onChange(next);
  };

  const s = STYLE[person];
  return (
    <label className={`flex w-[4.5rem] shrink-0 items-baseline gap-1 border-b-2 ${s.border}`}>
      <input
        inputMode="decimal"
        enterKeyHint="done"
        aria-label={`Peso ${PERSON_LABEL[person]} · ${exerciseName}, en kg`}
        placeholder="0"
        value={text}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className={`w-full min-w-0 bg-transparent text-right text-lg leading-tight font-semibold tabular-nums outline-none placeholder:text-muted/50 ${s.text}`}
      />
      <span className="text-xs text-muted">kg</span>
    </label>
  );
}
