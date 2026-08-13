import type { ContentDiagnostic } from '@huntbound/contracts';
import type {
  CallExpression,
  Expression,
  MemberExpression,
  Node,
  Statement,
} from 'luaparse';

import type { CanaryParseResult } from '../sourceTypes';
import { parseLuaChunk } from './luaAst';
import { diagnosticAt } from './luaDiagnostics';
import type {
  CanaryAttackDto,
  CanaryConditionDto,
  CanaryCreatureDto,
  CanaryDefenseDto,
  CanarySummonDto,
} from './luaTypes';
import {
  readRequiredNumber,
  readRequiredString,
  readStaticValue,
} from './staticValues';

interface TableShape {
  readonly named: ReadonlyMap<string, Expression>;
  readonly values: readonly Expression[];
}

interface AttackMapping {
  readonly attack?: CanaryAttackDto;
  readonly condition?: CanaryConditionDto;
}

interface MonsterState {
  readonly fields: Map<string, Expression>;
  readonly anchor: Statement | undefined;
  readonly displayName: string | undefined;
  readonly registered: boolean;
}

const allowedMonsterFields = new Set([
  'Bestiary',
  'attacks',
  'changeTarget',
  'corpse',
  'defenses',
  'description',
  'elements',
  'experience',
  'flags',
  'health',
  'immunities',
  'light',
  'manaCost',
  'maxHealth',
  'outfit',
  'race',
  'raceId',
  'speed',
  'strategiesTarget',
  'summon',
  'voices',
  'loot',
]);

const ignoredMonsterFields = new Set([
  'Bestiary',
  'changeTarget',
  'corpse',
  'description',
  'flags',
  'light',
  'manaCost',
  'maxHealth',
  'race',
  'strategiesTarget',
  'voices',
]);

const attackFields = new Set([
  'condition',
  'effect',
  'interval',
  'maxDamage',
  'minDamage',
  'name',
  'radius',
  'range',
  'chance',
  'shootEffect',
  'target',
  'type',
]);

const defenseFields = new Set([
  'effect',
  'interval',
  'maxDamage',
  'minDamage',
  'name',
  'chance',
  'target',
  'type',
]);

const conditionFields = new Set(['interval', 'totalDamage', 'type']);
const summonFields = new Set(['chance', 'count', 'id', 'interval', 'name']);
const lootFields = new Set(['chance', 'id', 'maxCount', 'minCount', 'name']);
const elementFields = new Set(['percent', 'type']);
const immunityFields = new Set(['condition', 'type']);

function pushDiagnostic(
  diagnostics: ContentDiagnostic[],
  node: Node | undefined,
  code: string,
  message: string,
): void {
  diagnostics.push(diagnosticAt(node, code, message));
}

function tableShape(
  expression: Expression | undefined,
  field: string,
  diagnostics: ContentDiagnostic[],
): TableShape | undefined {
  if (expression?.type !== 'TableConstructorExpression') {
    pushDiagnostic(
      diagnostics,
      expression,
      'lua.invalid-value',
      `${field} must be a table constructor`,
    );
    return undefined;
  }

  const named = new Map<string, Expression>();
  const values: Expression[] = [];
  for (const item of expression.fields) {
    if (item.type === 'TableValue') {
      values.push(item.value);
      continue;
    }
    if (item.type !== 'TableKeyString') {
      pushDiagnostic(
        diagnostics,
        item,
        'lua.computed-index',
        `${field} must use static field names`,
      );
      continue;
    }
    if (named.has(item.key.name)) {
      pushDiagnostic(
        diagnostics,
        item,
        'lua.duplicate-field',
        `Duplicate ${field} field ${item.key.name}`,
      );
      continue;
    }
    named.set(item.key.name, item.value);
  }
  return { named, values };
}

function readString(
  expression: Expression | undefined,
  field: string,
  diagnostics: ContentDiagnostic[],
): string | undefined {
  if (expression === undefined) {
    pushDiagnostic(
      diagnostics,
      undefined,
      'lua.missing-field',
      `${field} is required`,
    );
    return undefined;
  }
  const result = readRequiredString(expression, field);
  if (!result.ok) {
    diagnostics.push(...result.diagnostics);
    return undefined;
  }
  return typeof result.value === 'string' ? result.value : undefined;
}

function readNumber(
  expression: Expression | undefined,
  field: string,
  diagnostics: ContentDiagnostic[],
): number | undefined {
  if (expression === undefined) {
    pushDiagnostic(
      diagnostics,
      undefined,
      'lua.missing-field',
      `${field} is required`,
    );
    return undefined;
  }
  const result = readRequiredNumber(expression, field);
  if (!result.ok) {
    diagnostics.push(...result.diagnostics);
    return undefined;
  }
  return typeof result.value === 'number' ? result.value : undefined;
}

function readInteger(
  expression: Expression | undefined,
  field: string,
  diagnostics: ContentDiagnostic[],
  options: { readonly min: number; readonly max?: number },
): number | undefined {
  const value = readNumber(expression, field, diagnostics);
  if (
    value === undefined ||
    !Number.isSafeInteger(value) ||
    value < options.min ||
    (options.max !== undefined && value > options.max)
  ) {
    if (value !== undefined) {
      pushDiagnostic(
        diagnostics,
        expression,
        'lua.invalid-value',
        `${field} must be an integer in the supported range`,
      );
    }
    return undefined;
  }
  return value;
}

function optionalStaticValidation(
  expression: Expression | undefined,
  diagnostics: ContentDiagnostic[],
): void {
  if (expression === undefined) return;
  const result = readStaticValue(expression);
  if (!result.ok) diagnostics.push(...result.diagnostics);
}

function requireOneField(
  shape: TableShape,
  names: readonly string[],
  field: string,
  diagnostics: ContentDiagnostic[],
): Expression | undefined {
  const found = names.filter((name) => shape.named.has(name));
  if (found.length !== 1) {
    pushDiagnostic(
      diagnostics,
      undefined,
      'lua.invalid-value',
      `${field} requires exactly one of ${names.join(', ')}`,
    );
    return undefined;
  }
  const selected = found[0];
  return selected === undefined ? undefined : shape.named.get(selected);
}

function checkAllowedFields(
  shape: TableShape,
  allowed: ReadonlySet<string>,
  context: string,
  diagnostics: ContentDiagnostic[],
): void {
  for (const field of shape.named.keys()) {
    if (!allowed.has(field)) {
      pushDiagnostic(
        diagnostics,
        shape.named.get(field),
        'lua.unsupported-field',
        `Unsupported ${context} field ${field}`,
      );
    }
  }
}

function callMember(
  expression: Expression,
  baseName: string,
  memberName: string,
  indexer: '.' | ':',
): expression is CallExpression & {
  readonly base: MemberExpression & {
    readonly base: { readonly type: 'Identifier'; readonly name: string };
    readonly identifier: { readonly name: string };
    readonly indexer: '.' | ':';
  };
} {
  if (expression.type !== 'CallExpression') return false;
  const base = expression.base;
  return (
    base.type === 'MemberExpression' &&
    base.indexer === indexer &&
    base.identifier.name === memberName &&
    base.base.type === 'Identifier' &&
    base.base.name === baseName
  );
}

function readCallString(
  call: CallExpression,
  field: string,
  diagnostics: ContentDiagnostic[],
): string | undefined {
  if (call.arguments.length !== 1) {
    pushDiagnostic(
      diagnostics,
      call,
      'lua.invalid-value',
      `${field} expects one argument`,
    );
    return undefined;
  }
  return readString(call.arguments[0], field, diagnostics);
}

function readLoot(
  expression: Expression | undefined,
  diagnostics: ContentDiagnostic[],
): readonly (
  | { readonly sourceId: string }
  | { readonly sourceName: string }
)[] {
  if (expression === undefined) return [];
  const shape = tableShape(expression, 'loot', diagnostics);
  if (shape === undefined) return [];
  if (shape.named.size > 0) {
    pushDiagnostic(
      diagnostics,
      expression,
      'lua.invalid-value',
      'loot must contain entry tables only',
    );
  }
  const result: (
    | { readonly sourceId: string }
    | { readonly sourceName: string }
  )[] = [];
  for (const entryExpression of shape.values) {
    const entry = tableShape(entryExpression, 'loot entry', diagnostics);
    if (entry === undefined) continue;
    checkAllowedFields(entry, lootFields, 'loot', diagnostics);
    const reference = requireOneField(
      entry,
      ['id', 'name'],
      'loot reference',
      diagnostics,
    );
    if (reference === undefined) continue;
    const chance = readInteger(
      entry.named.get('chance'),
      'loot chance',
      diagnostics,
      {
        min: 0,
        max: 100_000,
      },
    );
    const minCount = entry.named.has('minCount')
      ? readInteger(entry.named.get('minCount'), 'loot minCount', diagnostics, {
          min: 1,
        })
      : 1;
    const maxCount = entry.named.has('maxCount')
      ? readInteger(entry.named.get('maxCount'), 'loot maxCount', diagnostics, {
          min: 1,
        })
      : 1;
    if (
      chance === undefined ||
      minCount === undefined ||
      maxCount === undefined
    ) {
      continue;
    }
    if (maxCount < minCount) {
      pushDiagnostic(
        diagnostics,
        entryExpression,
        'lua.invalid-value',
        'loot maxCount must be greater than or equal to minCount',
      );
      continue;
    }
    if (entry.named.has('id')) {
      const sourceId = readInteger(
        entry.named.get('id'),
        'loot id',
        diagnostics,
        {
          min: 0,
        },
      );
      if (sourceId !== undefined) result.push({ sourceId: String(sourceId) });
    } else {
      const sourceName = readString(
        entry.named.get('name'),
        'loot name',
        diagnostics,
      );
      if (sourceName !== undefined) result.push({ sourceName });
    }
  }
  return result;
}

function readCondition(
  expression: Expression,
  diagnostics: ContentDiagnostic[],
): CanaryConditionDto | undefined {
  const shape = tableShape(expression, 'condition', diagnostics);
  if (shape === undefined) return undefined;
  checkAllowedFields(shape, conditionFields, 'condition', diagnostics);
  const type = readString(
    shape.named.get('type'),
    'condition type',
    diagnostics,
  );
  const totalDamage = readNumber(
    shape.named.get('totalDamage'),
    'condition totalDamage',
    diagnostics,
  );
  const intervalMs = readInteger(
    shape.named.get('interval'),
    'condition interval',
    diagnostics,
    { min: 1 },
  );
  if (
    type !== 'poison' ||
    totalDamage === undefined ||
    intervalMs === undefined
  ) {
    if (type !== undefined && type !== 'poison') {
      pushDiagnostic(
        diagnostics,
        shape.named.get('type'),
        'lua.invalid-value',
        `Unsupported condition type ${type}`,
      );
    }
    return undefined;
  }
  if (totalDamage < 0) {
    pushDiagnostic(
      diagnostics,
      shape.named.get('totalDamage'),
      'lua.invalid-value',
      'condition totalDamage must be non-negative',
    );
    return undefined;
  }
  return { kind: 'poison', totalDamage, intervalMs };
}

function readDamageRange(
  shape: TableShape,
  diagnostics: ContentDiagnostic[],
): { readonly minDamage: number; readonly maxDamage: number } | undefined {
  const minDamage = readNumber(
    shape.named.get('minDamage'),
    'minDamage',
    diagnostics,
  );
  const maxDamage = readNumber(
    shape.named.get('maxDamage'),
    'maxDamage',
    diagnostics,
  );
  if (minDamage === undefined || maxDamage === undefined) return undefined;
  return {
    minDamage: Math.min(Math.abs(minDamage), Math.abs(maxDamage)),
    maxDamage: Math.max(Math.abs(minDamage), Math.abs(maxDamage)),
  };
}

function readChance(
  expression: Expression | undefined,
  field: string,
  diagnostics: ContentDiagnostic[],
): number | undefined {
  const percentage = readInteger(expression, field, diagnostics, {
    min: 0,
    max: 100,
  });
  return percentage === undefined ? undefined : percentage * 100;
}

function readAttack(
  expression: Expression,
  diagnostics: ContentDiagnostic[],
): AttackMapping | undefined {
  const shape = tableShape(expression, 'attack', diagnostics);
  if (shape === undefined) return undefined;
  checkAllowedFields(shape, attackFields, 'attack', diagnostics);
  const name = readString(shape.named.get('name'), 'attack name', diagnostics);
  const intervalMs = readInteger(
    shape.named.get('interval'),
    'attack interval',
    diagnostics,
    {
      min: 0,
    },
  );
  const chanceBasisPoints = readChance(
    shape.named.get('chance'),
    'attack chance',
    diagnostics,
  );
  const damage = readDamageRange(shape, diagnostics);
  const damageType = shape.named.has('type')
    ? readString(shape.named.get('type'), 'attack type', diagnostics)
    : 'physical';
  const rangeTiles = shape.named.has('range')
    ? readInteger(shape.named.get('range'), 'attack range', diagnostics, {
        min: 0,
      })
    : undefined;
  const radiusTiles = shape.named.has('radius')
    ? readInteger(shape.named.get('radius'), 'attack radius', diagnostics, {
        min: 0,
      })
    : undefined;
  const projectile = shape.named.has('shootEffect')
    ? readString(
        shape.named.get('shootEffect'),
        'attack projectile',
        diagnostics,
      )
    : undefined;
  const condition = shape.named.has('condition')
    ? readCondition(shape.named.get('condition') as Expression, diagnostics)
    : undefined;
  if (
    name === undefined ||
    intervalMs === undefined ||
    chanceBasisPoints === undefined ||
    damage === undefined ||
    damageType === undefined
  ) {
    return undefined;
  }
  const kind =
    radiusTiles !== undefined
      ? 'area'
      : rangeTiles !== undefined
        ? 'ranged'
        : 'melee';
  if (kind === 'ranged' && projectile === undefined) {
    pushDiagnostic(
      diagnostics,
      expression,
      'lua.missing-field',
      'Ranged attacks require shootEffect',
    );
    return undefined;
  }
  const attack: CanaryAttackDto = {
    name,
    kind,
    intervalMs,
    chanceBasisPoints,
    damageType,
    ...damage,
    ...(kind === 'ranged' && rangeTiles !== undefined ? { rangeTiles } : {}),
    ...(kind === 'ranged' && projectile !== undefined ? { projectile } : {}),
    ...(kind === 'area' && radiusTiles !== undefined ? { radiusTiles } : {}),
  };
  return { attack, ...(condition === undefined ? {} : { condition }) };
}

function readDefense(
  expression: Expression,
  diagnostics: ContentDiagnostic[],
): CanaryDefenseDto | undefined {
  const shape = tableShape(expression, 'defense action', diagnostics);
  if (shape === undefined) return undefined;
  checkAllowedFields(shape, defenseFields, 'defense action', diagnostics);
  const type = readString(shape.named.get('type'), 'defense type', diagnostics);
  const intervalMs = readInteger(
    shape.named.get('interval'),
    'defense interval',
    diagnostics,
    {
      min: 0,
    },
  );
  const chanceBasisPoints = readChance(
    shape.named.get('chance'),
    'defense chance',
    diagnostics,
  );
  const damage = readDamageRange(shape, diagnostics);
  if (
    type !== 'healing' ||
    intervalMs === undefined ||
    chanceBasisPoints === undefined ||
    damage === undefined
  ) {
    if (type !== undefined && type !== 'healing') {
      pushDiagnostic(
        diagnostics,
        shape.named.get('type'),
        'lua.invalid-value',
        `Unsupported defense type ${type}`,
      );
    }
    return undefined;
  }
  return {
    kind: 'heal',
    intervalMs,
    chanceBasisPoints,
    minAmount: damage.minDamage,
    maxAmount: damage.maxDamage,
  };
}

function readDefenses(
  expression: Expression | undefined,
  diagnostics: ContentDiagnostic[],
): readonly CanaryDefenseDto[] {
  if (expression === undefined) return [];
  const shape = tableShape(expression, 'defenses', diagnostics);
  if (shape === undefined) return [];
  for (const field of ['defense', 'armor', 'mitigation']) {
    optionalStaticValidation(shape.named.get(field), diagnostics);
  }
  for (const field of shape.named.keys()) {
    if (!['defense', 'armor', 'mitigation'].includes(field)) {
      pushDiagnostic(
        diagnostics,
        shape.named.get(field),
        'lua.unsupported-field',
        `Unsupported defenses field ${field}`,
      );
    }
  }
  return shape.values.flatMap((value) => {
    const defense = readDefense(value, diagnostics);
    return defense === undefined ? [] : [defense];
  });
}

function readSummons(
  expression: Expression | undefined,
  diagnostics: ContentDiagnostic[],
): readonly CanarySummonDto[] {
  if (expression === undefined) return [];
  const outer = tableShape(expression, 'summon', diagnostics);
  if (outer === undefined) return [];
  checkAllowedFields(
    outer,
    new Set(['maxSummons', 'summons']),
    'summon',
    diagnostics,
  );
  optionalStaticValidation(outer.named.get('maxSummons'), diagnostics);
  const summons = outer.named.get('summons');
  if (summons === undefined) return [];
  const entries = tableShape(summons, 'summons', diagnostics);
  if (entries === undefined) return [];
  if (entries.named.size > 0) {
    pushDiagnostic(
      diagnostics,
      summons,
      'lua.invalid-value',
      'summons must contain entry tables only',
    );
  }
  return entries.values.flatMap((entryExpression) => {
    const entry = tableShape(entryExpression, 'summon entry', diagnostics);
    if (entry === undefined) return [];
    checkAllowedFields(entry, summonFields, 'summon entry', diagnostics);
    const reference = requireOneField(
      entry,
      ['id', 'name'],
      'summon reference',
      diagnostics,
    );
    const chanceBasisPoints = readChance(
      entry.named.get('chance'),
      'summon chance',
      diagnostics,
    );
    const count = readInteger(
      entry.named.get('count'),
      'summon count',
      diagnostics,
      { min: 1 },
    );
    readInteger(entry.named.get('interval'), 'summon interval', diagnostics, {
      min: 0,
    });
    if (
      reference === undefined ||
      chanceBasisPoints === undefined ||
      count === undefined
    )
      return [];
    const sourceId = entry.named.has('id')
      ? readInteger(entry.named.get('id'), 'summon id', diagnostics, { min: 0 })
      : undefined;
    const sourceName = entry.named.has('name')
      ? readString(entry.named.get('name'), 'summon name', diagnostics)
      : undefined;
    if (sourceId === undefined && sourceName === undefined) return [];
    return [
      {
        creatureRef:
          sourceId === undefined
            ? { sourceName: sourceName as string }
            : { sourceId: String(sourceId) },
        count,
        chanceBasisPoints,
      },
    ];
  });
}

function readElements(
  expression: Expression | undefined,
  diagnostics: ContentDiagnostic[],
): Readonly<Record<string, number>> {
  if (expression === undefined) return {};
  const shape = tableShape(expression, 'elements', diagnostics);
  if (shape === undefined) return {};
  const elements: Record<string, number> = {};
  for (const entryExpression of shape.values) {
    const entry = tableShape(entryExpression, 'element', diagnostics);
    if (entry === undefined) continue;
    checkAllowedFields(entry, elementFields, 'element', diagnostics);
    const type = readString(
      entry.named.get('type'),
      'element type',
      diagnostics,
    );
    const percent = readNumber(
      entry.named.get('percent'),
      'element percent',
      diagnostics,
    );
    if (type !== undefined && percent !== undefined)
      elements[type] = percent / 100;
  }
  return elements;
}

function readImmunities(
  expression: Expression | undefined,
  diagnostics: ContentDiagnostic[],
): readonly string[] {
  if (expression === undefined) return [];
  const shape = tableShape(expression, 'immunities', diagnostics);
  if (shape === undefined) return [];
  const immunities: string[] = [];
  for (const entryExpression of shape.values) {
    const entry = tableShape(entryExpression, 'immunity', diagnostics);
    if (entry === undefined) continue;
    checkAllowedFields(entry, immunityFields, 'immunity', diagnostics);
    const type = readString(
      entry.named.get('type'),
      'immunity type',
      diagnostics,
    );
    const conditionExpression = entry.named.get('condition');
    if (conditionExpression === undefined) {
      pushDiagnostic(
        diagnostics,
        entryExpression,
        'lua.missing-field',
        'immunity condition is required',
      );
      continue;
    }
    const condition = readStaticValue(conditionExpression);
    if (!condition.ok) {
      diagnostics.push(...condition.diagnostics);
      continue;
    }
    if (typeof condition.value !== 'boolean') {
      pushDiagnostic(
        diagnostics,
        entry.named.get('condition'),
        'lua.invalid-value',
        'immunity condition must be boolean',
      );
    } else if (condition.value && type !== undefined) {
      immunities.push(type);
    }
  }
  return immunities;
}

function collectMonster(
  lua: string,
):
  | { readonly ok: true; readonly state: MonsterState }
  | { readonly ok: false; readonly diagnostics: readonly ContentDiagnostic[] } {
  const parsed = parseLuaChunk(lua);
  if (!parsed.ok) return parsed;
  const diagnostics: ContentDiagnostic[] = [];
  const fields = new Map<string, Expression>();
  let displayName: string | undefined;
  let anchor: Statement | undefined;
  let hasMonster = false;
  let registered = false;

  for (const statement of parsed.value.body) {
    if (statement.type === 'LocalStatement') {
      if (statement.variables.length !== 1 || statement.init.length !== 1) {
        pushDiagnostic(
          diagnostics,
          statement,
          'lua.unsupported-statement',
          'Local declarations must bind one value',
        );
        continue;
      }
      const variable = statement.variables[0];
      const initializer = statement.init[0];
      if (
        variable?.name === 'monster' &&
        initializer?.type === 'TableConstructorExpression' &&
        initializer.fields.length === 0
      ) {
        hasMonster = true;
        anchor = statement;
        continue;
      }
      if (
        variable?.name === 'mType' &&
        initializer !== undefined &&
        callMember(initializer, 'Game', 'createMonsterType', '.')
      ) {
        displayName = readCallString(
          initializer,
          'monster display name',
          diagnostics,
        );
        anchor ??= statement;
        continue;
      }
      pushDiagnostic(
        diagnostics,
        statement,
        'lua.unsupported-statement',
        'Only mType and monster locals are allowlisted',
      );
      continue;
    }

    if (statement.type === 'AssignmentStatement') {
      const variable = statement.variables[0];
      const initializer = statement.init[0];
      if (
        statement.variables.length !== 1 ||
        statement.init.length !== 1 ||
        variable === undefined ||
        initializer === undefined
      ) {
        pushDiagnostic(
          diagnostics,
          statement,
          'lua.unsupported-statement',
          'Assignments must bind one member to one value',
        );
        continue;
      }
      if (variable.type === 'IndexExpression') {
        pushDiagnostic(
          diagnostics,
          variable,
          'lua.computed-index',
          'Computed mutation is not allowlisted',
        );
        continue;
      }
      if (
        variable.type !== 'MemberExpression' ||
        variable.indexer !== ':' ||
        variable.base.type !== 'Identifier'
      ) {
        if (
          variable.type === 'MemberExpression' &&
          variable.base.type === 'Identifier' &&
          variable.base.name === 'monster' &&
          variable.indexer === '.'
        ) {
          if (!allowedMonsterFields.has(variable.identifier.name)) {
            pushDiagnostic(
              diagnostics,
              variable,
              'lua.unsupported-field',
              `Unsupported monster field ${variable.identifier.name}`,
            );
          } else if (fields.has(variable.identifier.name)) {
            pushDiagnostic(
              diagnostics,
              variable,
              'lua.duplicate-field',
              `Duplicate monster field ${variable.identifier.name}`,
            );
          } else {
            fields.set(variable.identifier.name, initializer);
          }
          continue;
        }
        pushDiagnostic(
          diagnostics,
          variable,
          'lua.unsupported-statement',
          'Only point assignments to monster are allowlisted',
        );
        continue;
      }
      pushDiagnostic(
        diagnostics,
        variable,
        'lua.unsupported-statement',
        'Method mutation is not allowlisted',
      );
      continue;
    }

    if (statement.type === 'CallStatement') {
      const expression = statement.expression;
      if (
        callMember(expression, 'mType', 'register', ':') &&
        expression.arguments.length === 1 &&
        expression.arguments[0]?.type === 'Identifier' &&
        expression.arguments[0].name === 'monster'
      ) {
        registered = true;
      } else {
        pushDiagnostic(
          diagnostics,
          statement,
          'lua.unsupported-call',
          'Only mType:register(monster) is allowlisted',
        );
      }
      continue;
    }

    pushDiagnostic(
      diagnostics,
      statement,
      'lua.unsupported-statement',
      `Statement ${statement.type} is not allowlisted`,
    );
  }

  if (!hasMonster)
    pushDiagnostic(
      diagnostics,
      anchor,
      'lua.missing-field',
      'monster declaration is required',
    );
  if (displayName === undefined)
    pushDiagnostic(
      diagnostics,
      anchor,
      'lua.missing-field',
      'monster display name is required',
    );
  if (!registered)
    pushDiagnostic(
      diagnostics,
      anchor,
      'lua.missing-field',
      'mType:register(monster) is required',
    );
  return diagnostics.length > 0
    ? { ok: false, diagnostics }
    : { ok: true, state: { fields, anchor, displayName, registered } };
}

function readOutfit(
  expression: Expression | undefined,
  diagnostics: ContentDiagnostic[],
): number | undefined {
  const shape = tableShape(expression, 'outfit', diagnostics);
  if (shape === undefined) return undefined;
  const allowed = new Set([
    'lookType',
    'lookHead',
    'lookBody',
    'lookLegs',
    'lookFeet',
    'lookAddons',
    'lookMount',
  ]);
  checkAllowedFields(shape, allowed, 'outfit', diagnostics);
  return readInteger(
    shape.named.get('lookType'),
    'outfit lookType',
    diagnostics,
    { min: 0 },
  );
}

export function parseCanaryMonsterLua(
  lua: string,
): CanaryParseResult<CanaryCreatureDto> {
  const collected = collectMonster(lua);
  if (!collected.ok) return collected;
  const { fields, anchor, displayName } = collected.state;
  const diagnostics: ContentDiagnostic[] = [];

  for (const [field, expression] of fields) {
    if (ignoredMonsterFields.has(field))
      optionalStaticValidation(expression, diagnostics);
  }

  const sourceIdValue = readInteger(
    fields.get('raceId'),
    'raceId',
    diagnostics,
    { min: 0 },
  );
  if (sourceIdValue === undefined && fields.get('raceId') === undefined) {
    pushDiagnostic(
      diagnostics,
      anchor,
      'lua.missing-field',
      'raceId is required',
    );
  }
  const experience = readInteger(
    fields.get('experience'),
    'experience',
    diagnostics,
    { min: 0 },
  );
  const health = readInteger(fields.get('health'), 'health', diagnostics, {
    min: 0,
  });
  const speed = readInteger(fields.get('speed'), 'speed', diagnostics, {
    min: 0,
  });
  const lookType = readOutfit(fields.get('outfit'), diagnostics);
  const attacksShape = tableShape(
    fields.get('attacks'),
    'attacks',
    diagnostics,
  );
  const attacks: CanaryAttackDto[] = [];
  const conditions: CanaryConditionDto[] = [];
  if (attacksShape !== undefined) {
    if (attacksShape.named.size > 0)
      pushDiagnostic(
        diagnostics,
        fields.get('attacks'),
        'lua.invalid-value',
        'attacks must contain entry tables only',
      );
    for (const attackExpression of attacksShape.values) {
      const mapping = readAttack(attackExpression, diagnostics);
      if (mapping?.attack !== undefined) attacks.push(mapping.attack);
      if (mapping?.condition !== undefined) conditions.push(mapping.condition);
    }
  }
  const defenses = readDefenses(fields.get('defenses'), diagnostics);
  const summons = readSummons(fields.get('summon'), diagnostics);
  const lootRefs = readLoot(fields.get('loot'), diagnostics);
  const elements = readElements(fields.get('elements'), diagnostics);
  const immunities = readImmunities(fields.get('immunities'), diagnostics);

  if (
    displayName === undefined ||
    sourceIdValue === undefined ||
    experience === undefined ||
    health === undefined ||
    speed === undefined ||
    lookType === undefined ||
    fields.get('attacks') === undefined
  ) {
    if (fields.get('attacks') === undefined)
      pushDiagnostic(
        diagnostics,
        anchor,
        'lua.missing-field',
        'attacks is required',
      );
  }
  if (diagnostics.length > 0) return { ok: false, diagnostics };

  return {
    ok: true,
    value: {
      sourceId: String(sourceIdValue),
      displayName: displayName as string,
      stats: {
        health: health as number,
        experience: experience as number,
        speed: speed as number,
      },
      lookType: lookType as number,
      attacks,
      defenses,
      conditions,
      summons,
      lootRefs,
      elements,
      immunities,
    },
  };
}
