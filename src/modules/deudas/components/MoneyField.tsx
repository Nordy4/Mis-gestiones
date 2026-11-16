interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

/** Campo de importe en euros (teclado numérico, acepta coma). */
export function MoneyField({ label, value, onChange, autoFocus }: Props) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      <span className="flex h-14 items-center rounded-xl border border-border bg-bg px-3 focus-within:border-accent">
        <input
          inputMode="decimal"
          enterKeyHint="done"
          aria-label={`${label}, en euros`}
          placeholder="0,00"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-2xl font-bold tabular-nums outline-none placeholder:text-muted/50"
        />
        <span className="text-lg text-muted">€</span>
      </span>
    </label>
  );
}
