import type { ContentDiagnostic } from '@huntbound/contracts';
import type {
  CallExpression,
  Expression,
  FunctionDeclaration,
  Node,
  Statement,
} from 'luaparse';

import type { CanaryParseResult } from '../sourceTypes.ts';
import { parseLuaChunk } from './luaAst.ts';
import { diagnosticAt } from './luaDiagnostics.ts';
import type { CanarySpellDto } from './luaTypes.ts';
import {
  readRequiredNumber,
  readRequiredString,
  readStaticValue,
} from './staticValues.ts';

type FormulaValues = CanarySpellDto['formula'];

interface SpellState {
  readonly damageType: string | undefined;
  readonly area:
    | { readonly shape: 'square'; readonly radius: number }
    | undefined;
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

const combatParameters = new Set([
  'COMBAT_PARAM_AGGRESSIVE',
  'COMBAT_PARAM_BLOCKARMOR',
  'COMBAT_PARAM_DISPEL',
  'COMBAT_PARAM_DISTANCEEFFECT',
  'COMBAT_PARAM_EFFECT',
  'COMBAT_PARAM_TYPE',
  'COMBAT_PARAM_USECHARGES',
]);

const combatDamageTypes = new Set([
  'physical',
  'energy',
  'earth',
  'fire',
  'ice',
  'holy',
  'death',
  'drown',
  'lifeDrain',
  'manaDrain',
  'healing',
]);

function pushDiagnostic(
  diagnostics: ContentDiagnostic[],
  node: Node | undefined,
  code: string,
  message: string,
): void {
  diagnostics.push(diagnosticAt(node, code, message));
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

function readNonNegativeInteger(
  expression: Expression | undefined,
  field: string,
  diagnostics: ContentDiagnostic[],
): number | undefined {
  const value = readNumber(expression, field, diagnostics);
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value < 0) {
    pushDiagnostic(
      diagnostics,
      expression,
      'lua.invalid-value',
      `${field} must be a non-negative integer`,
    );
    return undefined;
  }
  return value;
}

function readOneStaticString(
  expression: Expression | undefined,
  field: string,
  diagnostics: ContentDiagnostic[],
): string | undefined {
  return readString(expression, field, diagnostics);
}

function identifierIs(
  expression: Expression | undefined,
  name: string,
): boolean {
  return expression?.type === 'Identifier' && expression.name === name;
}

function numericLiteral(
  expression: Expression | undefined,
): number | undefined {
  return expression?.type === 'NumericLiteral' &&
    Number.isFinite(expression.value)
    ? expression.value
    : undefined;
}

function callGetLevel(expression: Expression | undefined): boolean {
  if (
    expression?.type !== 'CallExpression' ||
    expression.arguments.length !== 0
  )
    return false;
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
  if (expression?.type !== 'BinaryExpression' || expression.operator !== '/')
    return undefined;
  const denominator = numericLiteral(expression.right);
  return identifierIs(expression.left, 'level') &&
    denominator !== undefined &&
    denominator !== 0
    ? 1 / denominator
    : undefined;
}

function readSkillAttackTerm(expression: Expression | undefined):
  | {
      readonly minSkillAttackFactor: number;
      readonly maxSkillAttackFactor: number;
    }
  | undefined {
  if (expression?.type !== 'BinaryExpression' || expression.operator !== '*')
    return undefined;
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
):
  | { readonly levelFactor: number; readonly skillAttackFactor: number }
  | undefined {
  if (expression?.type !== 'BinaryExpression' || expression.operator !== '+')
    return undefined;
  const levelFactor = readLevelTerm(expression.left);
  const skillAttack = readSkillAttackTerm(expression.right);
  if (levelFactor === undefined || skillAttack === undefined) return undefined;
  return { levelFactor, skillAttackFactor: skillAttack.minSkillAttackFactor };
}

function readFormulaReturn(
  expression: Expression | undefined,
  variable: string,
): number | undefined {
  if (expression?.type !== 'BinaryExpression' || expression.operator !== '*')
    return undefined;
  if (
    expression.left.type !== 'UnaryExpression' ||
    expression.left.operator !== '-' ||
    !identifierIs(expression.left.argument, variable)
  ) {
    return undefined;
  }
  return numericLiteral(expression.right);
}

function readIdentTimesNumber(
  expression: Expression | undefined,
  name: string,
): number | undefined {
  if (expression?.type !== 'BinaryExpression' || expression.operator !== '*')
    return undefined;
  return identifierIs(expression.left, name)
    ? numericLiteral(expression.right)
    : undefined;
}

function readGetLevelDivided(
  expression: Expression | undefined,
): number | undefined {
  if (expression?.type !== 'BinaryExpression' || expression.operator !== '/')
    return undefined;
  const denominator = numericLiteral(expression.right);
  return callGetLevel(expression.left) &&
    denominator !== undefined &&
    denominator !== 0
    ? 1 / denominator
    : undefined;
}

function readSkillTimesAttack(expression: Expression | undefined): boolean {
  return (
    expression?.type === 'BinaryExpression' &&
    expression.operator === '*' &&
    identifierIs(expression.left, 'skill') &&
    identifierIs(expression.right, 'attack')
  );
}

function readProductReturn(
  expression: Expression | undefined,
  skillTotal: string,
  levelTotal: string,
):
  | {
      readonly factor: number;
      readonly addend: number;
      readonly multiplier: number;
    }
  | undefined {
  if (expression?.type !== 'BinaryExpression' || expression.operator !== '*')
    return undefined;
  const multiplier = numericLiteral(expression.right);
  if (
    multiplier === undefined ||
    expression.left.type !== 'UnaryExpression' ||
    expression.left.operator !== '-'
  ) {
    return undefined;
  }
  const inner = expression.left.argument;
  if (
    inner.type !== 'BinaryExpression' ||
    inner.operator !== '+' ||
    !identifierIs(inner.right, levelTotal)
  ) {
    return undefined;
  }
  const scaled = inner.left;
  if (scaled.type !== 'BinaryExpression' || scaled.operator !== '+')
    return undefined;
  const addend = numericLiteral(scaled.right);
  const product = scaled.left;
  if (
    addend === undefined ||
    product.type !== 'BinaryExpression' ||
    product.operator !== '*' ||
    !identifierIs(product.left, skillTotal)
  ) {
    return undefined;
  }
  const factor = numericLiteral(product.right);
  return factor === undefined ? undefined : { factor, addend, multiplier };
}

function readLevelMagicAssignment(expression: Expression | undefined):
  | {
      readonly levelFactor: number;
      readonly magicFactor: number;
      readonly addend: number;
    }
  | undefined {
  if (expression?.type !== 'BinaryExpression' || expression.operator !== '+')
    return undefined;
  const addend = numericLiteral(expression.right);
  const sum = expression.left;
  if (
    addend === undefined ||
    sum.type !== 'BinaryExpression' ||
    sum.operator !== '+'
  ) {
    return undefined;
  }
  const levelFactor = readIdentTimesNumber(sum.left, 'level');
  const magicFactor = readIdentTimesNumber(sum.right, 'magicLevel');
  return levelFactor === undefined || magicFactor === undefined
    ? undefined
    : { levelFactor, magicFactor, addend };
}

function parseSkillAttackFormula(
  declaration: FunctionDeclaration,
  diagnostics: ContentDiagnostic[],
): FormulaValues | undefined {
  const [levelStatement, minStatement, maxStatement, returnStatement] =
    declaration.body;
  if (
    levelStatement?.type !== 'LocalStatement' ||
    minStatement?.type !== 'LocalStatement' ||
    maxStatement?.type !== 'LocalStatement' ||
    returnStatement?.type !== 'ReturnStatement' ||
    declaration.body.length !== 4
  ) {
    pushDiagnostic(
      diagnostics,
      declaration,
      'lua.invalid-formula',
      'Formula body shape is not allowlisted',
    );
    return undefined;
  }
  if (
    levelStatement.variables.length !== 1 ||
    levelStatement.variables[0]?.name !== 'level' ||
    levelStatement.init.length !== 1 ||
    !callGetLevel(levelStatement.init[0])
  ) {
    pushDiagnostic(
      diagnostics,
      levelStatement,
      'lua.invalid-formula',
      'Formula level lookup is not allowlisted',
    );
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
  if (
    min === undefined ||
    max === undefined ||
    returnStatement.arguments.length !== 2
  ) {
    pushDiagnostic(
      diagnostics,
      declaration,
      'lua.invalid-formula',
      'Formula coefficients are not allowlisted',
    );
    return undefined;
  }
  const finalMultiplier = readFormulaReturn(
    returnStatement.arguments[0],
    'min',
  );
  const maxMultiplier = readFormulaReturn(returnStatement.arguments[1], 'max');
  if (
    finalMultiplier === undefined ||
    maxMultiplier === undefined ||
    finalMultiplier !== maxMultiplier ||
    min.levelFactor !== max.levelFactor
  ) {
    pushDiagnostic(
      diagnostics,
      returnStatement,
      'lua.invalid-formula',
      'Formula return expressions are not allowlisted',
    );
    return undefined;
  }
  return {
    kind: 'skillAttack',
    levelFactor: min.levelFactor,
    minSkillAttackFactor: min.skillAttackFactor,
    maxSkillAttackFactor: max.skillAttackFactor,
    finalMultiplier,
  };
}

function parseSkillAttackProductFormula(
  declaration: FunctionDeclaration,
  diagnostics: ContentDiagnostic[],
): FormulaValues | undefined {
  const [skillTotalStatement, levelTotalStatement, returnStatement] =
    declaration.body;
  if (
    skillTotalStatement?.type !== 'LocalStatement' ||
    levelTotalStatement?.type !== 'LocalStatement' ||
    returnStatement?.type !== 'ReturnStatement' ||
    declaration.body.length !== 3
  ) {
    pushDiagnostic(
      diagnostics,
      declaration,
      'lua.invalid-formula',
      'Formula body shape is not allowlisted',
    );
    return undefined;
  }
  if (
    skillTotalStatement.variables.length !== 1 ||
    skillTotalStatement.variables[0]?.name !== 'skillTotal' ||
    skillTotalStatement.init.length !== 1 ||
    !readSkillTimesAttack(skillTotalStatement.init[0])
  ) {
    pushDiagnostic(
      diagnostics,
      skillTotalStatement,
      'lua.invalid-formula',
      'Formula skill product is not allowlisted',
    );
    return undefined;
  }
  const levelFactor =
    levelTotalStatement.variables.length === 1 &&
    levelTotalStatement.variables[0]?.name === 'levelTotal' &&
    levelTotalStatement.init.length === 1
      ? readGetLevelDivided(levelTotalStatement.init[0])
      : undefined;
  if (levelFactor === undefined) {
    pushDiagnostic(
      diagnostics,
      levelTotalStatement,
      'lua.invalid-formula',
      'Formula level lookup is not allowlisted',
    );
    return undefined;
  }
  if (returnStatement.arguments.length !== 2) {
    pushDiagnostic(
      diagnostics,
      returnStatement,
      'lua.invalid-formula',
      'Formula return expressions are not allowlisted',
    );
    return undefined;
  }
  const min = readProductReturn(
    returnStatement.arguments[0],
    'skillTotal',
    'levelTotal',
  );
  const max = readProductReturn(
    returnStatement.arguments[1],
    'skillTotal',
    'levelTotal',
  );
  if (
    min === undefined ||
    max === undefined ||
    min.multiplier !== max.multiplier
  ) {
    pushDiagnostic(
      diagnostics,
      returnStatement,
      'lua.invalid-formula',
      'Formula return expressions are not allowlisted',
    );
    return undefined;
  }
  return {
    kind: 'skillAttackProduct',
    levelFactor,
    minSkillAttackFactor: min.factor,
    maxSkillAttackFactor: max.factor,
    minAddend: min.addend,
    maxAddend: max.addend,
    finalMultiplier: min.multiplier,
  };
}

function parseLevelMagicFormula(
  declaration: FunctionDeclaration,
  diagnostics: ContentDiagnostic[],
): FormulaValues | undefined {
  const [minStatement, maxStatement, returnStatement] = declaration.body;
  if (
    minStatement?.type !== 'LocalStatement' ||
    maxStatement?.type !== 'LocalStatement' ||
    returnStatement?.type !== 'ReturnStatement' ||
    declaration.body.length !== 3
  ) {
    pushDiagnostic(
      diagnostics,
      declaration,
      'lua.invalid-formula',
      'Formula body shape is not allowlisted',
    );
    return undefined;
  }
  const min =
    minStatement.variables.length === 1 &&
    minStatement.variables[0]?.name === 'min' &&
    minStatement.init.length === 1
      ? readLevelMagicAssignment(minStatement.init[0])
      : undefined;
  const max =
    maxStatement.variables.length === 1 &&
    maxStatement.variables[0]?.name === 'max' &&
    maxStatement.init.length === 1
      ? readLevelMagicAssignment(maxStatement.init[0])
      : undefined;
  if (
    min === undefined ||
    max === undefined ||
    min.levelFactor !== max.levelFactor ||
    returnStatement.arguments.length !== 2 ||
    !identifierIs(returnStatement.arguments[0], 'min') ||
    !identifierIs(returnStatement.arguments[1], 'max')
  ) {
    pushDiagnostic(
      diagnostics,
      declaration,
      'lua.invalid-formula',
      'Formula coefficients are not allowlisted',
    );
    return undefined;
  }
  return {
    kind: 'levelMagic',
    levelFactor: min.levelFactor,
    minMagicFactor: min.magicFactor,
    maxMagicFactor: max.magicFactor,
    minAddend: min.addend,
    maxAddend: max.addend,
  };
}

function parseFormula(
  declaration: FunctionDeclaration,
  diagnostics: ContentDiagnostic[],
): FormulaValues | undefined {
  const names = declaration.parameters.map((parameter) =>
    parameter.type === 'Identifier' ? parameter.name : undefined,
  );
  if (
    names.length === 4 &&
    names[0] === 'player' &&
    names[1] === 'skill' &&
    names[2] === 'attack' &&
    names[3] === 'factor'
  ) {
    if (declaration.body.length === 4)
      return parseSkillAttackFormula(declaration, diagnostics);
    if (declaration.body.length === 3)
      return parseSkillAttackProductFormula(declaration, diagnostics);
    pushDiagnostic(
      diagnostics,
      declaration,
      'lua.invalid-formula',
      'Formula body shape is not allowlisted',
    );
    return undefined;
  }
  if (
    names.length === 3 &&
    names[0] === 'player' &&
    names[1] === 'level' &&
    names[2] === 'magicLevel'
  ) {
    return parseLevelMagicFormula(declaration, diagnostics);
  }
  pushDiagnostic(
    diagnostics,
    declaration,
    'lua.invalid-formula',
    'Formula parameters are not allowlisted',
  );
  return undefined;
}

function isIgnoredCastCallback(declaration: FunctionDeclaration): boolean {
  const secondParameter = declaration.parameters[1];
  const secondName =
    secondParameter?.type === 'Identifier' ? secondParameter.name : undefined;
  if (
    declaration.identifier?.type !== 'MemberExpression' ||
    declaration.identifier.indexer !== '.' ||
    declaration.identifier.base.type !== 'Identifier' ||
    declaration.identifier.base.name !== 'spell' ||
    declaration.identifier.identifier.name !== 'onCastSpell' ||
    declaration.parameters.length !== 2 ||
    !identifierIs(declaration.parameters[0], 'creature') ||
    (secondName !== 'var' && secondName !== 'variant') ||
    declaration.body.length !== 1
  ) {
    return false;
  }
  const statement = declaration.body[0];
  if (statement?.type !== 'ReturnStatement' || statement.arguments.length !== 1)
    return false;
  const expression = statement.arguments[0];
  return (
    expression?.type === 'CallExpression' &&
    expression.arguments.length === 2 &&
    identifierIs(expression.arguments[0], 'creature') &&
    identifierIs(expression.arguments[1], secondName) &&
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
    pushDiagnostic(
      diagnostics,
      call,
      'lua.invalid-value',
      `${name} expects ${count} arguments`,
    );
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
    pushDiagnostic(
      diagnostics,
      call,
      'lua.unsupported-call',
      'Only allowlisted method calls are supported',
    );
    return;
  }
  if (base.base.name === 'combat') {
    if (base.indexer !== ':') {
      pushDiagnostic(
        diagnostics,
        call,
        'lua.unsupported-call',
        'Combat calls must use method syntax',
      );
      return;
    }
    if (base.identifier.name === 'setParameter') {
      const args = readMethodArguments(
        call,
        2,
        'combat:setParameter',
        diagnostics,
      );
      if (args === undefined) return;
      const parameter = readOneStaticString(
        args[0],
        'combat parameter',
        diagnostics,
      );
      if (parameter === undefined) return;
      if (!combatParameters.has(parameter)) {
        pushDiagnostic(
          diagnostics,
          args[0],
          'lua.invalid-value',
          `Unsupported combat parameter ${parameter}`,
        );
        return;
      }
      const valueExpression = args[1];
      if (valueExpression === undefined) {
        pushDiagnostic(
          diagnostics,
          call,
          'lua.invalid-value',
          'combat:setParameter requires a value',
        );
        return;
      }
      const value = readStaticValue(valueExpression);
      if (!value.ok) {
        diagnostics.push(...value.diagnostics);
        return;
      }
      if (parameter === 'COMBAT_PARAM_TYPE') {
        if (
          typeof value.value !== 'string' ||
          !combatDamageTypes.has(value.value)
        ) {
          pushDiagnostic(
            diagnostics,
            valueExpression,
            'lua.invalid-value',
            'COMBAT_PARAM_TYPE requires a known combat damage type',
          );
        } else {
          state.damageType = value.value;
        }
      }
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
        pushDiagnostic(
          diagnostics,
          call,
          'lua.unsupported-call',
          'Only createCombatArea is allowlisted',
        );
        return;
      }
      const area = readOneStaticString(
        areaCall.arguments[0],
        'combat area',
        diagnostics,
      );
      if (area !== 'AREA_SQUARE1X1') {
        pushDiagnostic(
          diagnostics,
          areaCall,
          'lua.invalid-value',
          'Only AREA_SQUARE1X1 is allowlisted',
        );
        return;
      }
      state.area = { shape: 'square', radius: 1 };
      return;
    }
    if (base.identifier.name === 'setCallback') {
      const args = readMethodArguments(
        call,
        2,
        'combat:setCallback',
        diagnostics,
      );
      if (args === undefined) return;
      const callbackParameter = readOneStaticString(
        args[0],
        'callback parameter',
        diagnostics,
      );
      const callbackName = readOneStaticString(
        args[1],
        'callback name',
        diagnostics,
      );
      if (
        (callbackParameter !== 'CALLBACK_PARAM_SKILLVALUE' &&
          callbackParameter !== 'CALLBACK_PARAM_LEVELMAGICVALUE') ||
        callbackName !== 'onGetFormulaValues'
      ) {
        pushDiagnostic(
          diagnostics,
          call,
          'lua.invalid-value',
          'Only the skill-value and level-magic callbacks are allowlisted',
        );
      }
      return;
    }
    pushDiagnostic(
      diagnostics,
      call,
      'lua.unsupported-call',
      `Unsupported combat method ${base.identifier.name}`,
    );
    return;
  }
  if (base.base.name !== 'spell' || base.indexer !== ':') {
    pushDiagnostic(
      diagnostics,
      call,
      'lua.unsupported-call',
      'Only combat and spell methods are supported',
    );
    return;
  }
  const method = base.identifier.name;
  if (method === 'register') {
    if (call.arguments.length !== 0)
      pushDiagnostic(
        diagnostics,
        call,
        'lua.invalid-value',
        'spell:register expects no arguments',
      );
    else state.registered = true;
    return;
  }
  if (method === 'vocation') {
    if (call.arguments.length === 0) {
      pushDiagnostic(
        diagnostics,
        call,
        'lua.invalid-value',
        'spell:vocation expects at least one vocation',
      );
      return;
    }
    for (const argument of call.arguments) {
      const raw = readString(argument, 'vocation', diagnostics);
      if (raw === undefined) continue;
      const name = raw.split(';', 1)[0]?.trim();
      if (name === undefined || name.length === 0)
        pushDiagnostic(
          diagnostics,
          argument,
          'lua.invalid-value',
          'Vocation name must not be empty',
        );
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
    if (args !== undefined && args[0]?.type !== 'BooleanLiteral')
      pushDiagnostic(
        diagnostics,
        args[0],
        'lua.invalid-value',
        `spell:${method} expects a boolean`,
      );
    return;
  }
  if (
    method === 'needTarget' ||
    method === 'blockWalls' ||
    method === 'isSelfTarget' ||
    method === 'isAggressive'
  ) {
    const args = readMethodArguments(call, 1, `spell:${method}`, diagnostics);
    if (args !== undefined && args[0]?.type !== 'BooleanLiteral')
      pushDiagnostic(
        diagnostics,
        args[0],
        'lua.invalid-value',
        `spell:${method} expects a boolean`,
      );
    return;
  }
  if (method === 'range') {
    const args = readMethodArguments(call, 1, 'spell:range', diagnostics);
    if (args !== undefined)
      readNonNegativeInteger(args[0], 'spell range', diagnostics);
    return;
  }
  if (
    method === 'id' ||
    method === 'level' ||
    method === 'mana' ||
    method === 'cooldown' ||
    method === 'groupCooldown'
  ) {
    const args = readMethodArguments(call, 1, `spell:${method}`, diagnostics);
    const value =
      args === undefined
        ? undefined
        : readNonNegativeInteger(args[0], `spell ${method}`, diagnostics);
    if (method === 'id') state.sourceId = value;
    else if (method === 'level') state.level = value;
    else if (method === 'mana') state.mana = value;
    else if (method === 'cooldown') state.cooldownMs = value;
    else state.groupCooldownMs = value;
    return;
  }
  if (method === 'name' || method === 'words') {
    const args = readMethodArguments(call, 1, `spell:${method}`, diagnostics);
    const value =
      args === undefined
        ? undefined
        : readString(args[0], `spell ${method}`, diagnostics);
    if (method === 'name') state.displayName = value;
    else state.words = value;
    return;
  }
  pushDiagnostic(
    diagnostics,
    call,
    'lua.unsupported-call',
    `Unsupported spell method ${method}`,
  );
}

function collectSpell(
  lua: string,
):
  | { readonly ok: true; readonly state: SpellState }
  | { readonly ok: false; readonly diagnostics: readonly ContentDiagnostic[] } {
  const parsed = parseLuaChunk(lua);
  if (!parsed.ok) return parsed;
  const diagnostics: ContentDiagnostic[] = [];
  const mutable = {
    damageType: undefined as string | undefined,
    area: undefined as
      | { readonly shape: 'square'; readonly radius: number }
      | undefined,
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
        variable?.name === 'combat' &&
        initializer?.type === 'CallExpression' &&
        initializer.base.type === 'Identifier' &&
        initializer.base.name === 'Combat' &&
        initializer.arguments.length === 0
      ) {
        combatDeclared = true;
        anchor ??= statement;
        continue;
      }
      if (
        variable?.name === 'spell' &&
        initializer?.type === 'CallExpression' &&
        initializer.base.type === 'Identifier' &&
        initializer.base.name === 'Spell' &&
        initializer.arguments.length === 1
      ) {
        const kind = readString(
          initializer.arguments[0],
          'spell kind',
          diagnostics,
        );
        if (kind !== 'instant')
          pushDiagnostic(
            diagnostics,
            initializer,
            'lua.invalid-value',
            'Only instant spells are allowlisted',
          );
        spellDeclared = true;
        anchor ??= statement;
        continue;
      }
      pushDiagnostic(
        diagnostics,
        statement,
        'lua.unsupported-statement',
        'Only combat and spell locals are allowlisted',
      );
      continue;
    }
    if (statement.type === 'CallStatement') {
      if (statement.expression.type !== 'CallExpression') {
        pushDiagnostic(
          diagnostics,
          statement,
          'lua.unsupported-call',
          'Only regular call expressions are allowlisted',
        );
      } else {
        parseSpellCall(statement.expression, mutable, diagnostics);
      }
      continue;
    }
    if (statement.type === 'FunctionDeclaration') {
      if (
        statement.identifier?.type === 'Identifier' &&
        statement.identifier.name === 'onGetFormulaValues'
      ) {
        mutable.formula = parseFormula(statement, diagnostics);
      } else if (!isIgnoredCastCallback(statement)) {
        pushDiagnostic(
          diagnostics,
          statement,
          'lua.unsupported-statement',
          'Unexpected function declaration',
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
  if (!combatDeclared)
    pushDiagnostic(
      diagnostics,
      anchor,
      'lua.missing-field',
      'Combat declaration is required',
    );
  if (!spellDeclared)
    pushDiagnostic(
      diagnostics,
      anchor,
      'lua.missing-field',
      'Spell declaration is required',
    );
  if (!mutable.registered)
    pushDiagnostic(
      diagnostics,
      anchor,
      'lua.missing-field',
      'spell:register() is required',
    );
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

export function parseCanarySpellLua(
  lua: string,
): CanaryParseResult<CanarySpellDto> {
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
    ['formula', state.formula],
  ];
  for (const [field, value] of required) {
    if (value === undefined)
      pushDiagnostic(
        diagnostics,
        state.anchor,
        'lua.missing-field',
        `${field} is required`,
      );
  }
  if (state.vocationNames.length === 0)
    pushDiagnostic(
      diagnostics,
      state.anchor,
      'lua.missing-field',
      'At least one vocation is required',
    );
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
      ...(state.area === undefined ? {} : { area: state.area }),
      formula: state.formula as FormulaValues,
    },
  };
}
