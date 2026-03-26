'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './chart.css';

// ── Shared theme ──
const GRID_STROKE = 'rgba(255,255,255,0.06)';
const AXIS_STROKE = 'rgba(255,255,255,0.4)';
const AXIS_FONT = 12;
const TOOLTIP_STYLE = {
  background: '#1a1625',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#fff',
};

// ── Types ──

export interface ChartSeries {
  dataKey: string;
  label: string;
  color: string;
  /** For area charts: fill opacity (default 0.35) */
  fillOpacity?: number;
  /** Stack group ID — series with the same stackId are stacked */
  stackId?: string;
  /** Bar radius [topLeft, topRight, bottomLeft, bottomRight] */
  radius?: [number, number, number, number];
}

export interface ChartProps {
  /** 'area' | 'bar' */
  type: 'area' | 'bar';
  /** Data array — each item must have a key matching xKey + series dataKeys */
  data: Record<string, any>[];
  /** Key used for x-axis (default: 'date') */
  xKey?: string;
  /** Series definitions */
  series: ChartSeries[];
  /** Chart height in px (default: 300) */
  height?: number;
  /** Format x-axis tick labels */
  xTickFormatter?: (value: string) => string;
  /** Format y-axis tick labels */
  yTickFormatter?: (value: number) => string;
  /** Format tooltip label (top line) */
  tooltipLabelFormatter?: (label: string) => string;
  /** Format tooltip value — receives (value, seriesDataKey) → [displayValue, displayLabel] */
  tooltipValueFormatter?: (value: number, dataKey: string) => [string | number, string];
  /** Hide y-axis decimals (default: false) */
  yIntegersOnly?: boolean;
}

/** Reusable chart component wrapping Recharts with consistent dark-theme styling. */
export function Chart({
  type,
  data,
  xKey = 'date',
  series,
  height = 300,
  xTickFormatter,
  yTickFormatter,
  tooltipLabelFormatter,
  tooltipValueFormatter,
  yIntegersOnly = false,
}: ChartProps) {
  // Build legend label map from series
  const labelMap: Record<string, string> = {};
  for (const s of series) {
    labelMap[s.dataKey] = s.label;
  }

  const legendFormatter = (value: string) => labelMap[value] ?? value;

  const tooltipFormatter = tooltipValueFormatter
    ? ((value: number, name: string) => tooltipValueFormatter(value, name)) as any
    : ((value: number, name: string) => [value, labelMap[name] ?? name]) as any;

  const tooltipLabel = tooltipLabelFormatter
    ? ((label: string) => tooltipLabelFormatter(label)) as any
    : undefined;

  const sharedProps = {
    data,
  };

  const xAxisProps = {
    dataKey: xKey,
    tickFormatter: xTickFormatter,
    stroke: AXIS_STROKE,
    fontSize: AXIS_FONT,
  };

  const yAxisProps = {
    stroke: AXIS_STROKE,
    fontSize: AXIS_FONT,
    tickFormatter: yTickFormatter,
    allowDecimals: !yIntegersOnly,
  };

  const tooltipProps = {
    contentStyle: TOOLTIP_STYLE,
    labelFormatter: tooltipLabel,
    formatter: tooltipFormatter,
  };

  const renderInner = () => {
    if (type === 'area') {
      return (
        <AreaChart {...sharedProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip {...tooltipProps} />
          <Legend formatter={legendFormatter} />
          {series.map((s) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              stackId={s.stackId}
              stroke={s.color}
              fill={s.color}
              fillOpacity={s.fillOpacity ?? 0.35}
            />
          ))}
        </AreaChart>
      );
    }

    return (
      <BarChart {...sharedProps}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis {...xAxisProps} />
        <YAxis {...yAxisProps} />
        <Tooltip {...tooltipProps} />
        <Legend formatter={legendFormatter} />
        {series.map((s) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            stackId={s.stackId}
            fill={s.color}
            radius={s.radius}
          />
        ))}
      </BarChart>
    );
  };

  return (
    <div className="ew-chart">
      <ResponsiveContainer width="100%" height={height}>
        {renderInner()}
      </ResponsiveContainer>
    </div>
  );
}

// ── Convenience wrapper: section card with title + empty state ──

export interface ChartSectionProps extends ChartProps {
  title: string;
  emptyText?: string;
}

export function ChartSection({ title, emptyText = 'Brak danych w wybranym okresie', data, ...rest }: ChartSectionProps) {
  return (
    <section className="analytics-section">
      <h2 className="analytics-section__title">{title}</h2>
      {data.length > 0 ? (
        <Chart data={data} {...rest} />
      ) : (
        <p className="analytics-empty">{emptyText}</p>
      )}
    </section>
  );
}
