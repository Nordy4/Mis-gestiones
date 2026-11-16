import { Briefcase } from 'lucide-react';
import type { ModuleDefinition } from '@/core/types';
import { trabajoRoutes } from './routes';
import { trabajoSchema } from './data/schema';
import { trabajoData } from './data/backup';

export const trabajoModule: ModuleDefinition = {
  id: 'trabajo',
  name: 'Trabajo',
  description: 'Fichar entrada y salida, horas por día',
  icon: Briefcase,
  color: 'bg-sky-500/15 text-sky-300',
  path: 'trabajo',
  routes: trabajoRoutes,
  data: {
    schema: trabajoSchema,
    ...trabajoData,
  },
};
