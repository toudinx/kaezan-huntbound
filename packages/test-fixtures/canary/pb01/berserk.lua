local combat = Combat()
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
spell:register()
