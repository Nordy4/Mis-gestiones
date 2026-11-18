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

/** Lo que se pide a la IA para generar una ruta. */
export interface AiRouteRequest {
  start: string;
  /** Vacío = ruta circular (vuelve al inicio). */
  end: string;
  /** Duración deseada en marcha, en minutos. */
  minutes: number;
  /** Preferencias libres ("pasar por Montseny", "evitar Barcelona"…). */
  notes: string;
}

/** Ruta generada por la IA (Edge Function `route-ai`). No se guarda hasta que pulsas Guardar. */
export interface AiRoute {
  name: string;
  summary: string;
  start: string;
  end: string | null;
  targetMinutes: number;
  /** Calculado con OpenRouteService pasando por las paradas (null si no se pudo calcular). */
  minutes: number | null;
  km: number | null;
  stops: { name: string; road: string }[];
  /** Enlace de Google Maps con las paradas. */
  url: string;
}

export interface RutasExport {
  routes: MotoRoute[];
}
