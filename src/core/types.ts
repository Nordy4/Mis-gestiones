import type { LucideIcon } from 'lucide-react';
import type { RouteObject } from 'react-router';
import type { Transaction } from 'dexie';

/** Parte de datos de un módulo: sus tablas y cómo exportarlas/importarlas. */
export interface ModuleData {
  /**
   * Tablas Dexie del módulo. Las claves DEBEN llevar el prefijo `<idModulo>_`.
   * Formato Dexie: 'id, campoIndexado, [compuesto+indice]'.
   */
  schema: Record<string, string>;
  /** Devuelve todos los datos del módulo como objeto serializable a JSON. */
  exportData(): Promise<unknown>;
  /** Sustituye todos los datos del módulo por los recibidos (formato de exportData). */
  importData(data: unknown): Promise<void>;
  /** Datos iniciales. Se ejecuta una sola vez, la primera vez que se abre la app. */
  seed?(): Promise<void>;
  /**
   * Migración de datos. Se ejecuta dentro de la transacción de Dexie cada vez que la BD
   * existente sube de versión (no en instalaciones nuevas). DEBE ser idempotente:
   * comprobar el formato de los datos en vez de suponer de qué versión vienen.
   */
  upgrade?(tx: Transaction): Promise<void>;
  /**
   * Tarea periódica del módulo (core/lib/moduleTasks.ts): al abrir la app, al volver a ella
   * y cada minuto mientras está abierta. Debe ser rápida e idempotente.
   */
  tick?(): Promise<void>;
}

/** Definición de un módulo del hub. Se registra en src/modules/registry.ts. */
export interface ModuleDefinition {
  /** Identificador único, en minúsculas y sin espacios. También es el prefijo de sus tablas. */
  id: string;
  name: string;
  description?: string;
  icon: LucideIcon;
  /** Clases Tailwind para el color de la tarjeta/icono, por defecto el acento: 'bg-accent/15 text-accent'. */
  color: string;
  /** Ruta base del módulo, sin barra inicial: 'gym'. */
  path: string;
  /** Rutas relativas a `path` ('' = pantalla principal del módulo). */
  routes: RouteObject[];
  data?: ModuleData;
}
