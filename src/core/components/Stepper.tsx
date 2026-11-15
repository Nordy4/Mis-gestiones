import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { formatKg, parseDecimal } from '@/core/lib/format';

interface StepperProps {
  label: string;
  /** null = vacío */
  value: number | null;
  onChange: (value: number | null) => void;
  step: number;
  min?: number;
  unit?: string;
  /** Permite dejar el campo vacío (p. ej. ejercicio sin peso). */
  allowEmpty?: boolean;
  decimal?: boolean;
}

/** Valor numérico con botones grandes −/+ y campo editable en medio. */
export function Stepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  unit,
  allowEmpty,
  decimal,
}: StepperProps) {
  const [text, setText] = useState(value === null ? '' : formatKg(value));

  // Sincroniza el texto cuando el valor cambia desde fuera (botones, prerrelleno).
  useEffect(() => {
    setText(value === null ? '' : formatKg(value));
  }, [value]);

  const bump = (delta: number) => {
    const base = value ?? 0;
    const next = Math.max(min, Math.round((base + delta) * 100) / 100);
    onChange(next);
  };

  const commit = () => {
    const parsed = parseDecimal(text);
    if (parsed === null) {
      if (allowEmpty) onChange(null);
      else setText(value === null ? '' : formatKg(value));
      return;
    }
    onChange(Math.max(min, decimal ? parsed : Math.round(parsed)));
  };

  const btn =
    'grid size-14 shrink-0 place-items-center rounded-2xl bg-surface-2 text-text active:bg-border disabled:opacity-30';

  return (
    <div>
      <span className="mb-1.5 block text-center text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btn}
          aria-label={`Restar ${formatKg(step)} ${unit ?? ''}`}
          onClick={() => bump(-step)}
          disabled={value === null || value <= min}
        >
          <Minus className="size-6" />
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            inputMode={decimal ? 'decimal' : 'numeric'}
            aria-label={label}
            value={text}
            placeholder="–"
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="h-14 w-full rounded-2xl bg-bg text-center text-2xl font-bold tabular-nums outline-none focus:ring-2 focus:ring-accent"
          />
          {unit && (
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted">
              {unit}
            </span>
          )}
        </div>
        <button
          type="button"
          className={btn}
          aria-label={`Sumar ${formatKg(step)} ${unit ?? ''}`}
          onClick={() => bump(step)}
        >
          <Plus className="size-6" />
        </button>
      </div>
    </div>
  );
}
