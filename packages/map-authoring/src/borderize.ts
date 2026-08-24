import { hashCoordinate, selectWeightedGround } from './hash.ts';
import {
  calculateSignature,
  coordinateKey,
  hasFloorNeighbor,
} from './signature.ts';
import {
  type AuthoringGrid,
  type BorderizeSeed,
  type BorderizeTables,
  EMPTY_GROUND_ID,
  type MaterialTable,
} from './types.ts';

interface ValidationContext {
  readonly floorIds: ReadonlySet<number>;
  readonly massIds: ReadonlySet<number>;
  readonly borderCases: ReadonlyMap<number, number>;
}

function assertSafeInteger(value: number, message: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(message);
  }
}

function validateGrid(
  grid: AuthoringGrid,
): ReadonlyMap<string, AuthoringGrid['cells'][number]> {
  if (typeof grid.layoutId !== 'string') {
    throw new Error('grid.layoutId must be a string.');
  }

  const coordinates = new Set<string>();
  const originalCells = new Map<string, AuthoringGrid['cells'][number]>();
  for (const cell of grid.cells) {
    assertSafeInteger(cell.x, 'cell x must be a safe integer.');
    assertSafeInteger(cell.y, 'cell y must be a safe integer.');
    assertSafeInteger(cell.z, 'cell z must be a safe integer.');
    if (cell.ground !== null) {
      assertSafeInteger(
        cell.ground,
        'cell ground must be a safe integer or null.',
      );
    }

    const key = coordinateKey(cell.x, cell.y, cell.z);
    if (coordinates.has(key)) {
      throw new Error(`grid contains duplicate cell coordinates: ${key}.`);
    }
    coordinates.add(key);
    originalCells.set(key, cell);
  }

  return originalCells;
}

function validateTables(tables: BorderizeTables): ValidationContext {
  const materialByKey = new Map<string, MaterialTable>();
  const materialByServerId = new Map<number, string>();

  for (const material of tables.materials) {
    if (materialByKey.has(material.key)) {
      throw new Error(`materials contains duplicate key "${material.key}".`);
    }
    materialByKey.set(material.key, material);

    const idsInMaterial = new Set<number>();
    for (const serverId of material.serverIds) {
      assertSafeInteger(serverId, 'material server ids must be safe integers.');
      if (idsInMaterial.has(serverId)) {
        throw new Error(
          `material "${material.key}" contains duplicate server id ${serverId}.`,
        );
      }
      const previousMaterial = materialByServerId.get(serverId);
      if (previousMaterial !== undefined) {
        throw new Error(
          `server id ${serverId} belongs to multiple materials: "${previousMaterial}" and "${material.key}".`,
        );
      }
      idsInMaterial.add(serverId);
      materialByServerId.set(serverId, material.key);
    }

    for (const borderCase of material.cases) {
      assertSafeInteger(
        borderCase.count,
        'border case counts must be safe integers.',
      );
      if (borderCase.count <= 0) {
        throw new Error('border case counts must be positive.');
      }
      assertSafeInteger(
        borderCase.serverId,
        'border case server ids must be safe integers.',
      );
      if (
        !Number.isSafeInteger(borderCase.signature) ||
        borderCase.signature < 0 ||
        borderCase.signature > 255
      ) {
        throw new Error('border signature must be an integer from 0 to 255.');
      }
    }
  }

  for (const key of tables.floorMaterialKeys) {
    if (!materialByKey.has(key)) {
      throw new Error(
        `floorMaterialKeys references missing material "${key}".`,
      );
    }
  }

  const massMaterial = materialByKey.get(tables.massMaterialKey);
  if (!massMaterial) {
    throw new Error(
      `massMaterialKey references missing material "${tables.massMaterialKey}".`,
    );
  }

  const borderMaterial = materialByKey.get(tables.borderMaterialKey);
  if (!borderMaterial) {
    throw new Error(
      `borderMaterialKey references missing material "${tables.borderMaterialKey}".`,
    );
  }

  const borderServerIds = new Set(borderMaterial.serverIds);
  const borderCases = new Map<number, number>();
  for (const borderCase of borderMaterial.cases) {
    if (!borderServerIds.has(borderCase.serverId)) {
      throw new Error(
        `border case server id ${borderCase.serverId} is not declared by the border material.`,
      );
    }
    if (borderCases.has(borderCase.signature)) {
      throw new Error(
        `border material contains duplicate signature ${borderCase.signature}.`,
      );
    }
    borderCases.set(borderCase.signature, borderCase.serverId);
  }

  const floorIds = new Set<number>();
  for (const key of tables.floorMaterialKeys) {
    for (const serverId of materialByKey.get(key)?.serverIds ?? []) {
      floorIds.add(serverId);
    }
  }

  const massIds = new Set(massMaterial.serverIds);
  if (!massIds.has(tables.massDominantServerId)) {
    throw new Error('massDominantServerId must belong to the mass material.');
  }

  if (tables.massVariants.length === 0) {
    throw new Error('massVariants must contain at least one variant.');
  }

  const variantIds = new Set<number>();
  let totalWeight = 0;
  for (const variant of tables.massVariants) {
    assertSafeInteger(
      variant.serverId,
      'massVariants server ids must be safe integers.',
    );
    if (!massIds.has(variant.serverId)) {
      throw new Error(
        `mass variant server id ${variant.serverId} must belong to the mass material.`,
      );
    }
    if (variantIds.has(variant.serverId)) {
      throw new Error(
        `massVariants contains duplicate server id ${variant.serverId}.`,
      );
    }
    if (!Number.isSafeInteger(variant.weight) || variant.weight <= 0) {
      throw new Error('massVariants weights must be positive safe integers.');
    }
    totalWeight += variant.weight;
    if (!Number.isSafeInteger(totalWeight)) {
      throw new Error('massVariants total weight must be a safe integer.');
    }
    variantIds.add(variant.serverId);
  }
  if (!variantIds.has(tables.massDominantServerId)) {
    throw new Error('massVariants must include massDominantServerId.');
  }

  return { borderCases, floorIds, massIds };
}

export function borderize(
  grid: AuthoringGrid,
  tables: BorderizeTables,
  seed: BorderizeSeed,
): AuthoringGrid {
  const originalCells = validateGrid(grid);
  const { borderCases, floorIds, massIds } = validateTables(tables);

  const cells = grid.cells.map((cell) => ({
    ...cell,
    ground: (() => {
      if (cell.ground === null || cell.ground === EMPTY_GROUND_ID) {
        return selectWeightedGround(
          tables.massVariants,
          hashCoordinate(seed, grid.layoutId, cell.x, cell.y, cell.z),
        );
      }

      if (
        massIds.has(cell.ground) &&
        hasFloorNeighbor(originalCells, cell, floorIds)
      ) {
        const signature = calculateSignature(originalCells, cell, massIds);
        return borderCases.get(signature) ?? tables.massDominantServerId;
      }

      return cell.ground;
    })(),
  }));

  cells.sort(
    (left, right) => left.z - right.z || left.y - right.y || left.x - right.x,
  );

  return { layoutId: grid.layoutId, cells };
}
