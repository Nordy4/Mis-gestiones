import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ExternalLink, Loader2, RefreshCw, Save, Sparkles } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button } from '@/core/components/Button';
import { Field } from '@/core/components/Field';
import { generateAiRoute, rutasRepo } from '../data/hooks';
import type { AiRoute } from '../data/types';
import { RouteSheet } from '../components/RouteSheet';
import { rutasPaths } from '../paths';

const DURATIONS = [60, 90, 120, 180, 240, 300, 360];

const hm = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
};

/** Crear una ruta en moto con IA: inicio, final (o circular), duración y preferencias. */
export function AiRouteScreen() {
  const navigate = useNavigate();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [circular, setCircular] = useState(false);
  const [minutes, setMinutes] = useState(180);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [route, setRoute] = useState<AiRoute | null>(null);
  const [saving, setSaving] = useState(false);

  const valid = start.trim() !== '' && (circular || end.trim() !== '');

  const generate = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    setSignedOut(false);
    try {
      const res = await generateAiRoute({ start, end: circular ? '' : end, minutes, notes });
      if (res.status === 'ok') setRoute(res.route);
      else if (res.status === 'signed-out') setSignedOut(true);
      else setError(res.message);
    } catch {
      setError('No se ha podido generar la ruta. Prueba otra vez.');
    } finally {
      setLoading(false);
    }
  };

  const footer = route ? (
    <div className="flex gap-3">
      <Button variant="secondary" size="lg" onClick={() => setRoute(null)} aria-label="Generar otra ruta">
        <RefreshCw className="size-5" />
      </Button>
      <Button size="lg" block onClick={() => setSaving(true)}>
        <Save className="size-5" /> Guardar ruta
      </Button>
    </div>
  ) : (
    <Button size="lg" block disabled={!valid || loading} onClick={generate}>
      {loading ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
      {loading ? 'Generando…' : 'Generar ruta'}
    </Button>
  );

  return (
    <Screen title="Ruta con IA" subtitle="Secundarias con curvas" backTo={rutasPaths.list} footer={footer}>
      {signedOut && (
        <p className="mb-4 rounded-2xl border border-border/60 bg-surface p-4 text-sm text-muted">
          Para crear rutas con IA inicia sesión en{' '}
          <Link to="/ajustes" className="font-semibold text-accent">
            Ajustes → Sincronización
          </Link>
          .
        </p>
      )}
      {error && <p className="mb-4 rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>}

      {!route && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void generate();
          }}
        >
          <fieldset disabled={loading} className="space-y-4 disabled:opacity-60">
            <Field
              label="Salida"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="p. ej. Granollers"
              maxLength={200}
              autoComplete="off"
            />

            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={circular}
                onChange={(e) => setCircular(e.target.checked)}
                className="size-5 accent-[var(--color-accent)]"
              />
              Ruta circular (volver a la salida)
            </label>

            {!circular && (
              <Field
                label="Llegada"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                placeholder="p. ej. Ripoll"
                maxLength={200}
                autoComplete="off"
              />
            )}

            <div>
              <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">
                Duración en marcha
              </span>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setMinutes(d)}
                    aria-pressed={minutes === d}
                    className={`h-11 rounded-xl px-4 text-sm font-semibold ${
                      minutes === d ? 'bg-accent text-black' : 'bg-surface-2 text-text active:bg-border'
                    }`}
                  >
                    {hm(d)}
                  </button>
                ))}
              </div>
            </div>

            <Field
              label="Preferencias (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="p. ej. pasar por el Montseny, evitar Vic"
              maxLength={300}
              autoComplete="off"
            />
          </fieldset>

          {loading && (
            <p className="rounded-2xl border border-border/60 bg-surface p-4 text-sm text-muted">
              Buscando carreteras con curvas y comprobando la duración… Puede tardar hasta un par de minutos.
            </p>
          )}
        </form>
      )}

      {route && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-border/60 bg-surface p-4">
            <h2 className="text-lg leading-tight font-semibold">{route.name}</h2>
            {route.summary && <p className="mt-2 text-sm text-muted">{route.summary}</p>}
            <div className="mt-3 flex gap-6 text-sm">
              <div>
                <span className="block text-xs text-muted uppercase">Duración</span>
                <span className="font-semibold">{route.minutes !== null ? hm(route.minutes) : '—'}</span>
                <span className="block text-xs text-muted">pediste {hm(route.targetMinutes)}</span>
              </div>
              <div>
                <span className="block text-xs text-muted uppercase">Distancia</span>
                <span className="font-semibold">{route.km !== null ? `${Math.round(route.km)} km` : '—'}</span>
              </div>
            </div>
          </section>

          <ol className="relative space-y-0 border-l border-accent/40 pl-5">
            <li className="py-2">
              <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-accent" aria-hidden />
              <span className="block text-sm font-semibold">Salida</span>
              <span className="block text-xs text-muted">{route.start}</span>
            </li>
            {route.stops.map((s, i) => (
              <li key={i} className="py-2">
                <span className="absolute -left-[4px] mt-1.5 size-2 rounded-full bg-accent/60" aria-hidden />
                <span className="block text-sm">{s.name}</span>
                {s.road && <span className="block text-xs text-muted">por {s.road}</span>}
              </li>
            ))}
            <li className="py-2">
              <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-accent" aria-hidden />
              <span className="block text-sm font-semibold">Llegada</span>
              <span className="block text-xs text-muted">{route.end ?? 'Vuelta a la salida'}</span>
            </li>
          </ol>

          <a
            href={route.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-surface-2 font-semibold active:bg-border"
          >
            <ExternalLink className="size-5" /> Abrir en Google Maps
          </a>
          <p className="text-xs text-muted">
            La autovía solo se usa para acercarte a la zona buena o en enlaces cortos. Si quieres evitarla del
            todo, en Google Maps toca ⋮ → Opciones de ruta → «Evitar autopistas».
          </p>
        </div>
      )}

      <RouteSheet
        open={saving}
        initial={route ? { name: route.name, url: route.url } : null}
        onSubmit={async (input) => {
          await rutasRepo.addRoute(input);
          navigate(rutasPaths.list);
        }}
        onClose={() => setSaving(false)}
      />
    </Screen>
  );
}
