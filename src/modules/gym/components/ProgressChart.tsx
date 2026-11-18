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

export interface ProgressRow {
  date: string;
  [seriesKey: string]: number | string | null;
}

export interface ProgressSeries {
  key: string;
  label: string;
  /** Color de la línea (valor hex: Recharts no entiende clases). */
  color: string;
}

interface Props {
  data: ProgressRow[];
  series: ProgressSeries[];
  unit: string;
}

// Colores sólidos equivalentes a los tokens de tema (ver src/index.css; Recharts necesita hex).
const SURFACE = '#22222a';
const GRID = '#2c2c34';
const MUTED = '#a6a6b2';

function ChartTooltip({
  active,
  payload,
  series,
  unit,
}: TooltipContentProps & { series: ProgressSeries[]; unit: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ProgressRow;
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm shadow-lg">
      <div className="mb-1 text-xs text-muted">{formatDateLong(row.date)}</div>
      {series.map((s) => {
        const v = row[s.key];
        if (typeof v !== 'number') return null;
        return (
          <div key={s.key} className="flex items-center gap-2 tabular-nums">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-muted">{s.label}</span>
            <span className="ml-auto pl-3 font-semibold">
              {formatKg(v)} {unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Evolución por fecha. Con 2+ series muestra leyenda (la identidad nunca depende solo del color). */
/** Eje Y con marcas "redondas" (paso 1, 2.5, 5, 10, 20… y como mucho ~6 marcas). */
function niceAxis(data: ProgressRow[], series: ProgressSeries[]) {
  const values = data.flatMap((row) => series.map((s) => row[s.key])).filter((v): v is number => typeof v === 'number');
  if (!values.length) return { domain: [0, 10] as [number, number], ticks: [0, 5, 10] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = [1, 2.5, 5, 10, 20, 25, 50, 100].find((s) => (max - min + 2 * s) / s <= 5) ?? 100;
  const lo = Math.max(0, Math.floor(min / step) * step - step);
  const hi = Math.ceil(max / step) * step + step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
  return { domain: [lo, hi] as [number, number], ticks };
}

export default function ProgressChart({ data, series, unit }: Props) {
  const axis = niceAxis(data, series);
  return (
    <div>
      {series.length > 1 && (
        <ul className="mb-2 flex gap-4 px-1 text-xs text-muted">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
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
              domain={axis.domain}
              ticks={axis.ticks}
              allowDecimals
              tickFormatter={(v: number) => formatKg(v)}
            />
            <Tooltip
              content={(props) => <ChartTooltip {...(props as TooltipContentProps)} series={series} unit={unit} />}
              cursor={{ stroke: MUTED, strokeDasharray: '3 3' }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                connectNulls
                dot={{ r: 4, fill: s.color, stroke: SURFACE, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: s.color, stroke: SURFACE, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
