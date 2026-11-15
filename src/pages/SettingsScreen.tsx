import { Screen } from '@/core/components/Screen';

export function SettingsScreen() {
  return (
    <Screen title="Ajustes" backTo="/">
      <section className="rounded-2xl border border-border/60 bg-surface p-4">
        <h2 className="font-semibold">Mi Vida</h2>
        <p className="mt-1 text-sm text-muted">
          Versión {__APP_VERSION__}. Tus datos se guardan solo en este dispositivo.
        </p>
      </section>
    </Screen>
  );
}
