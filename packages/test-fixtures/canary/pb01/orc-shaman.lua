local mType = Game.createMonsterType("Fixture Ember Sage")
local monster = {}

monster.description = "a fixture ember sage"
monster.experience = 89
monster.outfit = { lookType = 9006 }
monster.raceId = 9006
monster.health = 230
monster.speed = 71
monster.flags = { summonable = false, attackable = true, hostile = true }
monster.summon = {
  maxSummons = 2,
  summons = {
    { name = "Fixture Serpent", chance = 22, interval = 2300, count = 1 },
  },
}
monster.loot = {
  { id = 9301, chance = 31000, maxCount = 4 },
}
monster.attacks = {
  { name = "melee", interval = 2200, chance = 100, minDamage = 0, maxDamage = -11 },
  { name = "bolt", interval = 2800, chance = 18, type = COMBAT_ENERGYDAMAGE, minDamage = -7, maxDamage = -29, range = 7, shootEffect = CONST_ANI_ENERGYBALL, target = false },
  { name = "burst", interval = 3300, chance = 9, type = COMBAT_FIREDAMAGE, minDamage = -4, maxDamage = -26, radius = 1, shootEffect = CONST_ANI_FIRE, target = true },
  { name = "restore", interval = 4100, chance = 33, type = COMBAT_HEALING, minDamage = 12, maxDamage = 25, effect = CONST_ME_MAGIC_BLUE, target = false },
}
mType:register(monster)
