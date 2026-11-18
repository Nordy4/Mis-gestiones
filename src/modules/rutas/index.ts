import { Route } from 'lucide-react';
import type { ModuleDefinition } from '@/core/types';
import { isGoogleMapsUrl } from '@/core/lib/links';
import { rutasRoutes } from './routes';
import { rutasSchema } from './data/schema';
import { rutasData } from './data/backup';

export const rutasModule: ModuleDefinition = {
  id: 'rutas',
  name: 'Rutas',
  description: 'Mis rutas en moto de Google Maps',
  icon: Route,
  color: 'bg-accent/15 text-accent',
  path: 'rutas',
  routes: rutasRoutes,
  // Lo que compartes desde Google Maps llega aquí (el resto de enlaces, a Compras).
  shareTarget: { path: '', accepts: (shared) => isGoogleMapsUrl(shared.link) },
  data: {
    schema: rutasSchema,
    ...rutasData,
  },
};
