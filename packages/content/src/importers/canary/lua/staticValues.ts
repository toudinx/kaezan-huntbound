import type { ContentDiagnostic } from '@huntbound/contracts';
import type {
  BinaryExpression,
  Expression,
  Node,
  TableConstructorExpression,
} from 'luaparse';

import { diagnosticAt } from './luaDiagnostics.ts';

export interface LuaStaticObject {
  readonly [key: string]: LuaStaticValue;
}

export type LuaStaticValue =
  | null
  | boolean
  | number
  | string
  | readonly LuaStaticValue[]
  | LuaStaticObject;

export type StaticValueResult =
  | { readonly ok: true; readonly value: LuaStaticValue }
  | {
      readonly ok: false;
      readonly diagnostics: readonly ContentDiagnostic[];
    };

const symbolicConstants: Readonly<Record<string, string>> = {
  AREA_SQUARE1X1: 'AREA_SQUARE1X1',
  BESTY_RACE_HUMAN: 'BESTY_RACE_HUMAN',
  BESTY_RACE_HUMANOID: 'BESTY_RACE_HUMANOID',
  BESTY_RACE_REPTILE: 'BESTY_RACE_REPTILE',
  BESTY_RACE_VERMIN: 'BESTY_RACE_VERMIN',
  CALLBACK_PARAM_SKILLVALUE: 'CALLBACK_PARAM_SKILLVALUE',
  COMBAT_DEATHDAMAGE: 'death',
  COMBAT_DROWNDAMAGE: 'drown',
  COMBAT_EARTHDAMAGE: 'earth',
  COMBAT_ENERGYDAMAGE: 'energy',
  COMBAT_FIREDAMAGE: 'fire',
  COMBAT_HEALING: 'healing',
  COMBAT_HOLYDAMAGE: 'holy',
  COMBAT_ICEDAMAGE: 'ice',
  COMBAT_LIFEDRAIN: 'lifeDrain',
  COMBAT_MANADRAIN: 'manaDrain',
  COMBAT_PARAM_BLOCKARMOR: 'COMBAT_PARAM_BLOCKARMOR',
  COMBAT_PARAM_EFFECT: 'COMBAT_PARAM_EFFECT',
  COMBAT_PARAM_TYPE: 'COMBAT_PARAM_TYPE',
  COMBAT_PARAM_USECHARGES: 'COMBAT_PARAM_USECHARGES',
  COMBAT_PHYSICALDAMAGE: 'physical',
  CONDITION_POISON: 'poison',
  CONST_ANI_ARROW: 'arrow',
  CONST_ANI_ENERGYBALL: 'energyball',
  CONST_ANI_FIRE: 'fire',
  CONST_ANI_THROWINGKNIFE: 'throwingknife',
  CONST_ME_HITAREA: 'CONST_ME_HITAREA',
  CONST_ME_MAGIC_BLUE: 'CONST_ME_MAGIC_BLUE',
  SOUND_EFFECT_TYPE_SPELL_BERSERK: 'SOUND_EFFECT_TYPE_SPELL_BERSERK',
};

function failure(
  expression: Node,
  code: string,
  message: string,
): StaticValueResult {
  return { ok: false, diagnostics: [diagnosticAt(expression, code, message)] };
}

function isFiniteNumber(value: LuaStaticValue): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function evaluateBinary(
  expression: BinaryExpression,
  left: number,
  right: number,
): number | undefined {
  switch (expression.operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return right === 0 ? undefined : left / right;
    default:
      return undefined;
  }
}

function readTable(expression: TableConstructorExpression): StaticValueResult {
  const arrayValues: LuaStaticValue[] = [];
  const objectValues: Record<string, LuaStaticValue> = {};
  let hasNamedFields = false;

  for (const field of expression.fields) {
    if (field.type === 'TableValue') {
      const value = readStaticValue(field.value);
      if (!value.ok) return value;
      arrayValues.push(value.value);
      continue;
    }

    if (field.type !== 'TableKeyString') {
      return failure(
        field,
        'lua.computed-index',
        'Table keys must use static identifier names',
      );
    }

    hasNamedFields = true;
    if (Object.hasOwn(objectValues, field.key.name)) {
      return failure(
        field,
        'lua.duplicate-field',
        `Duplicate table field ${field.key.name}`,
      );
    }
    const value = readStaticValue(field.value);
    if (!value.ok) return value;
    objectValues[field.key.name] = value.value;
  }

  if (hasNamedFields && arrayValues.length > 0) {
    return {
      ok: true,
      value: [...arrayValues, objectValues],
    };
  }
  return { ok: true, value: hasNamedFields ? objectValues : arrayValues };
}

export function readStaticValue(expression: Expression): StaticValueResult {
  switch (expression.type) {
    case 'StringLiteral':
      return { ok: true, value: expression.value };
    case 'NumericLiteral':
      return Number.isFinite(expression.value)
        ? { ok: true, value: expression.value }
        : failure(expression, 'lua.invalid-value', 'Number must be finite');
    case 'BooleanLiteral':
      return { ok: true, value: expression.value };
    case 'NilLiteral':
      return { ok: true, value: null };
    case 'Identifier': {
      const value = symbolicConstants[expression.name];
      return value === undefined
        ? failure(
            expression,
            'lua.unknown-identifier',
            `Unknown symbolic identifier ${expression.name}`,
          )
        : { ok: true, value };
    }
    case 'TableConstructorExpression':
      return readTable(expression);
    case 'UnaryExpression': {
      if (expression.operator !== '-') {
        return failure(
          expression,
          'lua.unsupported-expression',
          `Unary operator ${expression.operator} is not allowlisted`,
        );
      }
      const argument = readStaticValue(expression.argument);
      if (!argument.ok) return argument;
      return isFiniteNumber(argument.value)
        ? { ok: true, value: -argument.value }
        : failure(
            expression,
            'lua.invalid-value',
            'Unary numeric expressions require a finite number',
          );
    }
    case 'BinaryExpression': {
      const left = readStaticValue(expression.left);
      if (!left.ok) return left;
      const right = readStaticValue(expression.right);
      if (!right.ok) return right;
      if (!isFiniteNumber(left.value) || !isFiniteNumber(right.value)) {
        return failure(
          expression,
          'lua.invalid-value',
          'Arithmetic expressions require finite numbers',
        );
      }
      const value = evaluateBinary(expression, left.value, right.value);
      return value === undefined || !Number.isFinite(value)
        ? failure(
            expression,
            'lua.unsupported-expression',
            `Binary operator ${expression.operator} is not allowlisted`,
          )
        : { ok: true, value };
    }
    case 'IndexExpression':
      return failure(
        expression,
        'lua.computed-index',
        'Computed indexes are not allowlisted',
      );
    default:
      return failure(
        expression,
        'lua.unsupported-expression',
        `Expression ${expression.type} is not allowlisted`,
      );
  }
}

export function readRequiredString(
  expression: Expression,
  field: string,
): { readonly ok: true; readonly value: string } | StaticValueResult {
  const value = readStaticValue(expression);
  if (!value.ok) return value;
  return typeof value.value === 'string' && value.value.trim().length > 0
    ? { ok: true, value: value.value.trim() }
    : failure(
        expression,
        'lua.invalid-value',
        `${field} must be a non-empty string`,
      );
}

export function readRequiredNumber(
  expression: Expression,
  field: string,
): { readonly ok: true; readonly value: number } | StaticValueResult {
  const value = readStaticValue(expression);
  if (!value.ok) return value;
  return isFiniteNumber(value.value)
    ? { ok: true, value: value.value }
    : failure(
        expression,
        'lua.invalid-value',
        `${field} must be a finite number`,
      );
}
