import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button } from '@/core/components/Button';
import { ConfirmSheet } from '@/core/components/Sheet';
import { getCalendarFeed, regenerateCalendarFeed, type FeedState } from '../data/hooks';
import { gastosPaths } from '../paths';

/** Enlace privado para suscribirse a los gastos fijos desde Google Calendar. */
export function CalendarLinkScreen() {
  const [feed, setFeed] = useState<FeedState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  const load = (fn: () => Promise<FeedState>) => {
    setError(null);
    fn()
      .then(setFeed)
      .catch((err: unknown) =>
        setError(navigator.onLine ? (err instanceof Error ? err.message : String(err)) : 'Sin conexión.'),
      );
  };

  useEffect(() => load(getCalendarFeed), []);

  const url = feed?.status === 'ok' ? feed.url : null;

  return (
    <Screen title="Google Calendar" subtitle="Gastos fijos en tu calendario" backTo={gastosPaths.list}>
      {feed?.status === 'signed-out' && (
        <p className="rounded-2xl border border-border/60 bg-surface p-4 text-sm text-muted">
          Para ver tus gastos en Google Calendar inicia sesión en{' '}
          <Link to="/ajustes" className="font-semibold text-accent">
            Ajustes → Sincronización
          </Link>
          .
        </p>
      )}
      {error && <p className="mb-4 rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>}
      {!feed && !error && <p className="text-sm text-muted">Cargando…</p>}

      {url && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-border/60 bg-surface p-4">
            <h2 className="font-semibold">Tu enlace privado</h2>
            <p className="mt-1 text-sm text-muted">
              Cada gasto aparece como evento de todo el día, repetido cada mes o cada año. Los cambios que hagas
              aquí llegan solos a Google Calendar (Google tarda unas horas en refrescar).
            </p>
            <p className="mt-3 rounded-xl bg-bg px-3 py-2 font-mono text-xs break-all text-muted">{url}</p>
            <Button
              size="lg"
              block
              className="mt-3"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              }}
            >
              {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </Button>
          </section>

          <section className="rounded-2xl border border-border/60 bg-surface p-4 text-sm">
            <h2 className="font-semibold">Cómo añadirlo (una sola vez)</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted">
              <li>
                Abre <span className="text-text">calendar.google.com</span> en el ordenador (o en el navegador del
                móvil en modo escritorio): la app de Google Calendar no permite añadir por URL.
              </li>
              <li>
                A la izquierda, junto a «Otros calendarios», pulsa <span className="text-text">+</span> →{' '}
                <span className="text-text">Desde URL</span>.
              </li>
              <li>Pega el enlace y pulsa «Añadir calendario».</li>
              <li>Aparecerá «Gastos fijos» también en la app del móvil.</li>
            </ol>
            <p className="mt-3 text-xs text-muted">
              No compartas el enlace: quien lo tenga puede ver tus gastos fijos (solo eso).
            </p>
          </section>

          <Button variant="ghost" block onClick={() => setConfirmNew(true)}>
            <RefreshCw className="size-4" /> Crear un enlace nuevo
          </Button>
        </div>
      )}

      <ConfirmSheet
        open={confirmNew}
        title="¿Crear un enlace nuevo?"
        message="El enlace actual dejará de funcionar y tendrás que volver a añadir el calendario en Google con el nuevo."
        confirmLabel="Crear enlace"
        onConfirm={() => load(regenerateCalendarFeed)}
        onClose={() => setConfirmNew(false)}
      />
    </Screen>
  );
}
