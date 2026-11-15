# Mi Vida — guía para Claude

PWA personal (uso en Android, una mano, modo oscuro) organizada como un **hub de módulos**:
una tarjeta en el inicio por cada área de la vida. Primer módulo: **Gym**.
Idioma de la UI y de los comentarios: **español**.

## Stack

- Vite 8 + React 19 + TypeScript 7 (`tsc -b` solo comprueba tipos, `noEmit`).
- Tailwind CSS 4 vía `@tailwindcss/vite`. Tokens de color en `src/index.css` (`@theme`):
  `bg`, `surface`, `surface-2`, `border`, `text`, `muted`, `accent`, `accent-strong`, `danger`.
  Usa siempre estos tokens (`bg-surface`, `text-muted`…) en vez de colores sueltos.
- React Router 8 con **`createHashRouter`** (URLs `#/gym/...`). Así el mismo build sirve en
  Vercel, GitHub Pages o cualquier hosting estático sin reglas de redirección. `base: './'` en Vite.
- IndexedDB con Dexie 4 + `dexie-react-hooks` (`useLiveQuery`).
- PWA con `vite-plugin-pwa` (`registerType: 'autoUpdate'`, precache de todo → funciona offline).
- Iconos de UI: `lucide-react`. Gráficas: Recharts.

## Comandos

- `npm run dev` — servidor de desarrollo (con `--host`, accesible desde el móvil en la misma wifi).
- `npm run build` — comprueba tipos y genera `dist/` (incluye `sw.js` y `manifest.webmanifest`).
- `npm run preview` — sirve `dist/` (con `--host`). Es la forma de probar la PWA/offline en local.
- `npm run typecheck` — solo tipos.
- `npm run icons` — regenera los PNG de `public/icons` (PowerShell, Windows).

En esta máquina Node y Git pueden no estar en el PATH de la shell de Claude. Refresca el PATH con:
`$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`.
Git viene con GitHub Desktop: `C:\Users\Jordi\AppData\Local\GitHubDesktop\app-*\resources\app\git\cmd\git.exe`.

## Arquitectura

```
src/
├─ main.tsx              registra el SW, abre la BD (initDatabase) y monta <App/>
├─ App.tsx               router: inicio, /ajustes y una rama por módulo (m.path → m.routes)
├─ index.css             Tailwind + tokens de tema + utilidades pb-safe / pt-safe
├─ core/                 lo compartido por todos los módulos (no conoce ningún módulo concreto)
│  ├─ types.ts           ModuleDefinition / ModuleData
│  ├─ db/db.ts           instancia Dexie única ('mi-vida') + tabla core_meta
│  ├─ db/setup.ts        DB_VERSION, compone los esquemas de los módulos, ejecuta seeds una vez
│  ├─ components/        Screen, Button/IconButton, Sheet/ConfirmSheet, Field, EmptyState…
│  └─ lib/               ids (newId UUID, nowIso), format (fechas es-ES, kg, parseDecimal)
├─ pages/                pantallas del hub: HomeScreen, SettingsScreen, NotFoundScreen
└─ modules/
   ├─ registry.ts        array `modules` → tarjetas del inicio, rutas, tablas y backup
   └─ <id>/              un módulo = una carpeta autocontenida
      ├─ index.ts        export const <id>Module: ModuleDefinition
      ├─ routes.tsx      RouteObject[] relativas a la ruta del módulo
      ├─ screens/        pantallas (una por ruta)
      ├─ components/     componentes propios del módulo
      └─ data/           capa de datos del módulo (ver abajo)
```

### Capa de datos (regla clave)

Objetivo: poder migrar de IndexedDB a Supabase sin tocar las pantallas.

- `data/types.ts` — tipos de dominio. Ids `string` (UUID), fechas ISO, `createdAt`/`updatedAt` en todo.
- `data/schema.ts` — tablas Dexie del módulo. **Toda tabla lleva el prefijo `<id>_`** (setup.ts lo valida).
- `data/repository.ts` — interfaz del repositorio (contrato, sin Dexie).
- `data/dexieRepository.ts` — implementación con Dexie. Único sitio del módulo que importa `@/core/db/db`.
- `data/hooks.ts` — hooks de lectura reactiva (`useLiveQuery`) + exporta el repositorio activo.
- **Las pantallas y componentes solo importan de `data/hooks.ts` y `data/types.ts`.** Nunca Dexie.

Para migrar a Supabase: crear `supabaseRepository.ts` que cumpla la interfaz y adaptar `hooks.ts`.

### Base de datos

- Una sola BD Dexie `mi-vida`. `setup.ts` junta `coreSchema` + `schema` de cada módulo.
- **Si cambias cualquier `schema`, sube `DB_VERSION` en `src/core/db/setup.ts`.** Dexie migra solo
  (añadir tablas/índices). Si necesitas transformar datos, añade una `.upgrade()` allí.
- Los `seed()` de los módulos se ejecutan una sola vez (marca `seeded:<id>` en `core_meta`).
- Borrado: preferimos **archivar** (`archivedAt`) para no perder historial.

### Copia de seguridad (`src/core/db/backup.ts`)

- Archivo `{ app: 'mi-vida', version, exportedAt, modules: { <id>: <exportData()> } }`.
- Exportar recorre los módulos con `data`; importar llama a `importData` de cada módulo presente en
  el archivo (sustituye sus datos) y marca `seeded:<id>`. Los módulos ausentes no se tocan.
- `importData` debe **validar antes de borrar** (ver `gym/data/backup.ts` → `parseGymExport`) y
  escribir todo en una transacción Dexie.
- Si cambias el formato exportado de un módulo de forma incompatible, sube `BACKUP_VERSION` y
  acepta también el formato antiguo en `importData`.
- UI en Ajustes: compartir (Web Share → Drive), descargar JSON, importar con confirmación.

### Módulo Gym (referencia)

- Rutas (`gym/paths.ts`): `/gym`, `/gym/rutina/:routineId`, `/gym/rutina/:routineId/entrenar`,
  `/gym/ejercicio/:exerciseId` (estadísticas).
- Tablas: `gym_routines`, `gym_exercises` (por rutina), `gym_workouts` (uno por rutina y día),
  `gym_sets` (una fila por serie; se guarda al pulsar, sin botón de "guardar entreno").
- Peso prerrellenado: última serie de hoy > última serie con peso del ejercicio > `initialWeight`.
- Estadísticas: peso máximo por sesión (o reps máximas si el ejercicio no tiene peso), récord
  (más peso, desempata reps) e historial. Recharts se carga en diferido (`lazy`).

## Despliegue

- Build estático en `dist/` con rutas relativas (`base: './'`) + HashRouter → sirve en cualquier ruta.
- Vercel: `vercel.json` (sin caché para `sw.js`/`index.html`, caché larga para `assets/`).
- GitHub Pages: `.github/workflows/deploy-pages.yml` (Source: GitHub Actions) en cada push a `main`.
- La PWA solo es instalable/offline bajo HTTPS (o `localhost`).

## Convenciones de UI

- Mobile-first, ancho máximo `max-w-xl`. Objetivos táctiles ≥ 44px (`size-11`, `h-11`, `h-14`).
- Toda pantalla usa `<Screen title backTo=… actions=… footer=…>`. **Cada pantalla tiene `backTo`**
  salvo el inicio. Las acciones principales van en `footer` (zona del pulgar).
- Formularios y confirmaciones en `<Sheet>` / `<ConfirmSheet>` (panel inferior), no en modales centrados.
- Pesos en kg, paso de 2,5. Mostrar con `formatKg`, leer inputs con `parseDecimal` (acepta coma).
- Rutas en español: `/gym/rutina/:id`, `/ajustes`…

## Cómo añadir un módulo nuevo

1. Crea `src/modules/<id>/` copiando la forma de `gym/` (`index.ts`, `routes.tsx`, `screens/`, `data/`).
2. En `data/schema.ts` define sus tablas con prefijo `<id>_`. Implementa `exportData`, `importData`
   (y `seed` si tiene datos iniciales) y añádelos en `data` del `ModuleDefinition`.
3. En `index.ts` exporta el `ModuleDefinition` (`id`, `name`, `description`, `icon` de lucide,
   `color` p. ej. `'bg-sky-500/15 text-sky-400'`, `path`, `routes`, `data`).
4. Añádelo al array de `src/modules/registry.ts`.
5. Si ha añadido tablas, sube `DB_VERSION` en `src/core/db/setup.ts`.
6. `npm run build` y prueba. El módulo aparece en el inicio y entra solo en la copia de seguridad.

Un módulo nunca importa de otro módulo. Lo compartido va a `src/core/`.

## Flujo de trabajo

- Commits pequeños por fase o funcionalidad, mensajes en español.
- Antes de commitear: `npm run build` sin errores.
