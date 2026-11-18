import type { MotoRoute, MotoRouteInput, RutasExport } from './types';

/**
 * Contrato de acceso a datos del módulo Rutas.
 * Las pantallas no lo usan directamente: pasan por `hooks.ts`.
 */
export interface RutasRepository {
  /** Rutas activas (sin archivar), por nombre. */
  listRoutes(): Promise<MotoRoute[]>;
  addRoute(input: MotoRouteInput): Promise<MotoRoute>;
  updateRoute(id: string, input: MotoRouteInput): Promise<void>;
  /** Archiva la ruta (deja de verse). */
  archiveRoute(id: string): Promise<void>;

  exportAll(): Promise<RutasExport>;
  importAll(data: RutasExport): Promise<void>;
}
