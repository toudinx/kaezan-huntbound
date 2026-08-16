import { createHash } from 'node:crypto';

export interface CombatSelectionDiagnostic {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export interface CombatSelectionReport {
  readonly ok: boolean;
  readonly presentIds: readonly string[];
  readonly diagnostics: readonly CombatSelectionDiagnostic[];
}

const TICK_DURATION_MS = 50;

interface UnknownRecord {
  readonly [key: string]: unknown;
}

interface SourceFileEntry {
  readonly relativePath: string;
  readonly sha256: string;
}

interface VocationSelection {
  readonly stableKey: string;
  readonly sourceId: string;
  readonly sourceFile: string;
  readonly attackSpeedMs: number;
  readonly baseSpeed: number;
}

interface CreatureSelection {
  readonly stableKey: string;
  readonly sourceFile: string;
  readonly speed: number;
  readonly intervalMs: number;
  readonly corpseItemId: number;
}

interface WeaponSelection {
  readonly stableKey: string;
  readonly sourceId: string;
  readonly sourceFile: string;
  readonly attack: number;
}

interface SpellSelection {
  readonly stableKey: string;
  readonly sourceId: string;
  readonly words: string;
  readonly sourceFile: string;
  readonly cooldownMs: number;
  readonly groupCooldownMs: number;
}

interface AssetSelection {
  readonly kind: 'effect' | 'item';
  readonly name: string;
  readonly sourceId: string;
  readonly numericId: number;
  readonly sourceFile: string;
}

interface CombatSelection {
  readonly vocation: VocationSelection;
  readonly creature: CreatureSelection;
  readonly weapon: WeaponSelection;
  readonly spells: readonly SpellSelection[];
  readonly assets: readonly AssetSelection[];
  readonly sourceFiles: readonly SourceFileEntry[];
}

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray(value) === false
  );
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asSafeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value)
    ? value
    : undefined;
}

function asSourceId(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return String(value);
  }
  return undefined;
}

function diagnostic(
  path: string,
  code: string,
  message: string,
): CombatSelectionDiagnostic {
  return { path, code, message };
}

function hashContents(contents: string): string {
  return createHash('sha256').update(contents, 'utf8').digest('hex');
}

function parseSourceFiles(
  value: unknown,
): readonly SourceFileEntry[] | undefined {
  if (Array.isArray(value) === false) return undefined;
  const entries: SourceFileEntry[] = [];
  for (const entry of value) {
    if (isRecord(entry) === false) return undefined;
    const relativePath = asString(entry.relativePath);
    const digest = asString(entry.sha256);
    if (relativePath === undefined || digest === undefined) return undefined;
    entries.push({ relativePath, sha256: digest });
  }
  return entries;
}

function parseVocation(value: unknown): VocationSelection | undefined {
  if (isRecord(value) === false) return undefined;
  const stableKey = asString(value.stableKey);
  const sourceId = asSourceId(value.sourceId);
  const sourceFile = asString(value.sourceFile);
  const attackSpeedMs = asSafeInteger(value.attackSpeedMs);
  const baseSpeed = asSafeInteger(value.baseSpeed);
  if (
    stableKey === undefined ||
    sourceId === undefined ||
    sourceFile === undefined ||
    attackSpeedMs === undefined ||
    baseSpeed === undefined
  ) {
    return undefined;
  }
  return { stableKey, sourceId, sourceFile, attackSpeedMs, baseSpeed };
}

function parseCreature(value: unknown): CreatureSelection | undefined {
  if (isRecord(value) === false) return undefined;
  const stableKey = asString(value.stableKey);
  const sourceFile = asString(value.sourceFile);
  const speed = asSafeInteger(value.speed);
  const intervalMs = asSafeInteger(value.intervalMs);
  const corpseItemId = asSafeInteger(value.corpseItemId);
  if (
    stableKey === undefined ||
    sourceFile === undefined ||
    speed === undefined ||
    intervalMs === undefined ||
    corpseItemId === undefined
  ) {
    return undefined;
  }
  return { stableKey, sourceFile, speed, intervalMs, corpseItemId };
}

function parseWeapon(value: unknown): WeaponSelection | undefined {
  if (isRecord(value) === false) return undefined;
  const stableKey = asString(value.stableKey);
  const sourceId = asSourceId(value.sourceId);
  const sourceFile = asString(value.sourceFile);
  const attack = asSafeInteger(value.attack);
  if (
    stableKey === undefined ||
    sourceId === undefined ||
    sourceFile === undefined ||
    attack === undefined
  ) {
    return undefined;
  }
  return { stableKey, sourceId, sourceFile, attack };
}

function parseSpells(value: unknown): readonly SpellSelection[] | undefined {
  if (Array.isArray(value) === false) return undefined;
  const spells: SpellSelection[] = [];
  for (const entry of value) {
    if (isRecord(entry) === false) return undefined;
    const stableKey = asString(entry.stableKey);
    const sourceId = asSourceId(entry.sourceId);
    const words = asString(entry.words);
    const sourceFile = asString(entry.sourceFile);
    const cooldownMs = asSafeInteger(entry.cooldownMs);
    const groupCooldownMs = asSafeInteger(entry.groupCooldownMs);
    if (
      stableKey === undefined ||
      sourceId === undefined ||
      words === undefined ||
      sourceFile === undefined ||
      cooldownMs === undefined ||
      groupCooldownMs === undefined
    ) {
      return undefined;
    }
    spells.push({
      stableKey,
      sourceId,
      words,
      sourceFile,
      cooldownMs,
      groupCooldownMs,
    });
  }
  return spells;
}

function parseAssets(value: unknown): readonly AssetSelection[] | undefined {
  if (Array.isArray(value) === false) return undefined;
  const assets: AssetSelection[] = [];
  for (const entry of value) {
    if (isRecord(entry) === false) return undefined;
    const kind =
      entry.kind === 'effect' || entry.kind === 'item' ? entry.kind : undefined;
    const name = asString(entry.name);
    const sourceId = asSourceId(entry.sourceId);
    const sourceFile = asString(entry.sourceFile);
    const numericId =
      typeof entry.sourceId === 'number'
        ? asSafeInteger(entry.sourceId)
        : sourceId !== undefined && /^-?\d+$/.test(sourceId)
          ? Number(sourceId)
          : undefined;
    if (
      kind === undefined ||
      name === undefined ||
      sourceId === undefined ||
      sourceFile === undefined ||
      numericId === undefined
    ) {
      return undefined;
    }
    assets.push({ kind, name, sourceId, numericId, sourceFile });
  }
  return assets;
}

function parseSelection(value: unknown): CombatSelection | undefined {
  if (isRecord(value) === false) return undefined;
  const vocation = parseVocation(value.vocation);
  const creature = parseCreature(value.creature);
  const weapon = parseWeapon(value.weapon);
  const spells = parseSpells(value.spells);
  const assets = parseAssets(value.assets);
  const sourceFiles = parseSourceFiles(value.sourceFiles);
  if (
    vocation === undefined ||
    creature === undefined ||
    weapon === undefined ||
    spells === undefined ||
    assets === undefined ||
    sourceFiles === undefined
  ) {
    return undefined;
  }
  return { vocation, creature, weapon, spells, assets, sourceFiles };
}

function fileContainsVocation(contents: string, sourceId: string): boolean {
  return new RegExp(`<vocation\\b[^>]*\\bid="${sourceId}"`, 'u').test(contents);
}

function fileContainsItem(contents: string, sourceId: string): boolean {
  return new RegExp(`<item\\b[^>]*\\bid="${sourceId}"`, 'u').test(contents);
}

function fileContainsSpell(
  contents: string,
  sourceId: string,
  words: string,
): boolean {
  return (
    contents.includes(`spell:id(${sourceId})`) &&
    contents.includes(`spell:words("${words}")`)
  );
}

function fileContainsEffect(
  contents: string,
  name: string,
  sourceId: number,
): boolean {
  const match = contents.match(
    new RegExp(`${name}\\s*=\\s*(0x[0-9A-Fa-f]+|\\d+)`, 'u'),
  );
  if (match?.[1] === undefined) return false;
  return Number(match[1]) === sourceId;
}

function entitySlug(stableKey: string): string {
  const parts = stableKey.split(':');
  return parts[parts.length - 1] ?? stableKey;
}

function checkInterval(
  path: string,
  value: number,
  diagnostics: CombatSelectionDiagnostic[],
): void {
  if (value % TICK_DURATION_MS !== 0) {
    diagnostics.push(
      diagnostic(
        path,
        'PB05_INTERVAL_NOT_DIVISIBLE',
        `${path} ${value} is not divisible by ${TICK_DURATION_MS}`,
      ),
    );
  }
}

export function validateCombatSelection(
  selection: unknown,
  files: ReadonlyMap<string, string>,
): CombatSelectionReport {
  const parsed = parseSelection(selection);
  if (parsed === undefined) {
    return {
      ok: false,
      presentIds: [],
      diagnostics: [
        diagnostic(
          '',
          'PB05_SELECTION_INVALID',
          'Combat selection JSON is missing required fields',
        ),
      ],
    };
  }

  const diagnostics: CombatSelectionDiagnostic[] = [];
  const presentIds: string[] = [];

  for (const [index, sourceFile] of parsed.sourceFiles.entries()) {
    const contents = files.get(sourceFile.relativePath);
    if (contents === undefined) {
      diagnostics.push(
        diagnostic(
          `sourceFiles[${index}].relativePath`,
          'PB05_SOURCE_MISSING',
          `Snapshot file ${sourceFile.relativePath} is missing`,
        ),
      );
      continue;
    }
    const digest = hashContents(contents);
    if (digest !== sourceFile.sha256) {
      diagnostics.push(
        diagnostic(
          `sourceFiles[${index}].sha256`,
          'PB05_SOURCE_HASH_MISMATCH',
          `Snapshot file ${sourceFile.relativePath} hash is ${digest}, expected ${sourceFile.sha256}`,
        ),
      );
    }
  }

  const vocationContents = files.get(parsed.vocation.sourceFile);
  if (
    vocationContents !== undefined &&
    fileContainsVocation(vocationContents, parsed.vocation.sourceId)
  ) {
    presentIds.push(`vocation:${parsed.vocation.sourceId}`);
  } else {
    diagnostics.push(
      diagnostic(
        'vocation.sourceId',
        'PB05_ID_MISSING',
        `Vocation id ${parsed.vocation.sourceId} is absent from ${parsed.vocation.sourceFile}`,
      ),
    );
  }

  for (const [index, spell] of parsed.spells.entries()) {
    const contents = files.get(spell.sourceFile);
    if (
      contents !== undefined &&
      fileContainsSpell(contents, spell.sourceId, spell.words)
    ) {
      presentIds.push(`spell:${spell.sourceId}`);
    } else {
      diagnostics.push(
        diagnostic(
          `spells[${index}].sourceId`,
          'PB05_ID_MISSING',
          `Spell id ${spell.sourceId} (${spell.words}) is absent from ${spell.sourceFile}`,
        ),
      );
    }
  }

  const weaponContents = files.get(parsed.weapon.sourceFile);
  if (
    weaponContents !== undefined &&
    fileContainsItem(weaponContents, parsed.weapon.sourceId)
  ) {
    presentIds.push(`item:${parsed.weapon.sourceId}`);
  } else {
    diagnostics.push(
      diagnostic(
        'weapon.sourceId',
        'PB05_ID_MISSING',
        `Item id ${parsed.weapon.sourceId} is absent from ${parsed.weapon.sourceFile}`,
      ),
    );
  }

  for (const [index, asset] of parsed.assets.entries()) {
    const contents = files.get(asset.sourceFile);
    if (asset.kind === 'item') {
      if (
        contents !== undefined &&
        fileContainsItem(contents, asset.sourceId)
      ) {
        presentIds.push(`item:${asset.sourceId}`);
      } else {
        diagnostics.push(
          diagnostic(
            `assets[${index}].sourceId`,
            'PB05_ID_MISSING',
            `Item id ${asset.sourceId} is absent from ${asset.sourceFile}`,
          ),
        );
      }
      continue;
    }
    if (
      contents !== undefined &&
      fileContainsEffect(contents, asset.name, asset.numericId)
    ) {
      presentIds.push(`effect:${asset.name}`);
    } else {
      diagnostics.push(
        diagnostic(
          `assets[${index}].sourceId`,
          'PB05_ID_MISSING',
          `Effect ${asset.name} = ${asset.numericId} is absent from ${asset.sourceFile}`,
        ),
      );
    }
  }

  if (files.get(parsed.creature.sourceFile) !== undefined) {
    presentIds.push(`creature:${entitySlug(parsed.creature.stableKey)}`);
  } else {
    diagnostics.push(
      diagnostic(
        'creature.sourceFile',
        'PB05_SOURCE_MISSING',
        `Creature source ${parsed.creature.sourceFile} is missing`,
      ),
    );
  }

  checkInterval(
    'vocation.attackSpeedMs',
    parsed.vocation.attackSpeedMs,
    diagnostics,
  );
  checkInterval('creature.intervalMs', parsed.creature.intervalMs, diagnostics);
  for (const [index, spell] of parsed.spells.entries()) {
    checkInterval(`spells[${index}].cooldownMs`, spell.cooldownMs, diagnostics);
    checkInterval(
      `spells[${index}].groupCooldownMs`,
      spell.groupCooldownMs,
      diagnostics,
    );
  }

  return {
    ok: diagnostics.length === 0,
    presentIds,
    diagnostics,
  };
}
