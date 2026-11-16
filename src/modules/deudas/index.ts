import { HandCoins } from 'lucide-react';
import type { ModuleDefinition } from '@/core/types';
import { deudasRoutes } from './routes';
import { deudasSchema } from './data/schema';
import { deudasData } from './data/backup';

export const deudasModule: ModuleDefinition = {
  id: 'deudas',
  name: 'Deudas',
  description: 'Quién te debe dinero y cuánto',
  icon: HandCoins,
  color: 'bg-accent/15 text-accent',
  path: 'deudas',
  routes: deudasRoutes,
  data: {
    schema: deudasSchema,
    ...deudasData,
  },
};
