PRAGMA foreign_keys = OFF;

CREATE TABLE spells_new (
  slice_key TEXT NOT NULL,
  entity_guid TEXT NOT NULL,
  entity_kind TEXT NOT NULL DEFAULT 'spell' CHECK (entity_kind = 'spell'),
  words TEXT NOT NULL CHECK (length(trim(words)) > 0),
  level INTEGER NOT NULL CHECK (level >= 0),
  mana INTEGER NOT NULL CHECK (mana >= 0),
  cooldown_ms INTEGER NOT NULL CHECK (cooldown_ms >= 0),
  group_cooldown_ms INTEGER NOT NULL CHECK (group_cooldown_ms >= 0),
  damage_type TEXT NOT NULL CHECK (damage_type IN ('physical', 'fire', 'ice', 'energy', 'earth', 'holy', 'death', 'poison', 'healing')),
  area_shape TEXT,
  area_radius_tiles INTEGER,
  formula_kind TEXT NOT NULL CHECK (formula_kind IN ('skillAttack', 'skillAttackProduct', 'levelMagic')),
  formula_json TEXT NOT NULL CHECK (json_valid(formula_json) AND json_extract(formula_json, '$.kind') = formula_kind),
  PRIMARY KEY (slice_key, entity_guid),
  FOREIGN KEY (slice_key, entity_guid, entity_kind)
    REFERENCES content_slice_entities (slice_key, entity_guid, entity_kind) ON DELETE RESTRICT,
  CHECK (
    (area_shape IS NULL AND area_radius_tiles IS NULL) OR
    (area_shape = 'square' AND area_radius_tiles IS NOT NULL AND area_radius_tiles >= 0)
  )
);

INSERT INTO spells_new (
  slice_key,
  entity_guid,
  entity_kind,
  words,
  level,
  mana,
  cooldown_ms,
  group_cooldown_ms,
  damage_type,
  area_shape,
  area_radius_tiles,
  formula_kind,
  formula_json
)
SELECT
  slice_key,
  entity_guid,
  entity_kind,
  words,
  level,
  mana,
  cooldown_ms,
  group_cooldown_ms,
  damage_type,
  area_shape,
  area_radius_tiles,
  formula_kind,
  json_object(
    'kind', formula_kind,
    'levelFactor', level_factor,
    'minSkillAttackFactor', min_skill_attack_factor,
    'maxSkillAttackFactor', max_skill_attack_factor,
    'finalMultiplier', final_multiplier
  )
FROM spells;

DROP TABLE spells;
ALTER TABLE spells_new RENAME TO spells;

CREATE TABLE characters (
  slice_key TEXT NOT NULL,
  stable_key TEXT NOT NULL CHECK (stable_key LIKE 'character:huntbound:%'),
  vocation_key TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 0),
  weapon_item_key TEXT NOT NULL,
  weapon_attack INTEGER NOT NULL CHECK (weapon_attack >= 0),
  max_health INTEGER NOT NULL CHECK (max_health > 0),
  max_mana INTEGER NOT NULL CHECK (max_mana > 0),
  PRIMARY KEY (slice_key, stable_key),
  FOREIGN KEY (slice_key) REFERENCES content_slices (slice_key) ON DELETE RESTRICT
);

CREATE TABLE character_skills (
  slice_key TEXT NOT NULL,
  character_key TEXT NOT NULL,
  skill TEXT NOT NULL CHECK (skill IN ('sword', 'magic')),
  value REAL NOT NULL CHECK (typeof(value) IN ('integer', 'real') AND value = value AND value >= 0),
  PRIMARY KEY (slice_key, character_key, skill),
  FOREIGN KEY (slice_key, character_key)
    REFERENCES characters (slice_key, stable_key) ON DELETE RESTRICT
);

CREATE TABLE character_spells (
  slice_key TEXT NOT NULL,
  character_key TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  spell_key TEXT NOT NULL,
  PRIMARY KEY (slice_key, character_key, ordinal),
  UNIQUE (slice_key, character_key, spell_key),
  FOREIGN KEY (slice_key, character_key)
    REFERENCES characters (slice_key, stable_key) ON DELETE RESTRICT
);

PRAGMA foreign_keys = ON;
