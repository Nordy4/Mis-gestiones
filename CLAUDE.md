# Mi Vida — guía para Claude

PWA personal (uso en Android, una mano, modo oscuro) organizada como un **hub de módulos**:
una tarjeta en el inicio por cada área de la vida. Módulos: **Gym**, **Deudas** y **Trabajo**.
Idioma de la UI y de los comentarios: **español**.

## Stack

- Vite 8 + React 19 + TypeScript 7 (`tsc -b` solo comprueba tipos, `noEmit`).
- Tailwind CSS 4 vía `@tailwindcss/vite`. Tokens de color en `src/index.css` (`@theme`):
  `bg`, `surface`, `surface-2`, `border`, `text`, `muted`, `accent`, `accent-strong`, `danger`.
  Usa siempre estos tokens (`bg-surface`, `text-muted`…) en vez de colores sueltos.
- React Router 8 con **`createHashRouter`** (URLs `#/gym/...`). Así el mismo build sirve en
  Vercel, GitHub Pages o cualquier hosting estático sin reglas de redirección. `base: './'` en Vite.
- IndexedDB con Dexie 4 + `dexie-react-hooks` (`useLiveQuery`), sincronizado con Supabase
  (`@supabase/supabase-js`).
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
Push/fetch a GitHub funcionan desde aquí: `~/.gitconfig` usa GitHub CLI (`gh auth git-credential`,
cuenta Nordy4) como credencial para github.com. Haz push **solo cuando el usuario lo pida**.

## Arquitectura

```
src/
├─ main.tsx              registra el SW, abre la BD (initDatabase) y monta <App/>
├─ App.tsx               router: inicio, /ajustes y una rama por módulo (m.path → m.routes)
├─ index.css             Tailwind + tokens de tema + utilidades pb-safe / pt-safe
├─ core/                 lo compartido por todos los módulos (no conoce ningún módulo concreto)
│  ├─ types.ts           ModuleDefinition / ModuleData
│  ├─ db/db.ts           instancia Dexie única ('mi-vida') + tablas core_meta y core_sync_shadow
│  ├─ sync/              sincronización con Supabase (cliente, motor, middleware de cambios)
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

Los repositorios siguen siendo Dexie: la nube la gestiona la capa de sincronización (abajo), así
que un módulo nuevo se sincroniza solo, sin código extra.

### Sincronización con Supabase (`src/core/sync/`)

- **Primero local**: la app lee y escribe solo en IndexedDB; `engine.ts` sincroniza en segundo plano
  (al abrir, 2 s después de cada cambio, al volver a la app o a la red y cada 5 min).
- Supabase: proyecto `qakodusxnrwkersrvgxt`, URL y clave *publishable* en `sync/client.ts`
  (públicas por diseño; nunca poner la secret/service_role). Esquema en `supabase/schema.sql`
  (se pega en el SQL Editor; es re-ejecutable). Una sola tabla genérica `sync_records`
  (`user_id, tbl, id, data jsonb, deleted, updated_at`) con RLS por usuario.
- Se sincronizan **todas las tablas de los módulos**; las `core_*` no. `changes.ts` es un middleware
  Dexie que avisa de cada escritura. `core_sync_shadow` guarda la huella (JSON con claves ordenadas,
  `stable.ts`) de lo último sincronizado: subir = registros cuya huella cambió + borrados (marca
  `deleted`); bajar = filas con `updated_at` posterior al cursor `sync:lastPull` (con 5 min de margen).
- Primera sincronización de un dispositivo: cuenta vacía → sube lo local; con datos → sustituyen a
  los locales. Conflictos: gana el último en subir (uso de una sola persona).
- Cuenta única del usuario (sin registro público: el usuario se crea en el panel de Supabase).
  UI en Ajustes (`pages/SyncSection.tsx`): iniciar/cerrar sesión, estado, "Sincronizar".
  Cerrar sesión deja los datos locales y borra el estado de sincronización.
- Plan gratuito: Supabase pausa el proyecto tras ~7 días sin uso. `.github/workflows/supabase-keepalive.yml`
  llama cada 3 días a la función `public.keepalive()` (solo devuelve `now()`). GitHub desactiva los
  workflows programados tras 60 días sin commits en el repo: si pasa, reactivarlo en la pestaña Actions.
- Al probar en el navegador del PC **no inicies sesión con la cuenta real** si la BD local tiene
  datos de prueba y la nube está vacía: se subirían.

### Base de datos

- Una sola BD Dexie `mi-vida`. `setup.ts` junta `coreSchema` + `schema` de cada módulo.
- **Si cambias cualquier `schema`, sube `DB_VERSION` en `src/core/db/setup.ts`.** Dexie migra solo
  las tablas e índices (solo se declara la última versión).
- Para transformar datos, el módulo implementa `data.upgrade(tx)`: setup.ts lo llama en **cada**
  subida de versión de una BD existente, así que debe ser **idempotente** (mirar la forma de los
  datos, no suponer la versión de origen). Gym lo hace con `normalizeGymData` (mismo código que al
  importar copias antiguas). No borres tablas antiguas con datos: déjalas marcadas como legado.
- Al probar migraciones en el navegador, crea la BD antigua desde una página sin la app cargada
  (p. ej. `/favicon.svg`): si la app está abierta, reabre la BD y estropea la prueba.
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

- Pestañas inferiores (`GymTabs`): **Rutinas** (`/gym`) y **Calendario** (`/gym/calendario?dia=`).
  Otras rutas (`gym/paths.ts`): `/gym/rutina/:id`, `/gym/rutina/:id/entrenar` (cronómetro),
  `/gym/ejercicio/:id` (evolución del peso).
- Tablas: `gym_routines`, `gym_sections` (bloques con nombre libre), `gym_exercises` (por rutina;
  `sectionId` opcional; **pesos actuales** `weight` / `partnerWeight`), `gym_weight_log` (historial:
  una fila por ejercicio y día con el último valor de ese día), `gym_workouts` (entrenos
  cronometrados) y `gym_sets` (**legado**, ya no se usa ni se exporta).
- **Pesos**: se escriben a mano (sin botones +/−) en `WeightInput`: número grande subrayado con el
  color de la persona + "kg", se guarda al salir del campo o pulsar Enter. Cada cambio actualiza el
  ejercicio y apunta el día en `gym_weight_log` (`setWeights`). No hay registro serie a serie.
- **Fila de ejercicio** (diseño pedido por el usuario): nombre a la izquierda, peso mío y de la
  pareja a la derecha; debajo "● 45 kg · 13 nov" / "● sin registro" (último registro de cada uno,
  enlaza a la evolución) y papelera. Filas separadas por líneas, sin tarjetas. Tocar el nombre
  abre el formulario de edición.
- **Dos personas**: `Person = 'me' | 'partner'`. En la UI se llaman **Goyo** (me) y **Bebe** (partner): usar siempre `PERSON_LABEL`, nunca "Yo"/"Pareja" a mano. Colores: **morado
  `--color-me` #9d7bf5 (yo)** y **azul pastel `--color-partner` #8ccbf7 (pareja)**, elegidos por el
  usuario; `PERSON_COLOR` repite los valores para Recharts. Siempre con su nombre al lado
  (`PersonDot` + texto o `sr-only`), nunca solo color.
- **Entrenamiento = cronómetro** (`TimerScreen`): "Empezar" crea un workout con `startedAt`; el
  tiempo se calcula de las marcas guardadas (`lib/timer.ts` → `elapsedSeconds`), así que sigue
  contando con la app cerrada. Pausa con `pausedAt` + `pausedSeconds`. Solo un entreno activo a la
  vez (`finishedAt === null`). Al terminar guarda `durationSeconds` y abre el calendario en ese día.
  Se puede descartar. `ActiveWorkoutBanner` lo muestra en las pestañas.
- **Calendario** (`CalendarScreen`): mes con los días entrenados, total del mes, y detalle del día
  (rutina, hora de inicio, duración, borrar). Usa `useRoutineNames` para incluir rutinas borradas.
- Pantalla de rutina: en la cabecera, iconos añadir sección (FolderPlus) · renombrar · borrar
  rutina. Cada sección tiene iconos "+" (añadir ejercicio en esa sección) y lápiz (editar). Los ejercicios se reordenan dentro de su sección con Subir/Bajar en el formulario de edición (`moveExercise`, intercambia valores de `order` solo dentro del grupo). Solo si
  la rutina no tiene secciones aparece el botón "Añadir ejercicio" al final.
- Secciones: los ejercicios sin sección van arriba; luego cada sección por `order`
  (`lib/grouping.ts`). Borrar una sección deja sus ejercicios sin sección.
- Evolución (`ExerciseStatsScreen`): peso actual y récord por persona, gráfica del historial de
  pesos (una línea por persona) y tabla por día. Recharts se carga en diferido (`lazy`).
- Formatos antiguos (v1: `initialWeight`, series; v2: secciones, `partnerWeight` en series;
  entrenos sin cronómetro) se convierten en `data/normalize.ts` al migrar la BD y al importar.

### Módulo Deudas

- Rutas (`deudas/paths.ts`): `/deudas` (lista + total que me deben) y `/deudas/persona/:id`.
- Tablas: `deudas_debtors` (personas, se archivan con `archivedAt`) y `deudas_movements`
  (`type: 'debt' | 'payment'`, `amountCents`, `note`, `date`). **Dinero siempre en céntimos
  enteros**; formatear con `formatMoney(cents)` y leer con `parseMoneyToCents` (core/lib/format).
- Saldo de una persona = Σ deudas − Σ pagos (positivo = me debe; negativo = "le debes tú").
  La lista separa pendientes (de mayor a menor) y "Saldadas" (saldo 0).
- Persona: botones "Me debe" (añade deuda) y "Me paga" (pago); tocar un movimiento lo edita o borra.

### Módulo Trabajo (registro horario)

- Pestañas (`TrabajoTabs` sobre `core/components/BottomTabs`): **Fichar** (`/trabajo`) y
  **Calendario** (`/trabajo/calendario?dia=`).
- Tabla `trabajo_shifts`: `date` (día de la entrada), `startAt`, `endAt` (null = dentro),
  `breakMinutes` (comida), `note`. **Sin cronómetro**: horas = `endAt − startAt − breakMinutes`
  (`lib/time.ts` → `shiftMinutes`). Solo un tramo abierto a la vez.
- **Horario del usuario** (`lib/schedule.ts`): L–J 9:00–19:00 con 1 h de comida (9 h efectivas),
  V 9:00–15:00 sin comida (6 h); 42 h/semana. Al fichar, el primer tramo del día lleva la comida
  del horario y los siguientes 0. "Añadir horas" prerrellena entrada/salida/comida según el día.
  La comida se puede cambiar en cada registro (No / 30 min / 1 h / 1 h 30 min). Los totales de
  hoy y semana muestran "de 9 h" / "de 42 h".
- Registros sin `breakMinutes` (anteriores a la v6 de la BD o copias antiguas) se completan con
  `data/normalize.ts` (migración `upgradeTrabajoData` y al importar). Si la salida es ≤ entrada se guarda al día siguiente (turno de noche) y cuenta
  en el día de entrada.
- Fichar: botón verde "Fichar entrada" / ámbar "Fichar salida" (variante `warning` de Button),
  totales de hoy y de la semana (lunes–domingo) y registros de hoy. "Añadir horas" y tocar un
  registro abren `ShiftSheet` (día, entrada, salida, nota, borrar).
- Calendario: `core/components/MonthCalendar` con las horas de cada día dentro de la celda,
  total del mes y detalle del día elegido (añadir/editar).

### Componentes compartidos útiles para módulos nuevos

- `core/components/BottomTabs` — pestañas inferiores de un módulo.
- `core/components/MonthCalendar` (+ `monthRange`, `shiftMonth`) — calendario mensual con días
  marcados y texto por día. (El calendario de Gym es anterior y aún no lo usa.)

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
   `color` = `'bg-accent/15 text-accent'` (todas las tarjetas usan el acento morado), `path`, `routes`, `data`).
4. Añádelo al array de `src/modules/registry.ts`.
5. Si ha añadido tablas, sube `DB_VERSION` en `src/core/db/setup.ts`.
6. `npm run build` y prueba. El módulo aparece en el inicio y entra solo en la copia de seguridad.

Un módulo nunca importa de otro módulo. Lo compartido va a `src/core/`.

## Flujo de trabajo

- Commits pequeños por fase o funcionalidad, mensajes en español.
- Antes de commitear: `npm run build` sin errores.
