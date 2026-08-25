// 自研轻量 SVG 图表原语（081）：面向基础时序报表与状态图，零第三方依赖，
// 可测试（aria-label/role=img）、可被任意 WebUI 模块复用。复杂交互图表
// （缩放/联动/大数据集）出现时再评估引入成熟图表库。
import { useId } from "react";

function pointPath(values: number[], width: number, height: number, padding: number): string {
  const count = values.length;
  if (count === 0) return "";
  let min = values[0];
  let max = values[0];
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const span = max - min;
  const usableHeight = Math.max(1, height - padding * 2);
  const usableWidth = Math.max(1, width - padding * 2);
  const points = values.map((value, index) => {
    const x = padding + (count === 1 ? usableWidth / 2 : (index / (count - 1)) * usableWidth);
    const normalized = span === 0 ? 0.5 : (value - min) / span;
    const y = padding + (1 - normalized) * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M ${points.join(" L ")}`;
}

function chartClass(base: string, className: string | undefined): string {
  return `${base} ${className ?? ""}`.trim();
}

// Sparkline 是单系列迷你折线（无坐标轴），用于状态卡内的趋势微缩图。
export function Sparkline({ values, width = 120, height = 32, ariaLabel, stroke = "currentColor", className }: { values: number[]; width?: number; height?: number; ariaLabel: string; stroke?: string; className?: string }) {
  const id = useId();
  if (values.length === 0) {
    return <span className="chart-empty" data-chart="sparkline" role="img" aria-label={ariaLabel}>—</span>;
  }
  return <svg className={chartClass("chart-sparkline", className)} data-chart="sparkline" width={width} height={height} role="img" aria-label={ariaLabel} aria-describedby={id}>
    <title id={id}>{ariaLabel}</title>
    <path d={pointPath(values, width, height, 2)} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
  </svg>;
}

export type ChartSeries = { label: string; values: number[]; stroke?: string };

// LineChart 是多系列折线图（同一值域规范化），用于监控时序报表图。
export function LineChart({ series, width = 320, height = 96, ariaLabel, className }: { series: ChartSeries[]; width?: number; height?: number; ariaLabel: string; className?: string }) {
  const id = useId();
  const active = series.filter((item) => item.values.length > 0);
  if (active.length === 0) {
    return <span className="chart-empty" data-chart="linechart" role="img" aria-label={ariaLabel}>—</span>;
  }
  return <svg className={chartClass("chart-line", className)} data-chart="linechart" width={width} height={height} role="img" aria-label={ariaLabel} aria-describedby={`${id}-legend`}>
    <title id={id}>{ariaLabel}</title>
    <g id={`${id}-legend`} className="chart-legend">
      {active.map((item, index) => (
        <text key={item.label} x={8} y={14 + index * 14} fontSize={10} fill={item.stroke ?? "currentColor"}>{`${item.label} (${item.values[item.values.length - 1]})`}</text>
      ))}
    </g>
    {active.map((item) => (
      <path key={item.label} d={pointPath(item.values, width, height, 12)} fill="none" stroke={item.stroke ?? "currentColor"} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    ))}
  </svg>;
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function formatAxisValue(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(1);
}

// AxisLineChart 是带坐标轴的多系列时序图（081 人因返工）：y 刻度、x 时间
// 标签、网格与图例，适合仪表盘的主趋势图。
export function AxisLineChart({ series, width = 380, height = 150, ariaLabel, timeLabels, className }: { series: ChartSeries[]; width?: number; height?: number; ariaLabel: string; timeLabels?: string[]; className?: string }) {
  const id = useId();
  const active = series.filter((item) => item.values.length > 0);
  if (active.length === 0) {
    return <span className="chart-empty" data-chart="axisline" role="img" aria-label={ariaLabel}>—</span>;
  }
  const allValues = active.flatMap((item) => item.values);
  const peak = Math.max(...allValues);
  const ceiling = niceMax(peak);
  const plotLeft = 34;
  const plotBottom = 20;
  const plotTop = 10;
  const plotRight = 8;
  const plotWidth = Math.max(1, width - plotLeft - plotRight);
  const plotHeight = Math.max(1, height - plotTop - plotBottom);
  const scale = (value: number) => plotTop + (1 - value / ceiling) * plotHeight;
  const path = (values: number[]) => {
    const points = values.map((value, index) => `${(plotLeft + (values.length === 1 ? plotWidth / 2 : (index / (values.length - 1)) * plotWidth)).toFixed(1)},${scale(value).toFixed(1)}`);
    return `M ${points.join(" L ")}`;
  };
  const yTicks = [ceiling, ceiling / 2, 0];
  return <svg className={chartClass("chart-axis", className)} data-chart="axisline" width={width} height={height} role="img" aria-label={ariaLabel} aria-describedby={`${id}-legend`}>
    <title id={id}>{ariaLabel}</title>
    <g className="chart-grid" stroke="currentColor" strokeOpacity={0.12}>
      {yTicks.map((tick) => <line key={tick} x1={plotLeft} x2={width - plotRight} y1={scale(tick)} y2={scale(tick)} />)}
    </g>
    {yTicks.map((tick) => <text key={tick} x={0} y={scale(tick) + 3} fontSize={9} fill="currentColor" fillOpacity={0.6}>{formatAxisValue(tick)}</text>)}
    {timeLabels && timeLabels.length === valuesCount(active) && timeLabels.length > 1 && <>
      <text x={plotLeft} y={height - 4} fontSize={9} fill="currentColor" fillOpacity={0.6}>{timeLabels[0]}</text>
      <text x={width - plotRight} y={height - 4} fontSize={9} textAnchor="end" fill="currentColor" fillOpacity={0.6}>{timeLabels[timeLabels.length - 1]}</text>
    </>}
    <g id={`${id}-legend`} className="chart-legend">
      {active.map((item, index) => (
        <text key={item.label} x={plotLeft} y={12 + index * 12} fontSize={9} fill={item.stroke ?? "currentColor"}>{`${item.label} ${formatAxisValue(item.values[item.values.length - 1])}`}</text>
      ))}
    </g>
    {active.map((item) => (
      <path key={item.label} d={path(item.values)} fill="none" stroke={item.stroke ?? "currentColor"} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    ))}
  </svg>;
}

function valuesCount(series: ChartSeries[]): number {
  return series.length > 0 ? series[0].values.length : 0;
}