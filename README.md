# Mi Vida

PWA personal para el móvil: un hub con un módulo por cada área de la vida.
Módulos: **Gym** (rutinas, registro de series, estadísticas).

Vite + React + TypeScript + Tailwind · IndexedDB (Dexie) · funciona offline · instalable.

## Desarrollo

```bash
npm install
npm run dev       # http://localhost:5173 (y la IP de tu PC en la red local)
npm run build     # genera dist/
npm run preview   # sirve dist/ en http://localhost:4173 (prueba de PWA/offline)
```

## Probar en el móvil (misma wifi)

`npm run dev` o `npm run preview` muestran una URL `Network: http://192.168.x.x:...`.
Ábrela en Chrome del móvil. Para **instalarla** y probar offline hace falta HTTPS, así que
usa el despliegue (Vercel o GitHub Pages) para la versión de uso diario.

## Despliegue

- **Vercel**: importa el repo en vercel.com → detecta `vercel.json` → Deploy.
- **GitHub Pages**: en el repo, Settings → Pages → Source: *GitHub Actions*. Cada push a `main`
  publica con `.github/workflows/deploy-pages.yml` en `https://<usuario>.github.io/<repo>/`.

El build usa rutas relativas y `HashRouter`, así que funciona igual en ambos sin configuración extra.

## Copia de seguridad

Ajustes (⚙ en el inicio) → *Compartir copia* / *Descargar JSON* / *Importar copia*.
Los datos viven solo en el navegador del móvil: exporta de vez en cuando.

Arquitectura y cómo añadir módulos: ver [CLAUDE.md](CLAUDE.md).
