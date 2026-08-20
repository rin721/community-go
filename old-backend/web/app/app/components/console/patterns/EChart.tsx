import { useMemo, type ReactNode } from "react";

import { cn } from "~/lib/cn";
import type { ChartSeriesOption, ConsoleChartOption } from "~/lib/charts/types";

type EChartProps = {
  ariaLabel: string;
  className?: string;
  loading?: boolean;
  loadingLabel?: string;
  option: ConsoleChartOption;
};

export function EChart({
  ariaLabel,
  className,
  loading = false,
  loadingLabel,
  option,
}: EChartProps) {
  const chart = useMemo(() => renderChart(option), [option]);

  return (
    <div
      aria-busy={loading ? "true" : "false"}
      aria-label={ariaLabel}
      className={cn("console-echart", className)}
      role="img"
    >
      {loading && loadingLabel ? (
        <span className="console-chart-loading">{loadingLabel}</span>
      ) : null}
      <svg
        aria-hidden="true"
        className="console-chart-svg"
        preserveAspectRatio={chart.preserveAspectRatio}
        viewBox={chart.viewBox}
      >
        {chart.nodes}
      </svg>
    </div>
  );
}

type RenderedChart = {
  nodes: ReactNode;
  preserveAspectRatio: string;
  viewBox: string;
};

const defaultColors = [
  "var(--console-color-brand-primary)",
  "var(--console-color-state-success)",
  "var(--console-color-state-warning)",
  "var(--console-color-state-danger)",
];
const lineViewBox = { height: 320, width: 640 };
const pieViewBox = { height: 200, width: 200 };

function renderChart(option: ConsoleChartOption): RenderedChart {
  const series = option.series ?? [];
  if (series.some((item) => item.type === "pie")) {
    return {
      nodes: renderPieChart(
        series.find((item) => item.type === "pie"),
        option.color ?? defaultColors,
      ),
      preserveAspectRatio: "xMidYMid meet",
      viewBox: `0 0 ${pieViewBox.width} ${pieViewBox.height}`,
    };
  }

  return {
    nodes: renderLineChart(
      series.filter((item) => item.type === "line"),
      option,
    ),
    preserveAspectRatio: "none",
    viewBox: `0 0 ${lineViewBox.width} ${lineViewBox.height}`,
  };
}

function renderPieChart(series: ChartSeriesOption | undefined, colors: string[]) {
  const data = series?.data.map(chartValue) ?? [];
  const total = data.reduce((sum, value) => sum + value, 0);
  const center = 100;
  const outerRadius = 82;
  const innerRadius = 64;
  let cursor = -90;

  if (total <= 0) {
    return (
      <circle
        cx={center}
        cy={center}
        fill="none"
        r={innerRadius}
        stroke="var(--console-color-border-subtle)"
        strokeWidth="18"
      />
    );
  }

  return (
    <g>
      {data.map((value, index) => {
        const degrees = (value / total) * 360;
        const path = donutArcPath(
          center,
          center,
          innerRadius,
          outerRadius,
          cursor,
          cursor + degrees,
        );
        cursor += degrees;
        return <path d={path} fill={colors[index % colors.length]} key={`${index}-${value}`} />;
      })}
    </g>
  );
}

function renderLineChart(series: ChartSeriesOption[], option: ConsoleChartOption) {
  if (series.length === 0 || series.every((item) => item.data.length === 0)) {
    return null;
  }

  const colors = option.color ?? defaultColors;
  const grid = {
    bottom: option.grid?.bottom ?? 34,
    left: option.grid?.left ?? 42,
    right: option.grid?.right ?? 18,
    top: option.grid?.top ?? 38,
  };
  const plot = {
    height: lineViewBox.height - grid.top - grid.bottom,
    width: lineViewBox.width - grid.left - grid.right,
  };
  const domains = domainsByAxis(series);
  const xLabels = option.xAxis?.data ?? [];
  const ticks = lineTicks(domains.get(0) ?? [0, 1]);

  return (
    <g>
      {ticks.map((value) => {
        const y = lineY(value, domains.get(0) ?? [0, 1], grid, plot.height);
        return (
          <g key={value}>
            <line
              className="console-chart-grid-line"
              x1={grid.left}
              x2={grid.left + plot.width}
              y1={y}
              y2={y}
            />
            <text
              className="console-chart-axis-label"
              x={grid.left - 10}
              y={y + 4}
              textAnchor="end"
            >
              {formatAxisLabel(value, option.yAxis)}
            </text>
          </g>
        );
      })}
      <line
        className="console-chart-axis-line"
        x1={grid.left}
        x2={grid.left + plot.width}
        y1={grid.top + plot.height}
        y2={grid.top + plot.height}
      />
      {xAxisLabels(xLabels).map(({ index, label }) => (
        <text
          className="console-chart-axis-label"
          key={`${index}-${label}`}
          x={lineX(index, Math.max(1, xLabels.length), grid, plot.width)}
          y={lineViewBox.height - 10}
          textAnchor={index === 0 ? "start" : index === xLabels.length - 1 ? "end" : "middle"}
        >
          {label}
        </text>
      ))}
      {series.map((item, index) => {
        const domain = domains.get(item.yAxisIndex ?? 0) ?? [0, 1];
        const points = item.data
          .map(chartValue)
          .map(
            (value, pointIndex) =>
              [
                lineX(pointIndex, item.data.length, grid, plot.width),
                lineY(value, domain, grid, plot.height),
              ] as const,
          );
        const line = points.map(([x, y]) => `${x},${y}`).join(" ");
        const color = colors[index % colors.length];
        const baseline = grid.top + plot.height;
        const area = points.length
          ? `${points[0][0]},${baseline} ${line} ${points[points.length - 1][0]},${baseline}`
          : "";
        return (
          <g key={item.name ?? index}>
            {item.areaStyle && area ? (
              <polygon fill={color} opacity={item.areaStyle.opacity ?? 0.14} points={area} />
            ) : null}
            <polyline className="console-chart-line" fill="none" points={line} stroke={color} />
          </g>
        );
      })}
      {renderLegend(series, colors, option.legend?.textStyle?.color)}
    </g>
  );
}

function renderLegend(series: ChartSeriesOption[], colors: string[], textColor?: string) {
  let x = 12;
  return (
    <g>
      {series.map((item, index) => {
        const label = item.name ?? "";
        const width = Math.max(64, label.length * 8 + 28);
        const node = (
          <g key={label || index} transform={`translate(${x}, 16)`}>
            <line
              stroke={colors[index % colors.length]}
              strokeLinecap="round"
              strokeWidth="3"
              x1="0"
              x2="18"
              y1="0"
              y2="0"
            />
            <text className="console-chart-legend-label" fill={textColor} x="26" y="4">
              {label}
            </text>
          </g>
        );
        x += width;
        return node;
      })}
    </g>
  );
}

function domainsByAxis(series: ChartSeriesOption[]) {
  const values = new Map<number, number[]>();
  for (const item of series) {
    const axis = item.yAxisIndex ?? 0;
    values.set(axis, [...(values.get(axis) ?? []), ...item.data.map(chartValue)]);
  }
  const domains = new Map<number, [number, number]>();
  for (const [axis, axisValues] of values.entries()) {
    const min = Math.min(0, ...axisValues);
    const max = Math.max(...axisValues, 1);
    domains.set(axis, min === max ? [min, min + 1] : [min, max]);
  }
  return domains;
}

function lineTicks([min, max]: [number, number]) {
  return [0, 0.25, 0.5, 0.75, 1].map((ratio) => min + (max - min) * ratio);
}

function lineX(index: number, count: number, grid: { left: number }, width: number) {
  if (count <= 1) {
    return grid.left + width / 2;
  }
  return grid.left + (width * index) / (count - 1);
}

function lineY(value: number, [min, max]: [number, number], grid: { top: number }, height: number) {
  return grid.top + height - ((value - min) / (max - min || 1)) * height;
}

function xAxisLabels(labels: string[]) {
  if (labels.length <= 3) {
    return labels.map((label, index) => ({ index, label: shortLabel(label) }));
  }
  const middle = Math.floor((labels.length - 1) / 2);
  return [0, middle, labels.length - 1].map((index) => ({
    index,
    label: shortLabel(labels[index]),
  }));
}

function formatAxisLabel(value: number, yAxis: ConsoleChartOption["yAxis"]) {
  const axis = Array.isArray(yAxis) ? yAxis[0] : yAxis;
  return axis?.axisLabel?.formatter
    ? axis.axisLabel.formatter(value)
    : new Intl.NumberFormat().format(value);
}

function chartValue(value: ChartSeriesOption["data"][number]) {
  return typeof value === "number" ? value : value.value;
}

function shortLabel(label = "") {
  return label.length > 12 ? `${label.slice(0, 11)}...` : label;
}

function donutArcPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polar(cx, cy, outerRadius, startAngle);
  const outerEnd = polar(cx, cy, outerRadius, endAngle);
  const innerStart = polar(cx, cy, innerRadius, endAngle);
  const innerEnd = polar(cx, cy, innerRadius, startAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

function polar(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}
