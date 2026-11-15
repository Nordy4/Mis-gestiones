import { Dumbbell } from 'lucide-react';
import type { ModuleDefinition } from '@/core/types';
import { gymRoutes } from './routes';

export const gymModule: ModuleDefinition = {
  id: 'gym',
  name: 'Gym',
  description: 'Rutinas y entrenamientos',
  icon: Dumbbell,
  color: 'bg-emerald-500/15 text-emerald-400',
  path: 'gym',
  routes: gymRoutes,
};
