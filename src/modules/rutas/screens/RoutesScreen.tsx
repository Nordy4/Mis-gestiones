import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { MapPinned, Pencil, Plus, Route, Sparkles } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button, IconButton } from '@/core/components/Button';
import { EmptyState } from '@/core/components/EmptyState';
import { ConfirmSheet } from '@/core/components/Sheet';
import { extractUrl, safeHttpUrl } from '@/core/lib/links';
import { rutasRepo, useRoutes } from '../data/hooks';
import type { MotoRoute } from '../data/types';
import { RouteSheet } from '../components/RouteSheet';
import { rutasPaths } from '../paths';

function RouteRow({ r, onEdit }: { r: MotoRoute; onEdit: () => void }) {
  // Solo enlaces http(s): nunca `javascript:` ni otros esquemas (XSS).
  const href = safeHttpUrl(r.url);
  const content = (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
        <MapPinned className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg leading-tight font-semibold">{r.name}</span>
        <span className="block truncate text-sm text-muted">{href ? 'Abrir en Google Maps' : 'Enlace no válido'}</span>
      </span>
    </>
  );
  return (
    <li className="flex items-center gap-3 py-3">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 flex-1 items-center gap-3 active:opacity-70"
        >
          {content}
        </a>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{content}</span>
      )}
      <IconButton label={`Editar ${r.name}`} onClick={onEdit} className="size-9">
        <Pencil className="size-4" />
      </IconButton>
    </li>
  );
}

/** Lista de rutas en moto. Recibe los enlaces que compartes desde Google Maps. */
export function RoutesScreen() {
  const routes = useRoutes();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState<{ url: string; name: string } | null>(null);
  const [editing, setEditing] = useState<MotoRoute | null>(null);
  const [deleting, setDeleting] = useState<MotoRoute | null>(null);

  // Enlace compartido (Google Maps → Compartir → Mi Vida): ?url=&title=&text=
  useEffect(() => {
    const shared = params.get('url') || params.get('text') || params.get('title');
    if (!shared) return;
    const text = params.get('text') ?? '';
    const url = (extractUrl(params.get('url')) || extractUrl(text) || extractUrl(params.get('title')) || '').trim();
    // Nombre propuesto: el título o el texto sin el enlace (si queda algo útil). Lo editas antes de guardar.
    const name = (params.get('title') || text.replace(url, ''))
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);
    setAdding({ url, name });
    setParams({}, { replace: true });
  }, [params, setParams]);

  return (
    <Screen
      title="Rutas"
      subtitle="Mis rutas en moto"
      backTo="/"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" block onClick={() => setAdding({ url: '', name: '' })}>
            <Plus className="size-5" /> Añadir
          </Button>
          <Button size="lg" block onClick={() => navigate(rutasPaths.ai)}>
            <Sparkles className="size-5" /> Crear con IA
          </Button>
        </div>
      }
    >
      {routes && routes.length === 0 && (
        <EmptyState icon={Route} title="Aún no tienes rutas">
          En Google Maps, abre tu ruta y pulsa Compartir → Mi Vida. También puedes pegar el enlace con el botón de
          abajo, o pulsa «Crear con IA» para que te diseñe una por secundarias con curvas.
        </EmptyState>
      )}

      {routes && routes.length > 0 && (
        <ul className="divide-y divide-border/60 border-b border-border/60">
          {routes.map((r) => (
            <RouteRow key={r.id} r={r} onEdit={() => setEditing(r)} />
          ))}
        </ul>
      )}

      <RouteSheet
        open={adding !== null}
        initial={adding}
        onSubmit={(input) => rutasRepo.addRoute(input).then(() => undefined)}
        onClose={() => setAdding(null)}
      />
      <RouteSheet
        open={editing !== null}
        route={editing}
        onSubmit={(input) => rutasRepo.updateRoute(editing!.id, input)}
        onDelete={() => {
          setDeleting(editing);
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />
      <ConfirmSheet
        open={deleting !== null}
        title="¿Borrar esta ruta?"
        message={deleting?.name}
        confirmLabel="Borrar"
        danger
        onConfirm={() => deleting && rutasRepo.archiveRoute(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </Screen>
  );
}
