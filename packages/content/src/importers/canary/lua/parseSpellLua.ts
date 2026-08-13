import type {
  BinaryExpression,
  CallExpression,
  Expression,
  FunctionDeclaration,
  Identifier,
  MemberExpression,
  Node,
  Statement,
} from 'luaparse';
import type { ContentDiagnostic } from '@huntbound/contracts';

import type { CanaryParseResult } from '../sourceTypes';
import { parseLuaChunk } from './luaAst';
import { diagnosticAt } from './luaDiagnostics';
import { readRequiredNumber, readRequiredString, readStaticValue } from './staticValues';
import type { CanarySpellDto } from './luaTypes';

interface FormulaValues {
  readonly levelFactor: number;
  readonly minSkillAttackFactor: number;
  readonly maxSkillAttackFactor: number;
  readonly finalMultiplier: number;
}

interface SpellState {
  readonly damageType: string | undefined;
  readonly area: { readonly shape: 'square'; readonly radius: number } | undefined;
  readonly formula: FormulaValues | undefined;
  readonly sourceId: number | undefined;
  readonly displayName: string | undefined;
  readonly words: string | undefined;
  readonly level: number | undefined;
  readonly mana: number | undefined;
  readonly cooldownMs: number | undefined;
  readonly groupCooldownMs: number | undefined;
  readonly vocationNames: readonly string[];
  readonly registered: boolean;
  readonly anchor: Statement | undefined;
}

function pushDiagnostic(
  diagnostics: ContentDiagnostic[],
  node: Node | undefined,
  code: string,
  message: string,
): void {
  diagnostics.push(diagnosticAt(node, code, message));
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

function readString(
  expression: Expression | undefined,
  field: string,
  diagnostics: ContentDiagnostic[],
): string | undefined {
  if (expression === undefined) {
    pushDiagnostic(diagnostics, undefined, 'lua.missing-field', `${field} is required`);
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
    pushDiagnostic(diagnostics, undefined, 'lua.missing-field', `${field} is required`);
    return undefined;
  }
  const result = readRequiredNumber(expression, field);
  if (!result.ok) {
    diagnostics.push(...result.diagnostics);
    return undefined;
  }
  return typeof result.value === 'number' ? result.value : undefined;
}

function readNonNegativeInteger(
  expression: Expression | undefined,
  field: string,
  diagnostics: ContentDiagnostic[],
): number | undefined {
  const value = readNumber(expression, field, diagnostics);
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value < 0) {
    pushDiagnostic(diagnostics, expression, 'lua.invalid-value', `${field} must be a non-negative integer`);
    return undefined;
  }
  return value;
}

function readCallNumber(
  call: CallExpression,
  field: string,
  diagnostics: ContentDiagnostic[],
): number | undefined {
  if (call.arguments.length !== 1) {
    pushDiagnostic(diagnostics, call, 'lua.invalid-value', `${field} expects one argument`);
    return undefined;
  }
  return readNonNegativeInteger(call.arguments[0], field, diagnostics);
}

function readOneStaticString(
  expression: Expression | undefined,
  field: string,
  diagnostics: ContentDiagnostic[],
): string | undefined {
  return readString(expression, field, diagnostics);
}

function identifierIs(expression: Expression | undefined, name: string): boolean {
  return expression?.type === 'Identifier' && expression.name === name;
}

function numericLiteral(expression: Expression | undefined): number | undefined {
  return expression?.type === 'NumericLiteral' && Number.isFinite(expression.value)
    ? expression.value
    : undefined;
}

function callGetLevel(expression: Expression | undefined): boolean {
  if (expression?.type !== 'CallExpression' || expression.arguments.length !== 0) return false;
  const base = expression.base;
  return (
    base.type === 'MemberExpression' &&
    base.indexer === ':' &&
    base.base.type === 'Identifier' &&
    base.base.name === 'player' &&
    base.identifier.name === 'getLevel'
  );
}

function readLevelTerm(expression: Expression | undefined): number | undefined {
  if (expression?.type !== 'BinaryExpression' || expression.operator !== '/') return undefined;
  const denominator = numericLiteral(expression.right);
  return identifierIs(expression.left, 'level') && denominator !== undefined && denominator !== 0
    ? 1 / denominator
    : undefined;
}

function readSkillAttackTerm(expression: Expression | undefined): {
  readonly minSkillAttackFactor: number;
  readonly maxSkillAttackFactor: number;
} | undefined {
  if (expression?.type !== 'BinaryExpression' || expression.operator !== '*') return undefined;
  if (
    expression.left.type !== 'BinaryExpression' ||
    expression.left.operator !== '+' ||
    !identifierIs(expression.left.left, 'skill') ||
    !identifierIs(expression.left.right, 'attack')
  ) {
    return undefined;
  }
  const factor = numericLiteral(expression.right);
  return factor === undefined
    ? undefined
    : { minSkillAttackFactor: factor, maxSkillAttackFactor: factor };
}

function readFormulaAssignment(
  expression: Expression | undefined,
): { readonly levelFactor: number; readonly skillAttackFactor: number } | undefined {
  if (expression?.type !== 'BinaryExpression' || expression.operator !== '+') return undefined;
  const levelFactor = readLevelTerm(expression.left);
  const skillAttack = readSkillAttackTerm(expression.right);
  if (levelFactor === undefined || skillAttack === undefined) return undefined;
  return { levelFactor, skillAttackFactor: skillAttack.minSkillAttackFactor };
}

function readFormulaReturn(
  expression: Expression | undefined,
  variable: string,
): number | undefined {
  if (expression?.type !== 'BinaryExpression' || expression.operator !== '*') return undefined;
  if (
    expression.left.type !== 'UnaryExpression' ||
    expression.left.operator !== '-' ||
    !identifierIs(expression.left.argument, variable)
  ) {
    return undefined;
  }
  return numericLiteral(expression.right);
}

function parseFormula(
  declaration: FunctionDeclaration,
  diagnostics: ContentDiagnostic[],
): FormulaValues | undefined {
  const parameters = declaration.parameters;
  const expected = ['player', 'skill', 'attack', 'factor'];
  if (
    parameters.length !== expected.length ||
    parameters.some((parameter, index) => parameter.type !== 'Identifier' || parameter.name !== expected[index])
  ) {
    pushDiagnostic(diagnostics, declaration, 'lua.invalid-formula', 'Formula parameters are not allowlisted');
    return undefined;
  }
  const [levelStatement, minStatement, maxStatement, returnStatement] = declaration.body;
  if (
    levelStatement?.type !== 'LocalStatement' ||
    minStatement?.type !== 'LocalStatement' ||
    maxStatement?.type !== 'LocalStatement' ||
    returnStatement?.type !== 'ReturnStatement' ||
    declaration.body.length !== 4
  ) {
    pushDiagnostic(diagnostics, declaration, 'lua.invalid-formula', 'Formula body shape is not allowlisted');
    return undefined;
  }
  if (
    levelStatement.variables.length !== 1 ||
    levelStatement.variables[0]?.name !== 'level' ||
    levelStatement.init.length !== 1 ||
    !callGetLevel(levelStatement.init[0])
  ) {
    pushDiagnostic(diagnostics, levelStatement, 'lua.invalid-formula', 'Formula level lookup is not allowlisted');
    return undefined;
  }
  const min =
    minStatement.variables.length === 1 &&
    minStatement.variables[0]?.name === 'min' &&
    minStatement.init.length === 1
      ? readFormulaAssignment(minStatement.init[0])
      : undefined;
  const max =
    maxStatement.variables.length === 1 &&
    maxStatement.variables[0]?.name === 'max' &&
    maxStatement.init.length === 1
      ? readFormulaAssignment(maxStatement.init[0])
      : undefined;
  if (min === undefined || max === undefined || returnStatement.arguments.length !== 2) {
    pushDiagnostic(diagnostics, declaration, 'lua.invalid-formula', 'Formula coefficients are not allowlisted');
    return undefined;
  }
  const finalMultiplier = readFormulaReturn(returnStatement.arguments[0], 'min');
  const maxMultiplier = readFormulaReturn(returnStatement.arguments[1], 'max');
  if (
    finalMultiplier === undefined ||
    maxMultiplier === undefined ||
    finalMultiplier !== maxMultiplier ||
    min.levelFactor !== max.levelFactor
  ) {
    pushDiagnostic(diagnostics, returnStatement, 'lua.invalid-formula', 'Formula return expressions are not allowlisted');
    return undefined;
  }
  return {
    levelFactor: min.levelFactor,
    minSkillAttackFactor: min.skillAttackFactor,
    maxSkillAttackFactor: max.skillAttackFactor,
    finalMultiplier,
  };
}

function isIgnoredCastCallback(declaration: FunctionDeclaration): boolean {
  if (
    declaration.identifier?.type !== 'MemberExpression' ||
    declaration.identifier.indexer !== '.' ||
    declaration.identifier.base.type !== 'Identifier' ||
    declaration.identifier.base.name !== 'spell' ||
    declaration.identifier.identifier.name !== 'onCastSpell' ||
    declaration.parameters.length !== 2 ||
    !identifierIs(declaration.parameters[0], 'creature') ||
    !identifierIs(declaration.parameters[1], 'var') ||
    declaration.body.length !== 1
  ) {
    return false;
  }
  const statement = declaration.body[0];
  if (statement?.type !== 'ReturnStatement' || statement.arguments.length !== 1) return false;
  const expression = statement.arguments[0];
  return (
    expression?.type === 'CallExpression' &&
    expression.arguments.length === 2 &&
    identifierIs(expression.arguments[0], 'creature') &&
    identifierIs(expression.arguments[1], 'var') &&
    expression.base.type === 'MemberExpression' &&
    expression.base.indexer === ':' &&
    expression.base.base.type === 'Identifier' &&
    expression.base.base.name === 'combat' &&
    expression.base.identifier.name === 'execute'
  );
}

function readMethodArguments(
  call: CallExpression,
  count: number,
  name: string,
  diagnostics: ContentDiagnostic[],
): readonly Expression[] | undefined {
  if (call.arguments.length !== count) {
    pushDiagnostic(diagnostics, call, 'lua.invalid-value', `${name} expects ${count} arguments`);
    return undefined;
  }
  return call.arguments;
}

function parseSpellCall(
  call: CallExpression,
  state: {
    damageType: string | undefined;
    area: { readonly shape: 'square'; readonly radius: number } | undefined;
    sourceId: number | undefined;
    displayName: string | undefined;
    words: string | undefined;
    level: number | undefined;
    mana: number | undefined;
    cooldownMs: number | undefined;
    groupCooldownMs: number | undefined;
    vocationNames: string[];
    registered: boolean;
  },
  diagnostics: ContentDiagnostic[],
): void {
  const base = call.base;
  if (base.type !== 'MemberExpression' || base.base.type !== 'Identifier') {
    pushDiagnostic(diagnostics, call, 'lua.unsupported-call', 'Only allowlisted method calls are supported');
    return;
  }
  if (base.base.name === 'combat') {
    if (base.indexer !== ':') {
      pushDiagnostic(diagnostics, call, 'lua.unsupported-call', 'Combat calls must use method syntax');
      return;
    }
    if (base.identifier.name === 'setParameter') {
      const args = readMethodArguments(call, 2, 'combat:setParameter', diagnostics);
      if (args === undefined) return;
      const parameter = readOneStaticString(args[0], 'combat parameter', diagnostics);
      const value = readOneStaticString(args[1], 'combat parameter value', diagnostics);
      if (parameter === 'COMBAT_PARAM_TYPE' && value !== undefined) state.damageType = value;
      return;
    }
    if (base.identifier.name === 'setArea') {
      const args = readMethodArguments(call, 1, 'combat:setArea', diagnostics);
      const areaCall = args?.[0];
      if (
        areaCall?.type !== 'CallExpression' ||
        areaCall.arguments.length !== 1 ||
        areaCall.base.type !== 'Identifier' ||
        areaCall.base.name !== 'createCombatArea'
      ) {
        pushDiagnostic(diagnostics, call, 'lua.unsupported-call', 'Only createCombatArea is allowlisted');
        return;
      }
      const area = readOneStaticString(areaCall.arguments[0], 'combat area', diagnostics);
      if (area !== 'AREA_SQUARE1X1') {
        pushDiagnostic(diagnostics, areaCall, 'lua.invalid-value', 'Only AREA_SQUARE1X1 is allowlisted');
        return;
      }
      state.area = { shape: 'square', radius: 1 };
      return;
    }
    if (base.identifier.name === 'setCallback') {
      const args = readMethodArguments(call, 2, 'combat:setCallback', diagnostics);
      if (args === undefined) return;
      const callbackParameter = readOneStaticString(args[0], 'callback parameter', diagnostics);
      const callbackName = readOneStaticString(args[1], 'callback name', diagnostics);
      if (callbackParameter !== 'CALLBACK_PARAM_SKILLVALUE' || callbackName !== 'onGetFormulaValues') {
        pushDiagnostic(diagnostics, call, 'lua.invalid-value', 'Only the skill-value callback is allowlisted');
      }
      return;
    }
    pushDiagnostic(diagnostics, call, 'lua.unsupported-call', `Unsupported combat method ${base.identifier.name}`);
    return;
  }
  if (base.base.name !== 'spell' || base.indexer !== ':') {
    pushDiagnostic(diagnostics, call, 'lua.unsupported-call', 'Only combat and spell methods are supported');
    return;
  }
  const method = base.identifier.name;
  if (method === 'register') {
    if (call.arguments.length !== 0) pushDiagnostic(diagnostics, call, 'lua.invalid-value', 'spell:register expects no arguments');
    else state.registered = true;
    return;
  }
  if (method === 'vocation') {
    if (call.arguments.length === 0) {
      pushDiagnostic(diagnostics, call, 'lua.invalid-value', 'spell:vocation expects at least one vocation');
      return;
    }
    for (const argument of call.arguments) {
      const raw = readString(argument, 'vocation', diagnostics);
      if (raw === undefined) continue;
      const name = raw.split(';', 1)[0]?.trim();
      if (name === undefined || name.length === 0) pushDiagnostic(diagnostics, argument, 'lua.invalid-value', 'Vocation name must not be empty');
      else state.vocationNames.push(name);
    }
    return;
  }
  const ignoredStringMethods = new Set(['group', 'castSound']);
  if (ignoredStringMethods.has(method)) {
    const args = readMethodArguments(call, 1, `spell:${method}`, diagnostics);
    if (args !== undefined) {
      const argument = args[0];
      if (argument !== undefined) {
        const value = readStaticValue(argument);
        if (!value.ok) diagnostics.push(...value.diagnostics);
      }
    }
    return;
  }
  if (method === 'isPremium' || method === 'needWeapon') {
    const args = readMethodArguments(call, 1, `spell:${method}`, diagnostics);
    if (args !== undefined && args[0]?.type !== 'BooleanLiteral') pushDiagnostic(diagnostics, args[0], 'lua.invalid-value', `spell:${method} expects a boolean`);
    return;
  }
  if (method === 'id' || method === 'level' || method === 'mana' || method === 'cooldown' || method === 'groupCooldown') {
    const args = readMethodArguments(call, 1, `spell:${method}`, diagnostics);
    const value = args === undefined ? undefined : readNonNegativeInteger(args[0], `spell ${method}`, diagnostics);
    if (method === 'id') state.sourceId = value;
    else if (method === 'level') state.level = value;
    else if (method === 'mana') state.mana = value;
    else if (method === 'cooldown') state.cooldownMs = value;
    else state.groupCooldownMs = value;
    return;
  }
  if (method === 'name' || method === 'words') {
    const args = readMethodArguments(call, 1, `spell:${method}`, diagnostics);
    const value = args === undefined ? undefined : readString(args[0], `spell ${method}`, diagnostics);
    if (method === 'name') state.displayName = value;
    else state.words = value;
    return;
  }
  pushDiagnostic(diagnostics, call, 'lua.unsupported-call', `Unsupported spell method ${method}`);
}

function collectSpell(lua: string):
  | { readonly ok: true; readonly state: SpellState }
  | { readonly ok: false; readonly diagnostics: readonly ContentDiagnostic[] } {
  const parsed = parseLuaChunk(lua);
  if (!parsed.ok) return parsed;
  const diagnostics: ContentDiagnostic[] = [];
  const mutable = {
    damageType: undefined as string | undefined,
    area: undefined as { readonly shape: 'square'; readonly radius: number } | undefined,
    sourceId: undefined as number | undefined,
    displayName: undefined as string | undefined,
    words: undefined as string | undefined,
    level: undefined as number | undefined,
    mana: undefined as number | undefined,
    cooldownMs: undefined as number | undefined,
    groupCooldownMs: undefined as number | undefined,
    vocationNames: [] as string[],
    registered: false,
    formula: undefined as FormulaValues | undefined,
  };
  let combatDeclared = false;
  let spellDeclared = false;
  let anchor: Statement | undefined;

  for (const statement of parsed.value.body) {
    if (statement.type === 'LocalStatement') {
      if (statement.variables.length !== 1 || statement.init.length !== 1) {
        pushDiagnostic(diagnostics, statement, 'lua.unsupported-statement', 'Local declarations must bind one value');
        continue;
      }
      const variable = statement.variables[0];
      const initializer = statement.init[0];
      if (variable?.name === 'combat' && initializer?.type === 'CallExpression' && initializer.base.type === 'Identifier' && initializer.base.name === 'Combat' && initializer.arguments.length === 0) {
        combatDeclared = true;
        anchor ??= statement;
        continue;
      }
      if (variable?.name === 'spell' && initializer?.type === 'CallExpression' && initializer.base.type === 'Identifier' && initializer.base.name === 'Spell' && initializer.arguments.length === 1) {
        const kind = readString(initializer.arguments[0], 'spell kind', diagnostics);
        if (kind !== 'instant') pushDiagnostic(diagnostics, initializer, 'lua.invalid-value', 'Only instant spells are allowlisted');
        spellDeclared = true;
        anchor ??= statement;
        continue;
      }
      pushDiagnostic(diagnostics, statement, 'lua.unsupported-statement', 'Only combat and spell locals are allowlisted');
      continue;
    }
    if (statement.type === 'CallStatement') {
      if (statement.expression.type !== 'CallExpression') {
        pushDiagnostic(diagnostics, statement, 'lua.unsupported-call', 'Only regular call expressions are allowlisted');
      } else {
        parseSpellCall(statement.expression, mutable, diagnostics);
      }
      continue;
    }
    if (statement.type === 'FunctionDeclaration') {
      if (statement.identifier?.type === 'Identifier' && statement.identifier.name === 'onGetFormulaValues') {
        mutable.formula = parseFormula(statement, diagnostics);
      } else if (!isIgnoredCastCallback(statement)) {
        pushDiagnostic(diagnostics, statement, 'lua.unsupported-statement', 'Unexpected function declaration');
      }
      continue;
    }
    pushDiagnostic(diagnostics, statement, 'lua.unsupported-statement', `Statement ${statement.type} is not allowlisted`);
  }
  if (!combatDeclared) pushDiagnostic(diagnostics, anchor, 'lua.missing-field', 'Combat declaration is required');
  if (!spellDeclared) pushDiagnostic(diagnostics, anchor, 'lua.missing-field', 'Spell declaration is required');
  if (!mutable.registered) pushDiagnostic(diagnostics, anchor, 'lua.missing-field', 'spell:register() is required');
  if (diagnostics.length > 0) return { ok: false, diagnostics };
  return {
    ok: true,
    state: {
      damageType: mutable.damageType,
      area: mutable.area,
      formula: mutable.formula,
      sourceId: mutable.sourceId,
      displayName: mutable.displayName,
      words: mutable.words,
      level: mutable.level,
      mana: mutable.mana,
      cooldownMs: mutable.cooldownMs,
      groupCooldownMs: mutable.groupCooldownMs,
      vocationNames: mutable.vocationNames,
      registered: mutable.registered,
      anchor,
    },
  };
}

export function parseCanarySpellLua(lua: string): CanaryParseResult<CanarySpellDto> {
  const collected = collectSpell(lua);
  if (!collected.ok) return collected;
  const state = collected.state;
  const diagnostics: ContentDiagnostic[] = [];
  const required: readonly [string, unknown][] = [
    ['sourceId', state.sourceId],
    ['displayName', state.displayName],
    ['words', state.words],
    ['level', state.level],
    ['mana', state.mana],
    ['cooldownMs', state.cooldownMs],
    ['groupCooldownMs', state.groupCooldownMs],
    ['damageType', state.damageType],
    ['area', state.area],
    ['formula', state.formula],
  ];
  for (const [field, value] of required) {
    if (value === undefined) pushDiagnostic(diagnostics, state.anchor, 'lua.missing-field', `${field} is required`);
  }
  if (state.vocationNames.length === 0) pushDiagnostic(diagnostics, state.anchor, 'lua.missing-field', 'At least one vocation is required');
  if (diagnostics.length > 0) return { ok: false, diagnostics };
  return {
    ok: true,
    value: {
      sourceId: String(state.sourceId),
      displayName: state.displayName as string,
      words: state.words as string,
      level: state.level as number,
      mana: state.mana as number,
      cooldownMs: state.cooldownMs as number,
      groupCooldownMs: state.groupCooldownMs as number,
      vocationNames: state.vocationNames,
      damageType: state.damageType as string,
      area: state.area as { readonly shape: 'square'; readonly radius: number },
      formula: {
        kind: 'skillAttack',
        ...(state.formula as FormulaValues),
      },
    },
  };
}
