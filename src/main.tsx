import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import { App } from './App';
import { initDatabase } from '@/core/db/setup';
import { startSync } from '@/core/sync/engine';

// Service worker: cachea la app para que funcione offline y se actualiza solo.
registerSW({ immediate: true });

const root = createRoot(document.getElementById('root')!);

initDatabase()
  .then(() => {
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
