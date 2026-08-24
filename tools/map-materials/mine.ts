import { readOtbmTiles } from '../map-extractor/otbm.ts';
import { aggregateMaterial } from './aggregate.ts';
import { calculateMaterialSignature, createMaterialGrid } from './signature.ts';
import type {
  MaterialBordersTable,
  MaterialMiningRecipe,
  MaterialObservation,
} from './types.ts';

export class MaterialAmbiguityError extends Error {
  readonly ambiguities: readonly MaterialBordersTable['materials'][number]['ambiguities'][number][];

  constructor(
    ambiguities: readonly MaterialBordersTable['materials'][number]['ambiguities'][number][],
  ) {
    super(ambiguities.map(({ message }) => message).join('\n'));
    this.name = 'MaterialAmbiguityError';
    this.ambiguities = ambiguities;
  }
}

export function mineMaterialBorders(
  otbm: Uint8Array,
  recipe: MaterialMiningRecipe,
): MaterialBordersTable {
  const observations = new Map<string, MaterialObservation[]>(
    recipe.materials.map((material) => [material.key, []]),
  );

  for (const window of recipe.windows) {
    const tiles = readOtbmTiles(otbm, window);
    const grid = createMaterialGrid(window, tiles);

    for (const material of recipe.materials) {
      const materialIds = new Set(material.serverIds);
      const materialObservations = observations.get(
        material.key,
      ) as MaterialObservation[];
      for (const tile of tiles) {
        const serverId = tile.items.find((item) => materialIds.has(item));
        if (serverId === undefined) continue;
        materialObservations.push({
          serverId,
          signature: calculateMaterialSignature(grid, tile, materialIds),
        });
      }
    }
  }

  const materials = recipe.materials.map((material) => {
    const aggregation = aggregateMaterial(
      material,
      observations.get(material.key) as readonly MaterialObservation[],
      recipe.ambiguityMinimumOccurrence,
    );
    return { ...material, ...aggregation };
  });
  const ambiguities = materials.flatMap((material) => material.ambiguities);
  if (ambiguities.length > 0) {
    throw new MaterialAmbiguityError(ambiguities);
  }

  return {
    materials,
    schemaVersion: recipe.schemaVersion,
    sourcePath: recipe.sourcePath,
    windows: recipe.windows,
  };
}
