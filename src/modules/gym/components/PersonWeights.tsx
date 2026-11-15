import { formatKg } from '@/core/lib/format';
import { PERSON_LABEL, type Person } from '../data/types';

const DOT: Record<Person, string> = { me: 'bg-me', partner: 'bg-partner' };

/** Punto de color que identifica a la persona (siempre acompañado de su nombre). */
export function PersonDot({ person, className = '' }: { person: Person; className?: string }) {
  return <span aria-hidden className={`inline-block size-2.5 shrink-0 rounded-full ${DOT[person]} ${className}`} />;
}

export function PersonLabel({ person }: { person: Person }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <PersonDot person={person} />
      {PERSON_LABEL[person]}
    </span>
  );
}

interface Props {
  weight: number | null | undefined;
  partnerWeight: number | null | undefined;
  /** Mostrar "sin peso" si ninguno tiene valor. */
  showEmpty?: boolean;
}

/** Pastillas "● Yo 50 kg   ● Pareja 30 kg" para listas de ejercicios. */
export function WeightBadges({ weight, partnerWeight, showEmpty }: Props) {
  const items: [Person, number][] = [];
  if (weight != null) items.push(['me', weight]);
  if (partnerWeight != null) items.push(['partner', partnerWeight]);
  if (!items.length) return showEmpty ? <span className="text-sm text-muted">Sin peso</span> : null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map(([person, kg]) => (
        <span
          key={person}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-sm tabular-nums"
        >
          <PersonDot person={person} />
          <span className="text-muted">{PERSON_LABEL[person]}</span>
          <span className="font-semibold">{formatKg(kg)} kg</span>
        </span>
      ))}
    </span>
  );
}
