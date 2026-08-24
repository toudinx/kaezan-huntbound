import type { MaterialBordersTable } from './types.ts';

export const MATERIAL_BORDERS_SCHEMA_VERSION = 1;

export function encodeMaterialBordersTable(
  table: MaterialBordersTable,
): string {
  const materials = [...table.materials]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((material) => {
      const ambiguities = [...material.ambiguities]
        .sort((left, right) => left.signature - right.signature)
        .map((ambiguity) =>
          JSON.stringify({
            candidates: [...ambiguity.candidates]
              .sort(
                (left, right) =>
                  right.count - left.count || left.serverId - right.serverId,
              )
              .map((candidate) => ({
                count: candidate.count,
                serverId: candidate.serverId,
              })),
            materialKey: ambiguity.materialKey,
            message: ambiguity.message,
            signature: ambiguity.signature,
          }),
        )
        .join(',');
      const cases = [...material.cases]
        .sort((left, right) => left.signature - right.signature)
        .map((entry) =>
          JSON.stringify({
            count: entry.count,
            serverId: entry.serverId,
            signature: entry.signature,
          }),
        )
        .join(',');
      const coverage = JSON.stringify({
        minimumOccurrence: material.coverage.minimumOccurrence,
        observedCases: material.coverage.observedCases,
        sampledTiles: material.coverage.sampledTiles,
        totalCases: material.coverage.totalCases,
      });

      return `{"ambiguities":[${ambiguities}],"cases":[${cases}],"coverage":${coverage},"key":${JSON.stringify(material.key)},"serverIds":[${[...material.serverIds].sort((left, right) => left - right).join(',')}]}`;
    })
    .join(',');
  const windows = [...table.windows]
    .sort(compareWindows)
    .map((window) =>
      JSON.stringify({
        floors: [...window.floors].sort((left, right) => left - right),
        maxX: window.maxX,
        maxY: window.maxY,
        minX: window.minX,
        minY: window.minY,
        reason: window.reason,
      }),
    )
    .join(',');

  return `{"materials":[${materials}],"schemaVersion":${table.schemaVersion},"sourcePath":${JSON.stringify(table.sourcePath)},"windows":[${windows}]}\n`;
}

function compareWindows(
  left: MaterialBordersTable['windows'][number],
  right: MaterialBordersTable['windows'][number],
): number {
  return (
    left.minX - right.minX ||
    left.minY - right.minY ||
    left.maxX - right.maxX ||
    left.maxY - right.maxY ||
    left.floors.join(',').localeCompare(right.floors.join(',')) ||
    left.reason.localeCompare(right.reason)
  );
}
