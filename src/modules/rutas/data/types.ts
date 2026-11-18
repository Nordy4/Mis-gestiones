/** Una ruta en moto diseñada en Google Maps. */
export interface MotoRoute {
  id: string;
  name: string;
  /** Enlace de Google Maps (o cualquier http(s)). */
  url: string;
  /** Borrado: se archiva para no perder historial. */
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MotoRouteInput {
  name: string;
  url: string;
}

export interface RutasExport {
  routes: MotoRoute[];
}
