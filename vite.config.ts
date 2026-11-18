import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Único servidor externo con el que habla la app (datos, sesión y Edge Functions). */
const SUPABASE_ORIGIN = 'https://qakodusxnrwkersrvgxt.supabase.co';

/**
 * Content-Security-Policy. GitHub Pages no deja poner cabeceras, así que va como <meta> en el
 * build (en desarrollo no, porque Vite usa scripts en línea y websockets). Vercel la envía además
 * como cabecera (vercel.json), donde también puede llevar frame-ancestors.
 * - script-src 'self': solo los scripts de la app (el build no tiene scripts en línea).
 * - img-src https:: fotos de productos de cualquier tienda (módulo Compras).
 * - style-src 'unsafe-inline': estilos en línea de React/Recharts (no ejecutan código).
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  `connect-src 'self' ${SUPABASE_ORIGIN}`,
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

// base './' + HashRouter: el mismo build funciona en Vercel, GitHub Pages
// (en cualquier subcarpeta) o cualquier hosting estático, sin redirecciones.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev'),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'mi-vida-security-meta',
      apply: 'build',
      transformIndexHtml: () => [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
        { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' },
      ],
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Mi Vida',
        short_name: 'Mi Vida',
        description: 'Hub personal con un módulo por cada área de mi vida.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#141418',
        theme_color: '#141418',
        // Aparece en el menú Compartir de Android (con la app instalada). Ver core/lib/shareTarget.ts.
        share_target: {
          action: './',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
});
