

export type MonitoringPoint = {
  at: number;
  requestsPerSecond?: number;
  requestTotal?: number;
  inFlight?: number;
  goroutines?: number;
  residentMemoryBytes?: number;
  memAllocBytes?: number;
  schedulerRuns?: number;
  messagingInFlight?: number;
};

export const monitoringWindowLimit = 60;

export function appendMonitoringPoint(current: MonitoringPoint[], point: MonitoringPoint): MonitoringPoint[] {
  const previous = current[current.length - 1];
  let requestsPerSecond = point.requestTotal;
  if (previous && previous.requestTotal !== undefined && point.requestTotal !== undefined && point.requestTotal > previous.requestTotal) {
    const elapsedSeconds = (point.at - previous.at) / 1000;
    requestsPerSecond = elapsedSeconds > 0 ? Math.max(0, (point.requestTotal - previous.requestTotal) / elapsedSeconds) : 0;
  } else if (!previous) {
    requestsPerSecond = undefined;
  }
  const next = [...current, { ...point, requestsPerSecond }];
  if (next.length > monitoringWindowLimit) {
    return next.slice(next.length - monitoringWindowLimit);
  }
  return next;
}

export function seriesValues(points: MonitoringPoint[], field: keyof MonitoringPoint): number[] {
  return points.map((point) => Number(point[field])).filter((value) => Number.isFinite(value) && value > 0);
}