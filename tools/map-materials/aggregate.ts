import type {
  MaterialAmbiguity,
  MaterialBorderCase,
  MaterialCoverage,
  MaterialDefinition,
  MaterialObservation,
} from './types.ts';

export interface MaterialAggregation {
  readonly ambiguities: readonly MaterialAmbiguity[];
  readonly cases: readonly MaterialBorderCase[];
  readonly coverage: MaterialCoverage;
}

export const DEFAULT_AMBIGUITY_MINIMUM_OCCURRENCE = 1;

export function aggregateMaterial(
  material: MaterialDefinition,
  observations: readonly MaterialObservation[],
  minimumRelevantOccurrence = DEFAULT_AMBIGUITY_MINIMUM_OCCURRENCE,
): MaterialAggregation {
  if (
    !Number.isInteger(minimumRelevantOccurrence) ||
    minimumRelevantOccurrence <= 0
  ) {
    throw new Error(
      `Ambiguity minimum occurrence must be a positive integer, got ${minimumRelevantOccurrence}`,
    );
  }

  const counts = new Map<number, Map<number, number>>();
  const allowedIds = new Set(material.serverIds);

  for (const observation of observations) {
    if (
      !Number.isInteger(observation.signature) ||
      observation.signature < 0 ||
      observation.signature > 255
    ) {
      throw new Error(
        `Material ${material.key} has invalid signature ${observation.signature}`,
      );
    }
    if (!allowedIds.has(observation.serverId)) {
      throw new Error(
        `Material ${material.key} observed server id ${observation.serverId} outside its vocabulary`,
      );
    }

    const byServerId = counts.get(observation.signature) ?? new Map();
    byServerId.set(
      observation.serverId,
      (byServerId.get(observation.serverId) ?? 0) + 1,
    );
    counts.set(observation.signature, byServerId);
  }

  const cases: MaterialBorderCase[] = [];
  const ambiguities: MaterialAmbiguity[] = [];

  for (const signature of [...counts.keys()].sort(
    (left, right) => left - right,
  )) {
    const candidates = [...(counts.get(signature) as Map<number, number>)]
      .map(([serverId, count]) => ({ count, serverId }))
      .sort(
        (left, right) =>
          right.count - left.count || left.serverId - right.serverId,
      );
    const winner = candidates[0] as {
      readonly count: number;
      readonly serverId: number;
    };
    const runnerUp = candidates[1];

    if (
      runnerUp !== undefined &&
      winner.count >= minimumRelevantOccurrence &&
      runnerUp.count >= minimumRelevantOccurrence &&
      runnerUp.count * 10 >= winner.count * 9
    ) {
      ambiguities.push({
        candidates: candidates.slice(0, 2),
        materialKey: material.key,
        message: `Ambiguous material ${material.key} for signature ${signature}: server ids ${winner.serverId} (${winner.count}) and ${runnerUp.serverId} (${runnerUp.count}) are within 10% with minimum relevant occurrence ${minimumRelevantOccurrence}`,
        signature,
      });
    }

    cases.push({
      count: winner.count,
      serverId: winner.serverId,
      signature,
    });
  }

  return {
    ambiguities,
    cases,
    coverage: {
      minimumOccurrence:
        cases.length === 0
          ? null
          : Math.min(...cases.map(({ count }) => count)),
      observedCases: cases.length,
      sampledTiles: observations.length,
      totalCases: 256,
    },
  };
}
