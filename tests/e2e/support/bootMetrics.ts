export interface BootResourceMetric {
  readonly name: string;
  readonly initiatorType: string;
  readonly startTime: number;
  readonly duration: number;
  readonly transferSize: number;
  readonly encodedBodySize: number;
  readonly decodedBodySize: number;
}

export interface BootNavigationMetric {
  readonly responseStart: number;
  readonly responseEnd: number;
  readonly domInteractive: number;
  readonly domContentLoadedEventEnd: number;
  readonly loadEventEnd: number;
}

export function criticalResources(
  resources: readonly BootResourceMetric[],
): BootResourceMetric[] {
  return [...resources]
    .sort((left, right) => right.duration - left.duration)
    .slice(0, 5);
}
