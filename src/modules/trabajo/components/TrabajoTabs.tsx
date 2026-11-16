import { CalendarDays, Clock } from 'lucide-react';
import { BottomTabs } from '@/core/components/BottomTabs';
import { trabajoPaths } from '../paths';

export function TrabajoTabs() {
  return (
    <BottomTabs
      label="Secciones de Trabajo"
      tabs={[
        { to: trabajoPaths.home, label: 'Fichar', icon: Clock, end: true },
        { to: trabajoPaths.calendar(), label: 'Calendario', icon: CalendarDays },
      ]}
    />
  );
}
