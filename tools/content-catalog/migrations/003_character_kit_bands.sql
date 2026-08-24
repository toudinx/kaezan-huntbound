CREATE TABLE character_kit_bands (
  slice_key TEXT NOT NULL,
  character_key TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  min_level INTEGER NOT NULL CHECK (min_level > 0),
  max_level INTEGER CHECK (max_level IS NULL OR max_level >= min_level),
  PRIMARY KEY (slice_key, character_key, ordinal),
  FOREIGN KEY (slice_key, character_key)
    REFERENCES characters (slice_key, stable_key) ON DELETE RESTRICT
);

CREATE TABLE character_kit_band_spells (
  slice_key TEXT NOT NULL,
  character_key TEXT NOT NULL,
  band_ordinal INTEGER NOT NULL CHECK (band_ordinal >= 0),
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  spell_key TEXT NOT NULL CHECK (spell_key LIKE 'spell:tibia:%'),
  PRIMARY KEY (slice_key, character_key, band_ordinal, ordinal),
  UNIQUE (slice_key, character_key, band_ordinal, spell_key),
  FOREIGN KEY (slice_key, character_key, band_ordinal)
    REFERENCES character_kit_bands (slice_key, character_key, ordinal)
    ON DELETE RESTRICT
);
