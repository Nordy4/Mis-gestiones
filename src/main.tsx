import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import { App } from './App';
import { initDatabase } from '@/core/db/setup';
import { startSync } from '@/core/sync/engine';
import { startModuleTasks } from '@/core/lib/moduleTasks';
import { consumeShareTarget } from '@/core/lib/shareTarget';

// Service worker: cachea la app para que funcione offline y se actualiza solo.
registerSW({ immediate: true });

const root = createRoot(document.getElementById('root')!);

// Anti-clickjacking: GitHub Pages no permite la cabecera frame-ancestors, así que la app se
// niega a funcionar dentro de un <iframe> de otra web.
const framed = (() => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
})();

if (framed) {
  root.render(<p className="p-6 text-sm">Abre Mi Vida directamente, no dentro de otra página.</p>);
} else initDatabase()
  .then(() => {
    consumeShareTarget();
    startModuleTasks();
    startSync();
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((err: unknown) => {
    console.error(err);
    root.render(
      <div className="p-6 text-sm">
        <p className="font-semibold text-danger">No se pudo abrir la base de datos local.</p>
        <pre className="mt-3 whitespace-pre-wrap text-muted">{String(err)}</pre>
      </div>,
    );
  });
