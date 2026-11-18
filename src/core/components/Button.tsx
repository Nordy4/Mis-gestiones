import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning';
type Size = 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-accent-gradient text-white shadow-lg shadow-accent-strong/30 active:brightness-90',
  secondary: 'bg-surface-2 text-text active:bg-white/15',
  ghost: 'bg-transparent text-text active:bg-surface-2',
  danger: 'bg-danger/15 text-danger active:bg-danger/25',
  /** Acción principal "de cierre" (p. ej. fichar salida), distinta de la morada de inicio. */
  warning: 'bg-amber-400 text-black active:bg-amber-500',
};

const sizes: Record<Size, string> = {
  md: 'h-11 px-4 text-sm',
  lg: 'h-14 px-5 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors select-none disabled:opacity-40 ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
      {...props}
    />
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

/** Botón redondo solo con icono (44px, tamaño mínimo táctil). */
export function IconButton({ label, className = '', type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`grid size-11 shrink-0 place-items-center rounded-full text-muted active:bg-surface-2 disabled:opacity-40 ${className}`}
      {...props}
    />
  );
}
