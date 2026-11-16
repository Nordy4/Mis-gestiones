import { useRef, useState } from 'react';
import { Download, Share2, Upload } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button } from '@/core/components/Button';
import { ConfirmSheet } from '@/core/components/Sheet';
import {
  canShareFiles,
  downloadBackup,
  readBackupFile,
  restoreBackup,
  shareBackup,
  useLastExportDate,
  type BackupFile,
} from '@/core/db/backup';
import { useSyncStatus } from '@/core/sync/hooks';
import { SyncSection } from './SyncSection';

type Status = { kind: 'ok' | 'error'; text: string } | null;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

export function SettingsScreen() {
  const lastExport = useLastExportDate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const shareable = canShareFiles();
  const signedIn = useSyncStatus().state !== 'signed-out';

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setStatus(null);
    try {
      const msg = await fn();
      if (msg) setStatus({ kind: 'ok', text: msg });
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Ajustes" backTo="/">
      <div className="space-y-4">
        <SyncSection />

        <section className="rounded-2xl border border-border/60 bg-surface p-4">
          <h2 className="font-semibold">Copia de seguridad</h2>
          <p className="mt-1 text-sm text-muted">
            {signedIn
              ? 'Tus datos están en la nube. Aun así, puedes exportar una copia y guardarla en Drive o en el ordenador.'
              : 'Sin sesión iniciada tus datos solo están en este dispositivo. Exporta una copia de vez en cuando y guárdala en Drive o en el ordenador.'}
          </p>
          <p className="mt-2 text-xs text-muted">
            Última copia: {lastExport ? formatDateTime(lastExport) : lastExport === null ? 'nunca' : '…'}
          </p>

          <div className="mt-4 grid gap-2">
            {shareable && (
              <Button
                size="lg"
                block
                disabled={busy}
                onClick={() => run(async () => ((await shareBackup()) ? 'Copia compartida.' : null))}
              >
                <Share2 className="size-5" /> Compartir copia (Drive, correo…)
              </Button>
            )}
            <Button
              size="lg"
              block
              variant={shareable ? 'secondary' : 'primary'}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await downloadBackup();
                  return 'Copia descargada.';
                })
              }
            >
              <Download className="size-5" /> Descargar JSON
            </Button>
            <Button size="lg" block variant="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
              <Upload className="size-5" /> Importar copia…
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                run(async () => {
                  setPending(await readBackupFile(file));
                  return null;
                });
              }}
            />
          </div>

          {status && (
            <p
              role="status"
              className={`mt-3 rounded-xl px-3 py-2 text-sm ${
                status.kind === 'ok' ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger'
              }`}
            >
              {status.text}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border/60 bg-surface p-4">
          <h2 className="font-semibold">Mi Vida</h2>
          <p className="mt-1 text-sm text-muted">Versión {__APP_VERSION__}</p>
        </section>
      </div>

      <ConfirmSheet
        open={pending !== null}
        title="¿Importar esta copia?"
        message={
          pending && (
            <>
              Copia del {formatDateTime(pending.exportedAt)}.
              <br />
              <strong className="text-text">Se sustituirán los datos actuales</strong> de los módulos incluidos. Esto
              no se puede deshacer; si quieres, descarga antes una copia de lo que tienes ahora.
            </>
          )
        }
        confirmLabel="Importar"
        danger
        onConfirm={() => {
          const backup = pending!;
          run(async () => {
            const restored = await restoreBackup(backup);
            return restored.length ? `Datos restaurados: ${restored.join(', ')}.` : 'La copia no contenía datos.';
          });
        }}
        onClose={() => setPending(null)}
      />
    </Screen>
  );
}
