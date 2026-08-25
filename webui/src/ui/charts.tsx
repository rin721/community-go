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