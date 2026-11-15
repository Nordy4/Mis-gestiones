import type { InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, className = '', id, ...props }: FieldProps) {
  const inputId = id ?? `f-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <label htmlFor={inputId} className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      <input
        id={inputId}
        className="h-12 w-full rounded-xl border border-border bg-bg px-3 text-text outline-none placeholder:text-muted/60 focus:border-accent"
        {...props}
      />
    </label>
  );
}
