import { X } from 'lucide-react';
import { formatKg } from '@/core/lib/format';
import type { WorkoutSet } from '../data/types';
import { PersonLabel } from './PersonWeights';

interface Props {
  sets: WorkoutSet[];
  /** Si se pasa, cada fila tiene botón de borrar. */
  onDelete?: (id: string) => void;
}

const kg = (n: number | null | undefined) => (n == null ? '—' : formatKg(n));

/** Tabla compacta de series: nº · Yo · Pareja · Reps. */
export function SetsTable({ sets, onDelete }: Props) {
  const hasPartner = sets.some((s) => s.partnerWeight != null);
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-xs text-muted">
          <th className="w-8 py-1 text-left font-medium">#</th>
          <th className="py-1 text-left font-medium">
            <PersonLabel person="me" />
          </th>
          {hasPartner && (
            <th className="py-1 text-left font-medium">
              <PersonLabel person="partner" />
            </th>
          )}
          <th className="py-1 text-right font-medium">Reps</th>
          {onDelete && <th className="w-9" />}
        </tr>
      </thead>
      <tbody>
        {sets.map((s, i) => (
          <tr key={s.id} className="border-t border-border/50">
            <td className="py-1.5 text-muted">{i + 1}</td>
            <td className="py-1.5 font-semibold">{kg(s.weight)}</td>
            {hasPartner && <td className="py-1.5 font-semibold">{kg(s.partnerWeight)}</td>}
            <td className="py-1.5 text-right font-semibold">{s.reps}</td>
            {onDelete && (
              <td className="text-right">
                <button
                  type="button"
                  aria-label={`Borrar serie ${i + 1}`}
                  onClick={() => onDelete(s.id)}
                  className="inline-grid size-8 place-items-center rounded-full text-muted active:bg-border"
                >
                  <X className="size-4" />
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
