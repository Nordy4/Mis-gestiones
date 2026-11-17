import { Repeat } from 'lucide-react';
import type { ModuleDefinition } from '@/core/types';
import { gastosRoutes } from './routes';
import { gastosSchema } from './data/schema';
import { gastosData } from './data/backup';

export const gastosModule: ModuleDefinition = {
  id: 'gastos',
  name: 'Gastos fijos',
  description: 'Suscripciones y pagos periódicos',
  icon: Repeat,
  color: 'bg-accent/15 text-accent',
  path: 'gastos',
  routes: gastosRoutes,
  data: {
    schema: gastosSchema,
    ...gastosData,
  },
};
