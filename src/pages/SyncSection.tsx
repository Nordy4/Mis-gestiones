import { useState } from 'react';
import { Cloud, CloudOff, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/core/components/Button';
import { Field } from '@/core/components/Field';
import { ConfirmSheet } from '@/core/components/Sheet';
import { signIn, signOut, syncNow } from '@/core/sync/engine';
import { useSyncStatus } from '@/core/sync/hooks';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Ajustes → Sincronización con Supabase: iniciar sesión, estado y cerrar sesión. */
export function SyncSection() {
  const sync = useSyncStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);

  if (sync.state === 'signed-out') {
    return (
      <section className="rounded-2xl border border-border/60 bg-surface p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <CloudOff className="size-5 text-muted" /> Sincronización
        </h2>
        <p className="mt-1 text-sm text-muted">
          Inicia sesión para guardar tus datos en la nube y tenerlos en todos tus dispositivos. La app sigue funcionando
          sin conexión.
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await signIn(email, password);
              setPassword('');
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field
            label="Correo"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="text-xs text-muted">
            Si tu cuenta está vacía, se subirán los datos de este dispositivo. Si ya tiene datos,{' '}
            <strong className="text-text">sustituirán a los de este dispositivo</strong>.
          </p>
          <Button type="submit" size="lg" block disabled={busy || !email || !password}>
            <Cloud className="size-5" /> {busy ? 'Conectando…' : 'Iniciar sesión'}
          </Button>
        </form>
        {error && <p className="mt-3 rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p>}
      </section>
    );
  }

  const syncing = sync.state === 'syncing';
  return (
    <section className="rounded-2xl border border-border/60 bg-surface p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Cloud className="size-5 text-accent" /> Sincronización
      </h2>
      <p className="mt-1 truncate text-sm text-muted">Conectado como {sync.email}</p>
      <p className="mt-2 text-xs text-muted">
        {syncing
          ? 'Sincronizando…'
          : sync.lastSyncAt
            ? `Última sincronización: ${formatDateTime(sync.lastSyncAt)}`
            : 'Pendiente de sincronizar'}
      </p>
      {sync.state === 'error' && sync.error && (
        <p className="mt-3 rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger">{sync.error}</p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" disabled={syncing} onClick={() => void syncNow()}>
          <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} /> Sincronizar
        </Button>
        <Button variant="ghost" onClick={() => setConfirmOut(true)}>
          <LogOut className="size-4" /> Cerrar sesión
        </Button>
      </div>

      <ConfirmSheet
        open={confirmOut}
        title="¿Cerrar sesión?"
        message="Los datos se quedan en este dispositivo, pero dejarán de sincronizarse. Al volver a entrar, los de la nube sustituirán a los de este dispositivo."
        confirmLabel="Cerrar sesión"
        onConfirm={() => void signOut()}
        onClose={() => setConfirmOut(false)}
      />
    </section>
  );
}
