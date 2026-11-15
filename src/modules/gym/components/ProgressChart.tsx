import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { formatDateLong, formatDateShort, formatKg } from '@/core/lib/format';

export interface ProgressPoint {
  date: string;
  value: number;
}

interface Props {
  data: ProgressPoint[];
  unit: string;
}

// Tokens de tema (ver src/index.css). Recharts necesita valores, no clases.
const ACCENT = '#10b981';
const SURFACE = '#18181b';
const GRID = '#27272a';
const MUTED = '#a1a1aa';

function ChartTooltip({ active, payload, unit }: TooltipContentProps & { unit: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as ProgressPoint;
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm shadow-lg">
      <div className="text-xs text-muted">{formatDateLong(p.date)}</div>
      <div className="font-semibold tabular-nums">
        {formatKg(p.value)} {unit}
      </div>
    </div>
  );
}

/** Evolución de un valor por fecha (una serie: el título de la sección la nombra, sin leyenda). */
export default function ProgressChart({ data, unit }: Props) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            stroke={MUTED}
            tick={{ fontSize: 11, fill: MUTED }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            stroke={MUTED}
            tick={{ fontSize: 11, fill: MUTED }}
            tickLine={false}
            axisLine={false}
            width={48}
            domain={['dataMin - 5', 'dataMax + 5']}
            allowDecimals
            tickFormatter={(v: number) => formatKg(v)}
          />
          <Tooltip
            content={(props) => <ChartTooltip {...(props as TooltipContentProps)} unit={unit} />}
            cursor={{ stroke: MUTED, strokeDasharray: '3 3' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={ACCENT}
            strokeWidth={2}
            dot={{ r: 4, fill: ACCENT, stroke: SURFACE, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: ACCENT, stroke: SURFACE, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
