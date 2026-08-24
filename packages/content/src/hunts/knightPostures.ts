interface UnknownRecord {
  readonly [key: string]: unknown;
}

type KnightPostureId = 'blood-rage' | 'protector';

export interface KnightPostureDefinition {
  readonly abilityId: KnightPostureId;
  readonly conditionId: KnightPostureId;
  readonly displayName: string;
  readonly level: number;
  readonly mana: number;
  readonly skillIndex: number | null;
  readonly skillModifierPermille: number;
  readonly damageReceivedPermille: number;
  readonly damageDealtPermille: number;
  readonly shieldingPermille: number;
  readonly source: {
    readonly provider: 'TibiaWiki';
    readonly version: '15.25.3a4a52';
    readonly divergence: string;
  };
}

const KNIGHT_POSTURE_IDS = ['blood-rage', 'protector'] as const;

function fail(path: string, message: string): never {
  throw new Error(`${path}: ${message}`);
}

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray(value) === false
  );
}

function expectNonEmptyString(value: unknown, path: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  fail(path, 'expected a non-empty string');
}

function expectSafeInteger(value: unknown, path: string): number {
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return value;
  }
  fail(path, 'expected a safe integer');
}

function expectNonNegativeInteger(value: unknown, path: string): number {
  const parsed = expectSafeInteger(value, path);
  if (parsed < 0) {
    fail(path, 'expected a non-negative integer');
  }
  return parsed;
}

function expectNullableNonNegativeInteger(
  value: unknown,
  path: string,
): number | null {
  if (value === null) {
    return null;
  }
  return expectNonNegativeInteger(value, path);
}

function expectPostureId(value: unknown, path: string): KnightPostureId {
  const postureId = expectNonEmptyString(value, path);
  if (KNIGHT_POSTURE_IDS.includes(postureId as KnightPostureId) === false) {
    fail(path, `expected one of ${KNIGHT_POSTURE_IDS.join(', ')}`);
  }
  return postureId as KnightPostureId;
}

function parsePosture(value: unknown, index: number): KnightPostureDefinition {
  const path = `postures[${index}]`;
  if (isRecord(value) === false) {
    fail(path, 'expected an object');
  }

  const abilityId = expectPostureId(value.abilityId, `${path}.abilityId`);
  const conditionId = expectPostureId(value.conditionId, `${path}.conditionId`);
  if (abilityId !== conditionId) {
    fail(`${path}.conditionId`, 'expected conditionId to pair with abilityId');
  }

  const source = value.source;
  if (isRecord(source) === false) {
    fail(`${path}.source`, 'expected an object');
  }
  const provider = expectNonEmptyString(
    source.provider,
    `${path}.source.provider`,
  );
  if (provider !== 'TibiaWiki') {
    fail(`${path}.source.provider`, 'expected TibiaWiki');
  }
  const version = expectNonEmptyString(
    source.version,
    `${path}.source.version`,
  );
  if (version !== '15.25.3a4a52') {
    fail(`${path}.source.version`, 'expected 15.25.3a4a52');
  }

  return {
    abilityId,
    conditionId,
    displayName: expectNonEmptyString(value.displayName, `${path}.displayName`),
    level: expectNonNegativeInteger(value.level, `${path}.level`),
    mana: expectNonNegativeInteger(value.mana, `${path}.mana`),
    skillIndex: expectNullableNonNegativeInteger(
      value.skillIndex,
      `${path}.skillIndex`,
    ),
    skillModifierPermille: expectSafeInteger(
      value.skillModifierPermille,
      `${path}.skillModifierPermille`,
    ),
    damageReceivedPermille: expectSafeInteger(
      value.damageReceivedPermille,
      `${path}.damageReceivedPermille`,
    ),
    damageDealtPermille: expectSafeInteger(
      value.damageDealtPermille,
      `${path}.damageDealtPermille`,
    ),
    shieldingPermille: expectSafeInteger(
      value.shieldingPermille,
      `${path}.shieldingPermille`,
    ),
    source: {
      provider: 'TibiaWiki',
      version: '15.25.3a4a52',
      divergence: expectNonEmptyString(
        source.divergence,
        `${path}.source.divergence`,
      ),
    },
  };
}

export function parseKnightPostures(
  value: unknown,
): readonly KnightPostureDefinition[] {
  if (Array.isArray(value) === false) {
    fail('postures', 'expected an array');
  }
  if (value.length !== KNIGHT_POSTURE_IDS.length) {
    fail(
      'postures',
      `expected exactly ${KNIGHT_POSTURE_IDS.length} posture definitions`,
    );
  }

  const parsed = value.map((entry, index) => parsePosture(entry, index));
  const byId = new Map<KnightPostureId, KnightPostureDefinition>();
  for (const posture of parsed) {
    if (byId.has(posture.abilityId)) {
      fail(
        'postures',
        `duplicate posture id ${posture.abilityId}; ids must be unique`,
      );
    }
    byId.set(posture.abilityId, posture);
  }

  return KNIGHT_POSTURE_IDS.map((postureId) => {
    const posture = byId.get(postureId);
    if (posture === undefined) {
      fail('postures', `missing posture ${postureId}`);
    }
    return posture;
  });
}
