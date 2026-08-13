import { describe, expect, it } from 'vitest';

import * as runtimeContent from '../../../index';
import { parseCanarySpellLua } from './parseSpellLua';

const fixture = `local combat = Combat()
combat:setParameter(COMBAT_PARAM_TYPE, COMBAT_PHYSICALDAMAGE)
combat:setArea(createCombatArea(AREA_SQUARE1X1))

function onGetFormulaValues(player, skill, attack, factor)
  local level = player:getLevel()
  local min = (level / 6) + (skill + attack) * 0.4
  local max = (level / 6) + (skill + attack) * 0.9
  return -min * 1.2, -max * 1.2
end

combat:setCallback(CALLBACK_PARAM_SKILLVALUE, "onGetFormulaValues")
local spell = Spell("instant")
spell:id(9080)
spell:name("Fixture Berserk")
spell:words("fixture exori")
spell:level(27)
spell:mana(83)
spell:cooldown(5 * 1000)
spell:groupCooldown(3 * 1000)
spell:vocation("knight;true", "elite knight;true")
spell:register()`;

const realLikeFixture = `local combat = Combat()
combat:setParameter(COMBAT_PARAM_TYPE, COMBAT_PHYSICALDAMAGE)
combat:setParameter(COMBAT_PARAM_EFFECT, CONST_ME_HITAREA)
combat:setArea(createCombatArea(AREA_SQUARE1X1))

function onGetFormulaValues(player, skill, attack, factor)
  local level = player:getLevel()
  local min = (level / 5) + (skill + attack) * 0.5
  local max = (level / 5) + (skill + attack) * 1.5
  return -min * 1.1, -max * 1.1
end

combat:setCallback(CALLBACK_PARAM_SKILLVALUE, "onGetFormulaValues")
local spell = Spell("instant")
function spell.onCastSpell(creature, var)
  return combat:execute(creature, var)
end
spell:group("attack")
spell:id(80)
spell:name("Berserk")
spell:words("exori")
spell:level(35)
spell:mana(115)
spell:isPremium(true)
spell:needWeapon(true)
spell:cooldown(4 * 1000)
spell:groupCooldown(2 * 1000)
spell:vocation("knight;true", "elite knight;true")
spell:register()`;

function diagnosticsOf<T>(result: { readonly ok: boolean; readonly diagnostics?: readonly T[] }) {
  return result.ok ? [] : (result.diagnostics ?? []);
}

describe('parseCanarySpellLua', () => {
  it('maps Berserk metadata, area, vocations and declarative formula', () => {
    const result = parseCanarySpellLua(fixture);

    expect(result).toEqual({
      ok: true,
      value: {
        sourceId: '9080',
        displayName: 'Fixture Berserk',
        words: 'fixture exori',
        level: 27,
        mana: 83,
        cooldownMs: 5000,
        groupCooldownMs: 3000,
        vocationNames: ['knight', 'elite knight'],
        damageType: 'physical',
        area: { shape: 'square', radius: 1 },
        formula: {
          kind: 'skillAttack',
          levelFactor: 1 / 6,
          minSkillAttackFactor: 0.4,
          maxSkillAttackFactor: 0.9,
          finalMultiplier: 1.2,
        },
      },
    });
  });

  it('maps the real Berserk shape and keeps both raw vocation names', () => {
    const result = parseCanarySpellLua(realLikeFixture);

    expect(result).toMatchObject({
      ok: true,
      value: {
        sourceId: '80',
        displayName: 'Berserk',
        cooldownMs: 4000,
        groupCooldownMs: 2000,
        vocationNames: ['knight', 'elite knight'],
        formula: {
          levelFactor: 0.2,
          minSkillAttackFactor: 0.5,
          maxSkillAttackFactor: 1.5,
          finalMultiplier: 1.1,
        },
      },
    });
  });

  it('rejects a formula whose return operator is changed', () => {
    const invalid = fixture.replace('return -min * 1.2, -max * 1.2', 'return -min + 1.2, -max * 1.2');
    const result = parseCanarySpellLua(invalid);

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'lua.invalid-formula' }),
      ]),
    );
  });

  it('rejects a missing spell ID', () => {
    const result = parseCanarySpellLua(fixture.replace('spell:id(9080)\n', ''));

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'lua.missing-field' }),
      ]),
    );
  });

  it('rejects unknown methods and arbitrary callback bodies', () => {
    const unknownMethod = parseCanarySpellLua(fixture.replace('spell:mana(83)', 'spell:unknown(83)'));
    const arbitraryCallback = parseCanarySpellLua(
      fixture.replace(
        'local level = player:getLevel()',
        'local level = dofile("level")',
      ),
    );

    expect(diagnosticsOf(unknownMethod)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'lua.unsupported-call' }),
      ]),
    );
    expect(diagnosticsOf(arbitraryCallback)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'lua.invalid-formula' }),
      ]),
    );
  });

  it('rejects dofile and require at the source boundary', () => {
    for (const source of ['local x = dofile("x")', 'local x = require("x")']) {
      const result = parseCanarySpellLua(source);
      expect(diagnosticsOf(result)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: expect.stringMatching(/^lua\./),
            line: expect.any(Number),
            column: expect.any(Number),
          }),
        ]),
      );
    }
  });

  it('keeps Lua adapters outside the runtime entrypoint', () => {
    expect(runtimeContent).not.toHaveProperty('parseCanarySpellLua');
  });
});
