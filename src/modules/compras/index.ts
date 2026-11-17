import { ShoppingBag } from 'lucide-react';
import type { ModuleDefinition } from '@/core/types';
import { comprasRoutes } from './routes';
import { comprasSchema } from './data/schema';
import { comprasData } from './data/backup';

export const comprasModule: ModuleDefinition = {
  id: 'compras',
  name: 'Compras',
  description: 'Productos guardados para más adelante',
  icon: ShoppingBag,
  color: 'bg-accent/15 text-accent',
  path: 'compras',
  routes: comprasRoutes,
  // Recibe los enlaces que compartes desde otras apps (Android → Compartir → Mi Vida).
  shareTarget: '',
  data: {
    schema: comprasSchema,
    ...comprasData,
  },
};
