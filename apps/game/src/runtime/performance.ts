const shellActionableMark = 'huntbound:shell-actionable';

interface PerformanceMarkLike {
  readonly name: string;
  readonly startTime: number;
}

export function readShellActionableDuration(
  entries: readonly PerformanceMarkLike[],
): number {
  const marks = entries.filter((entry) => entry.name === shellActionableMark);

  if (marks.length === 0) {
    throw new Error(`${shellActionableMark} mark is missing.`);
  }

  if (marks.length > 1) {
    throw new Error(`${shellActionableMark} mark must be unique.`);
  }

  const [mark] = marks;

  if (!mark) {
    throw new Error(`${shellActionableMark} mark is missing.`);
  }

  if (!Number.isFinite(mark.startTime) || mark.startTime < 0) {
    throw new Error(`${shellActionableMark} duration is invalid.`);
  }

  return mark.startTime;
}
