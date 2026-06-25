export type ChartAxisOption = {
  axisLabel?: {
    color?: string;
    formatter?: (value: number) => string;
  };
  axisLine?: { lineStyle?: { color?: string } };
  axisTick?: { show?: boolean };
  boundaryGap?: boolean;
  data?: string[];
  splitLine?: { lineStyle?: { color?: string }; show?: boolean };
  type?: "category" | "value";
};

export type ChartGridOption = {
  bottom?: number;
  containLabel?: boolean;
  left?: number;
  right?: number;
  top?: number;
};

export type ChartSeriesData = number | { value: number };

export type ChartSeriesOption = {
  areaStyle?: { opacity?: number };
  avoidLabelOverlap?: boolean;
  data: ChartSeriesData[];
  emphasis?: { disabled?: boolean };
  label?: { show?: boolean };
  name?: string;
  radius?: string | [string, string];
  showSymbol?: boolean;
  silent?: boolean;
  smooth?: boolean;
  type: "line" | "pie";
  yAxisIndex?: number;
};

export type ConsoleChartOption = {
  animation?: boolean;
  color?: string[];
  grid?: ChartGridOption;
  legend?: {
    right?: number;
    textStyle?: { color?: string };
    top?: number;
  };
  series?: ChartSeriesOption[];
  tooltip?: {
    show?: boolean;
    trigger?: "axis";
    valueFormatter?: (value: number | string) => string;
  };
  xAxis?: ChartAxisOption;
  yAxis?: ChartAxisOption | ChartAxisOption[];
};
