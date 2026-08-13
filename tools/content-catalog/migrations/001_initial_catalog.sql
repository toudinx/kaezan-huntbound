PRAGMA foreign_keys = ON;

CREATE TABLE schema_migrations (
  id INTEGER PRIMARY KEY CHECK (id > 0),
  filename TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL CHECK (sha256 NOT GLOB '*[^0-9a-f]*' AND length(sha256) = 64),
  applied_at TEXT NOT NULL
);

CREATE TABLE source_snapshots (
  source_system TEXT NOT NULL CHECK (source_system = 'canary'),
  snapshot TEXT NOT NULL CHECK (length(trim(snapshot)) > 0),
  PRIMARY KEY (source_system, snapshot)
);

CREATE TABLE source_files (
  source_system TEXT NOT NULL CHECK (source_system = 'canary'),
  snapshot TEXT NOT NULL,
  source_path TEXT NOT NULL CHECK (length(trim(source_path)) > 0),
  source_id TEXT NOT NULL CHECK (length(trim(source_id)) > 0),
  source_sha256 TEXT NOT NULL CHECK (source_sha256 NOT GLOB '*[^0-9a-f]*' AND length(source_sha256) = 64),
  PRIMARY KEY (source_system, snapshot, source_path),
  UNIQUE (source_system, snapshot, source_path, source_id, source_sha256),
  FOREIGN KEY (source_system, snapshot)
    REFERENCES source_snapshots (source_system, snapshot) ON DELETE RESTRICT
);

CREATE TABLE content_identity_ledger (
  guid TEXT PRIMARY KEY,
  stable_key TEXT NOT NULL UNIQUE,
  identity_source_system TEXT NOT NULL CHECK (identity_source_system = 'tibia'),
  entity_kind TEXT NOT NULL CHECK (entity_kind IN ('vocation', 'creature', 'item', 'spell')),
  source_id TEXT NOT NULL CHECK (length(trim(source_id)) > 0),
  first_seen_slice_key TEXT NOT NULL,
  UNIQUE (guid, stable_key, identity_source_system, entity_kind, source_id),
  CHECK (
    (entity_kind = 'vocation' AND stable_key LIKE 'vocation:tibia:%') OR
    (entity_kind = 'creature' AND stable_key LIKE 'creature:tibia:%') OR
    (entity_kind = 'item' AND stable_key LIKE 'item:tibia:%') OR
    (entity_kind = 'spell' AND stable_key LIKE 'spell:tibia:%')
  )
);

CREATE TABLE content_alias_registry (
  source_system TEXT NOT NULL CHECK (source_system = 'tibia'),
  alias TEXT NOT NULL CHECK (length(trim(alias)) > 0),
  entity_guid TEXT NOT NULL,
  PRIMARY KEY (source_system, alias),
  UNIQUE (source_system, alias, entity_guid),
  FOREIGN KEY (entity_guid)
    REFERENCES content_identity_ledger (guid) ON DELETE RESTRICT
);

CREATE TABLE content_slices (
  slice_key TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL CHECK (length(trim(schema_version)) > 0),
  content_version TEXT NOT NULL CHECK (length(trim(content_version)) > 0),
  objective TEXT NOT NULL CHECK (length(trim(objective)) > 0),
  consumer TEXT NOT NULL CHECK (length(trim(consumer)) > 0),
  snapshot TEXT NOT NULL,
  dependency_mode TEXT NOT NULL CHECK (dependency_mode = 'reachable-only'),
  curation_state TEXT NOT NULL CHECK (curation_state IN ('draft', 'accepted')),
  export_version TEXT NOT NULL CHECK (length(trim(export_version)) > 0),
  source_system TEXT NOT NULL DEFAULT 'canary' CHECK (source_system = 'canary'),
  FOREIGN KEY (source_system, snapshot)
    REFERENCES source_snapshots (source_system, snapshot) ON DELETE RESTRICT
);

CREATE TABLE content_entities (
  guid TEXT PRIMARY KEY,
  stable_key TEXT NOT NULL UNIQUE,
  entity_kind TEXT NOT NULL CHECK (entity_kind IN ('vocation', 'creature', 'item', 'spell')),
  identity_source_system TEXT NOT NULL CHECK (identity_source_system = 'tibia'),
  source_id TEXT NOT NULL CHECK (length(trim(source_id)) > 0),
  FOREIGN KEY (guid, stable_key, identity_source_system, entity_kind, source_id)
    REFERENCES content_identity_ledger (guid, stable_key, identity_source_system, entity_kind, source_id)
    ON DELETE RESTRICT,
  CHECK (
    (entity_kind = 'vocation' AND stable_key LIKE 'vocation:tibia:%') OR
    (entity_kind = 'creature' AND stable_key LIKE 'creature:tibia:%') OR
    (entity_kind = 'item' AND stable_key LIKE 'item:tibia:%') OR
    (entity_kind = 'spell' AND stable_key LIKE 'spell:tibia:%')
  )
);

CREATE TABLE content_slice_entities (
  slice_key TEXT NOT NULL,
  entity_guid TEXT NOT NULL,
  entity_kind TEXT NOT NULL CHECK (entity_kind IN ('vocation', 'creature', 'item', 'spell')),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
  source_system TEXT NOT NULL CHECK (source_system = 'canary'),
  snapshot TEXT NOT NULL,
  source_path TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_sha256 TEXT NOT NULL CHECK (source_sha256 NOT GLOB '*[^0-9a-f]*' AND length(source_sha256) = 64),
  PRIMARY KEY (slice_key, entity_guid),
  UNIQUE (slice_key, entity_guid, entity_kind),
  FOREIGN KEY (slice_key) REFERENCES content_slices (slice_key) ON DELETE RESTRICT,
  FOREIGN KEY (entity_guid) REFERENCES content_entities (guid) ON DELETE RESTRICT,
  FOREIGN KEY (source_system, snapshot, source_path)
    REFERENCES source_files (source_system, snapshot, source_path)
    ON DELETE RESTRICT
);

CREATE TABLE content_aliases (
  slice_key TEXT NOT NULL,
  source_system TEXT NOT NULL CHECK (source_system = 'tibia'),
  alias TEXT NOT NULL CHECK (length(trim(alias)) > 0),
  entity_guid TEXT NOT NULL,
  PRIMARY KEY (slice_key, source_system, alias),
  FOREIGN KEY (slice_key, entity_guid)
    REFERENCES content_slice_entities (slice_key, entity_guid) ON DELETE RESTRICT,
  FOREIGN KEY (source_system, alias, entity_guid)
    REFERENCES content_alias_registry (source_system, alias, entity_guid) ON DELETE RESTRICT
);

CREATE TABLE content_entity_facets (
  slice_key TEXT NOT NULL,
  entity_guid TEXT NOT NULL,
  facet TEXT NOT NULL CHECK (facet IN ('identity', 'stats', 'appearance', 'combat', 'conditions', 'loot', 'item', 'progression', 'spell')),
  payload_sha256 TEXT NOT NULL CHECK (payload_sha256 NOT GLOB '*[^0-9a-f]*' AND length(payload_sha256) = 64),
  consumer TEXT NOT NULL CHECK (length(trim(consumer)) > 0),
  rationale TEXT NOT NULL CHECK (length(trim(rationale)) > 0),
  PRIMARY KEY (slice_key, entity_guid, facet),
  FOREIGN KEY (slice_key, entity_guid)
    REFERENCES content_slice_entities (slice_key, entity_guid) ON DELETE RESTRICT
);

CREATE TABLE content_slice_roots (
  slice_key TEXT NOT NULL,
  entity_guid TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  PRIMARY KEY (slice_key, entity_guid),
  UNIQUE (slice_key, ordinal),
  FOREIGN KEY (slice_key, entity_guid)
    REFERENCES content_slice_entities (slice_key, entity_guid) ON DELETE RESTRICT
);

CREATE TABLE vocation_families (
  family_key TEXT PRIMARY KEY CHECK (family_key LIKE 'vocation-family:huntbound:%')
);

CREATE TABLE content_slice_vocation_families (
  slice_key TEXT NOT NULL,
  family_key TEXT NOT NULL,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
  PRIMARY KEY (slice_key, family_key),
  FOREIGN KEY (slice_key) REFERENCES content_slices (slice_key) ON DELETE RESTRICT,
  FOREIGN KEY (family_key) REFERENCES vocation_families (family_key) ON DELETE RESTRICT
);

CREATE TABLE vocations (
  slice_key TEXT NOT NULL,
  entity_guid TEXT NOT NULL,
  entity_kind TEXT NOT NULL DEFAULT 'vocation' CHECK (entity_kind = 'vocation'),
  family_key TEXT NOT NULL,
  gain_hp REAL NOT NULL CHECK (typeof(gain_hp) IN ('integer', 'real') AND gain_hp = gain_hp AND gain_hp >= 0),
  gain_mana REAL NOT NULL CHECK (typeof(gain_mana) IN ('integer', 'real') AND gain_mana = gain_mana AND gain_mana >= 0),
  gain_capacity REAL NOT NULL CHECK (typeof(gain_capacity) IN ('integer', 'real') AND gain_capacity = gain_capacity AND gain_capacity >= 0),
  base_speed INTEGER NOT NULL CHECK (base_speed >= 0),
  attack_speed_ms INTEGER NOT NULL CHECK (attack_speed_ms >= 0),
  mana_multiplier REAL NOT NULL CHECK (typeof(mana_multiplier) IN ('integer', 'real') AND mana_multiplier = mana_multiplier AND mana_multiplier > 0),
  PRIMARY KEY (slice_key, entity_guid),
  FOREIGN KEY (slice_key, entity_guid, entity_kind)
    REFERENCES content_slice_entities (slice_key, entity_guid, entity_kind) ON DELETE RESTRICT,
  FOREIGN KEY (slice_key, family_key)
    REFERENCES content_slice_vocation_families (slice_key, family_key) ON DELETE RESTRICT
);

CREATE TABLE vocation_family_members (
  slice_key TEXT NOT NULL,
  family_key TEXT NOT NULL,
  vocation_guid TEXT NOT NULL,
  PRIMARY KEY (slice_key, family_key, vocation_guid),
  FOREIGN KEY (slice_key, family_key)
    REFERENCES content_slice_vocation_families (slice_key, family_key) ON DELETE RESTRICT,
  FOREIGN KEY (slice_key, vocation_guid)
    REFERENCES vocations (slice_key, entity_guid) ON DELETE RESTRICT
);

CREATE TABLE vocation_skill_multipliers (
  slice_key TEXT NOT NULL,
  vocation_guid TEXT NOT NULL,
  skill TEXT NOT NULL CHECK (length(trim(skill)) > 0),
  multiplier REAL NOT NULL CHECK (typeof(multiplier) IN ('integer', 'real') AND multiplier = multiplier AND multiplier >= 0),
  PRIMARY KEY (slice_key, vocation_guid, skill),
  FOREIGN KEY (slice_key, vocation_guid)
    REFERENCES vocations (slice_key, entity_guid) ON DELETE RESTRICT
);

CREATE TABLE creatures (
  slice_key TEXT NOT NULL,
  entity_guid TEXT NOT NULL,
  entity_kind TEXT NOT NULL DEFAULT 'creature' CHECK (entity_kind = 'creature'),
  health INTEGER NOT NULL CHECK (health >= 0),
  experience INTEGER NOT NULL CHECK (experience >= 0),
  speed INTEGER NOT NULL CHECK (speed >= 0),
  look_type INTEGER NOT NULL CHECK (look_type >= 0),
  PRIMARY KEY (slice_key, entity_guid),
  FOREIGN KEY (slice_key, entity_guid, entity_kind)
    REFERENCES content_slice_entities (slice_key, entity_guid, entity_kind) ON DELETE RESTRICT
);

CREATE TABLE creature_attacks (
  slice_key TEXT NOT NULL,
  creature_guid TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  kind TEXT NOT NULL CHECK (kind IN ('melee', 'ranged', 'area')),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  interval_ms INTEGER NOT NULL CHECK (interval_ms >= 0),
  chance_basis_points INTEGER NOT NULL CHECK (chance_basis_points BETWEEN 0 AND 10000),
  damage_type TEXT NOT NULL CHECK (damage_type IN ('physical', 'fire', 'ice', 'energy', 'earth', 'holy', 'death', 'poison', 'healing')),
  min_damage REAL NOT NULL CHECK (typeof(min_damage) IN ('integer', 'real') AND min_damage = min_damage AND min_damage >= 0),
  max_damage REAL NOT NULL CHECK (typeof(max_damage) IN ('integer', 'real') AND max_damage = max_damage AND max_damage >= min_damage),
  range_tiles INTEGER,
  projectile TEXT,
  shape TEXT,
  radius_tiles INTEGER,
  PRIMARY KEY (slice_key, creature_guid, ordinal),
  FOREIGN KEY (slice_key, creature_guid)
    REFERENCES creatures (slice_key, entity_guid) ON DELETE RESTRICT,
  CHECK (
    (kind = 'melee' AND range_tiles IS NULL AND projectile IS NULL AND shape IS NULL AND radius_tiles IS NULL) OR
    (kind = 'ranged' AND range_tiles IS NOT NULL AND range_tiles >= 0 AND projectile IS NOT NULL AND length(trim(projectile)) > 0 AND shape IS NULL AND radius_tiles IS NULL) OR
    (kind = 'area' AND range_tiles IS NULL AND projectile IS NULL AND shape = 'square' AND radius_tiles IS NOT NULL AND radius_tiles >= 0)
  )
);

CREATE TABLE creature_defenses (
  slice_key TEXT NOT NULL,
  creature_guid TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  kind TEXT NOT NULL CHECK (kind = 'heal'),
  interval_ms INTEGER NOT NULL CHECK (interval_ms >= 0),
  chance_basis_points INTEGER NOT NULL CHECK (chance_basis_points BETWEEN 0 AND 10000),
  min_amount REAL NOT NULL CHECK (typeof(min_amount) IN ('integer', 'real') AND min_amount = min_amount AND min_amount >= 0),
  max_amount REAL NOT NULL CHECK (typeof(max_amount) IN ('integer', 'real') AND max_amount = max_amount AND max_amount >= min_amount),
  PRIMARY KEY (slice_key, creature_guid, ordinal),
  FOREIGN KEY (slice_key, creature_guid)
    REFERENCES creatures (slice_key, entity_guid) ON DELETE RESTRICT
);

CREATE TABLE creature_conditions (
  slice_key TEXT NOT NULL,
  creature_guid TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  kind TEXT NOT NULL CHECK (kind = 'poison'),
  total_damage REAL NOT NULL CHECK (typeof(total_damage) IN ('integer', 'real') AND total_damage = total_damage AND total_damage >= 0),
  interval_ms INTEGER NOT NULL CHECK (interval_ms > 0),
  PRIMARY KEY (slice_key, creature_guid, ordinal),
  FOREIGN KEY (slice_key, creature_guid)
    REFERENCES creatures (slice_key, entity_guid) ON DELETE RESTRICT
);

CREATE TABLE creature_summons (
  slice_key TEXT NOT NULL,
  creature_guid TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  target_guid TEXT NOT NULL,
  count INTEGER NOT NULL CHECK (count > 0),
  chance_basis_points INTEGER NOT NULL CHECK (chance_basis_points BETWEEN 0 AND 10000),
  PRIMARY KEY (slice_key, creature_guid, ordinal),
  FOREIGN KEY (slice_key, creature_guid)
    REFERENCES creatures (slice_key, entity_guid) ON DELETE RESTRICT,
  FOREIGN KEY (slice_key, target_guid)
    REFERENCES creatures (slice_key, entity_guid) ON DELETE RESTRICT
);

CREATE TABLE creature_resistances (
  slice_key TEXT NOT NULL,
  creature_guid TEXT NOT NULL,
  damage_type TEXT NOT NULL,
  value REAL NOT NULL CHECK (typeof(value) IN ('integer', 'real') AND value = value),
  PRIMARY KEY (slice_key, creature_guid, damage_type),
  FOREIGN KEY (slice_key, creature_guid)
    REFERENCES creatures (slice_key, entity_guid) ON DELETE RESTRICT
);

CREATE TABLE creature_immunities (
  slice_key TEXT NOT NULL,
  creature_guid TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  immunity TEXT NOT NULL CHECK (length(trim(immunity)) > 0),
  PRIMARY KEY (slice_key, creature_guid, ordinal),
  FOREIGN KEY (slice_key, creature_guid)
    REFERENCES creatures (slice_key, entity_guid) ON DELETE RESTRICT
);

CREATE TABLE items (
  slice_key TEXT NOT NULL,
  entity_guid TEXT NOT NULL,
  entity_kind TEXT NOT NULL DEFAULT 'item' CHECK (entity_kind = 'item'),
  stackable INTEGER CHECK (stackable IS NULL OR stackable IN (0, 1)),
  max_stack_size INTEGER CHECK (max_stack_size IS NULL OR max_stack_size > 0),
  weight REAL CHECK (weight IS NULL OR (typeof(weight) IN ('integer', 'real') AND weight = weight AND weight >= 0)),
  PRIMARY KEY (slice_key, entity_guid),
  FOREIGN KEY (slice_key, entity_guid, entity_kind)
    REFERENCES content_slice_entities (slice_key, entity_guid, entity_kind) ON DELETE RESTRICT
);

CREATE TABLE loot_entries (
  slice_key TEXT NOT NULL,
  creature_guid TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  item_guid TEXT NOT NULL,
  chance_per_hundred_thousand INTEGER NOT NULL CHECK (chance_per_hundred_thousand BETWEEN 0 AND 100000),
  min_count INTEGER NOT NULL CHECK (min_count > 0),
  max_count INTEGER NOT NULL CHECK (max_count >= min_count),
  PRIMARY KEY (slice_key, creature_guid, ordinal),
  FOREIGN KEY (slice_key, creature_guid)
    REFERENCES creatures (slice_key, entity_guid) ON DELETE RESTRICT,
  FOREIGN KEY (slice_key, item_guid)
    REFERENCES items (slice_key, entity_guid) ON DELETE RESTRICT
);

CREATE TABLE spells (
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
  formula_kind TEXT NOT NULL CHECK (formula_kind = 'skillAttack'),
  level_factor REAL NOT NULL CHECK (typeof(level_factor) IN ('integer', 'real') AND level_factor = level_factor),
  min_skill_attack_factor REAL NOT NULL CHECK (typeof(min_skill_attack_factor) IN ('integer', 'real') AND min_skill_attack_factor = min_skill_attack_factor),
  max_skill_attack_factor REAL NOT NULL CHECK (typeof(max_skill_attack_factor) IN ('integer', 'real') AND max_skill_attack_factor = max_skill_attack_factor AND max_skill_attack_factor >= min_skill_attack_factor),
  final_multiplier REAL NOT NULL CHECK (typeof(final_multiplier) IN ('integer', 'real') AND final_multiplier = final_multiplier),
  PRIMARY KEY (slice_key, entity_guid),
  FOREIGN KEY (slice_key, entity_guid, entity_kind)
    REFERENCES content_slice_entities (slice_key, entity_guid, entity_kind) ON DELETE RESTRICT,
  CHECK (
    (area_shape IS NULL AND area_radius_tiles IS NULL) OR
    (area_shape = 'square' AND area_radius_tiles IS NOT NULL AND area_radius_tiles >= 0)
  )
);

CREATE TABLE spell_vocation_families (
  slice_key TEXT NOT NULL,
  spell_guid TEXT NOT NULL,
  family_key TEXT NOT NULL,
  PRIMARY KEY (slice_key, spell_guid, family_key),
  FOREIGN KEY (slice_key, spell_guid)
    REFERENCES spells (slice_key, entity_guid) ON DELETE RESTRICT,
  FOREIGN KEY (slice_key, family_key)
    REFERENCES content_slice_vocation_families (slice_key, family_key) ON DELETE RESTRICT
);

CREATE TABLE spell_source_vocation_refs (
  slice_key TEXT NOT NULL,
  spell_guid TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  raw_reference TEXT NOT NULL CHECK (length(trim(raw_reference)) > 0),
  relation TEXT NOT NULL CHECK (relation = 'allowed-vocation-family'),
  target_family_key TEXT NOT NULL,
  PRIMARY KEY (slice_key, spell_guid, ordinal),
  FOREIGN KEY (slice_key, spell_guid)
    REFERENCES spells (slice_key, entity_guid) ON DELETE RESTRICT,
  FOREIGN KEY (slice_key, target_family_key)
    REFERENCES content_slice_vocation_families (slice_key, family_key) ON DELETE RESTRICT
);
