local mType = Game.createMonsterType("Fixture Archer")
local monster = {}

monster.description = "a fixture archer"
monster.experience = 74
monster.outfit = { lookType = 9077 }
monster.raceId = 9077
monster.health = 175
monster.speed = 96
monster.flags = { summonable = true, attackable = true, hostile = true }
monster.loot = {
  { id = 9302, chance = 26000, maxCount = 2 },
}
monster.attacks = {
  { name = "melee", interval = 1900, chance = 100, minDamage = 0, maxDamage = -13 },
  { name = "ranged", interval = 2700, chance = 24, type = COMBAT_PHYSICALDAMAGE, minDamage = 0, maxDamage = -22, range = 6, shootEffect = CONST_ANI_ARROW, target = false },
}
mType:register(monster)
