import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';

interface ScreenProps {
  title: string;
  subtitle?: string;
  /** Ruta a la que vuelve el botón atrás. Si se omite, no se muestra (pantalla de inicio). */
  backTo?: string;
  /** Botones extra a la derecha de la cabecera. */
  actions?: ReactNode;
  /** Barra inferior fija (acciones principales, al alcance del pulgar). */
  footer?: ReactNode;
  children: ReactNode;
}

/** Plantilla de pantalla: cabecera con volver + contenido con scroll + barra inferior opcional. */
export function Screen({ title, subtitle, backTo, actions, footer, children }: ScreenProps) {
  return (
    <div className="mx-auto flex h-full max-w-xl flex-col">
      <header className="pt-safe sticky top-0 z-10 border-b border-border/60 bg-bg/90 backdrop-blur">
        <div className="flex h-14 items-center gap-1 px-2">
          {backTo !== undefined ? (
            <Link
              to={backTo}
              aria-label="Volver"
              className="grid size-11 shrink-0 place-items-center rounded-full text-muted active:bg-surface-2"
            >
              <ChevronLeft className="size-6" />
            </Link>
          ) : (
            <span className="w-2" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold leading-tight">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center">{actions}</div>}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">{children}</main>

      {footer && (
        <footer className="pb-safe border-t border-border/60 bg-bg/95 px-4 pt-3 backdrop-blur">
          {footer}
        </footer>
      )}
    </div>
  );
}
