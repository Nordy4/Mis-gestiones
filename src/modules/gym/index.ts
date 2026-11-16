import { Dumbbell } from 'lucide-react';
import type { ModuleDefinition } from '@/core/types';
import { gymRoutes } from './routes';
import { gymSchema } from './data/schema';
import { gymData } from './data/backup';

export const gymModule: ModuleDefinition = {
  id: 'gym',
  name: 'Gym',
  description: 'Rutinas y entrenamientos',
  icon: Dumbbell,
  color: 'bg-accent/15 text-accent',
  path: 'gym',
  routes: gymRoutes,
  data: {
    schema: gymSchema,
    ...gymData,
  },
};
