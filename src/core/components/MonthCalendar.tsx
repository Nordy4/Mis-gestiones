import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateLong, todayKey } from '@/core/lib/format';
import { IconButton } from './Button';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const pad = (n: number) => String(n).padStart(2, '0');

export interface CalendarMonth {
  year: number;
  /** 0 = enero */
  month: number;
}

/** Primer y último día (YYYY-MM-DD) de un mes, para consultar datos. */
export function monthRange({ year, month }: CalendarMonth) {
  const last = new Date(year, month + 1, 0).getDate();
  return { from: `${year}-${pad(month + 1)}-01`, to: `${year}-${pad(month + 1)}-${pad(last)}` };
}

export function shiftMonth({ year, month }: CalendarMonth, delta: number): CalendarMonth {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

interface Props {
  month: CalendarMonth;
  onMonthChange: (m: CalendarMonth) => void;
  selected: string;
  onSelect: (day: string) => void;
  /** Días marcados (con datos). */
  isMarked?: (day: string) => boolean;
  /** Texto pequeño bajo el número del día (p. ej. "7,5"). */
  renderDetail?: (day: string) => ReactNode;
  /** Texto para lectores de pantalla además de la fecha. */
  describeDay?: (day: string) => string | undefined;
  /** Pie del calendario (totales del mes…). */
  footer?: ReactNode;
}

/** Calendario mensual (semana empieza en lunes) con días marcados y seleccionables. */
export function MonthCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  isMarked,
  renderDetail,
  describeDay,
  footer,
}: Props) {
  const today = todayKey();
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const firstWeekday = (new Date(month.year, month.month, 1).getDay() + 6) % 7;
  const label = new Date(month.year, month.month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <section className="rounded-2xl border border-border/60 bg-surface p-3">
      <div className="mb-2 flex items-center">
        <IconButton label="Mes anterior" onClick={() => onMonthChange(shiftMonth(month, -1))}>
          <ChevronLeft className="size-5" />
        </IconButton>
        <h2 className="flex-1 text-center font-semibold first-letter:uppercase">{label}</h2>
        <IconButton label="Mes siguiente" onClick={() => onMonthChange(shiftMonth(month, 1))}>
          <ChevronRight className="size-5" />
        </IconButton>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-xs font-medium text-muted">
            {d}
          </div>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = `${month.year}-${pad(month.month + 1)}-${pad(i + 1)}`;
          const marked = isMarked?.(day) ?? false;
          const detail = renderDetail?.(day);
          const extra = describeDay?.(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-label={`${formatDateLong(day)}${extra ? `, ${extra}` : ''}`}
              aria-pressed={day === selected}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm tabular-nums ${
                marked ? 'bg-accent font-bold text-black' : 'text-text active:bg-surface-2'
              } ${day === selected ? 'ring-2 ring-text ring-offset-2 ring-offset-surface' : ''} ${
                day === today && !marked ? 'font-bold text-accent' : ''
              }`}
            >
              <span className="leading-none">{i + 1}</span>
              {detail != null && <span className="mt-0.5 text-[10px] leading-none font-semibold">{detail}</span>}
            </button>
          );
        })}
      </div>

      {footer && <div className="mt-3 border-t border-border/50 pt-3 text-center text-sm text-muted">{footer}</div>}
    </section>
  );
}
