local mType = Game.createMonsterType("Fixture Rotbeast")
local monster = {}

monster.description = "a fixture rotbeast"
monster.experience = 61
monster.outfit = { lookType = 9026 }
monster.raceId = 9026
monster.health = 140
monster.speed = 83
monster.flags = { summonable = false, attackable = true, hostile = true }
monster.loot = {
  { id = 9301, chance = 42000, maxCount = 3 },
  { name = "fixture tonic", chance = 18000 },
}
monster.attacks = {
  { name = "melee", interval = 2100, chance = 100, minDamage = 0, maxDamage = -19 },
}
monster.defenses = {
  defense = 8,
  armor = 3,
}
mType:register(monster)
