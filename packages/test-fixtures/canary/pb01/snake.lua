local mType = Game.createMonsterType("Fixture Serpent")
local monster = {}

monster.description = "a fixture serpent"
monster.experience = 21
monster.outfit = { lookType = 9028 }
monster.raceId = 9028
monster.health = 48
monster.speed = 108
monster.flags = { summonable = true, attackable = true, hostile = true }
monster.attacks = {
  { name = "melee", interval = 2000, chance = 100, minDamage = 0, maxDamage = -9, condition = { type = CONDITION_POISON, totalDamage = 18, interval = 3000 } },
}
mType:register(monster)
