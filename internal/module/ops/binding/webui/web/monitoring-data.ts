export type MonitoringPoint = {
  at: number;
  requestsPerSecond?: number;
  requestTotal?: number;
  inFlight?: number;
  goroutines?: number;
  residentMemoryBytes?: number;
  memAllocBytes?: number;
  memSysBytes?: number;
  cpuSecondsTotal?: number;
  cpuPercent?: number;
  schedulerRuns?: number;
  messagingInFlight?: number;
};

export const monitoringWindowLimit = 60;

// appendMonitoringPoint appends a sample and derives per-second rates from the
// delta between consecutive totals (requests and process CPU time). The window
// is capped to the configured limit.
export function appendMonitoringPoint(current: MonitoringPoint[], point: MonitoringPoint): MonitoringPoint[] {
  const previous = current[current.length - 1];
  let requestsPerSecond = point.requestTotal;
  let cpuPercent = point.cpuSecondsTotal;
  if (previous) {
    const elapsedSeconds = (point.at - previous.at) / 1000;
    if (elapsedSeconds > 0) {
      if (previous.requestTotal !== undefined && point.requestTotal !== undefined && point.requestTotal > previous.requestTotal) {
        requestsPerSecond = Math.max(0, (point.requestTotal - previous.requestTotal) / elapsedSeconds);
      }
      if (previous.cpuSecondsTotal !== undefined && point.cpuSecondsTotal !== undefined && point.cpuSecondsTotal >= previous.cpuSecondsTotal) {
        cpuPercent = Math.min(800, ((point.cpuSecondsTotal - previous.cpuSecondsTotal) / elapsedSeconds) * 100);
      }
    }
  } else {
    requestsPerSecond = undefined;
    cpuPercent = undefined;
  }
  const next = [...current, { ...point, requestsPerSecond, cpuPercent }];
  if (next.length > monitoringWindowLimit) {
    return next.slice(next.length - monitoringWindowLimit);
  }
  return next;
}

export function seriesValues(points: MonitoringPoint[], field: keyof MonitoringPoint): number[] {
  return points.map((point) => Number(point[field])).filter((value) => Number.isFinite(value) && value > 0);
}