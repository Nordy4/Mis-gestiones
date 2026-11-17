import { modules } from '@/modules/registry';

/**
 * Ejecuta el `tick` de cada módulo al abrir la app, al volver a ella y cada minuto
 * mientras está visible. (Una PWA no puede ejecutar nada con la app cerrada.)
 */
async function runTicks() {
  for (const mod of modules) {
    try {
      await mod.data?.tick?.();
    } catch (err) {
      console.error(`[tick ${mod.id}]`, err);
    }
  }
}

let started = false;

export function startModuleTasks() {
  if (started) return;
  started = true;
  void runTicks();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void runTicks();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') void runTicks();
  }, 60_000);
}
