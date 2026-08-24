ALTER TABLE spells
  ADD COLUMN range_tiles INTEGER CHECK (range_tiles IS NULL OR range_tiles >= 0);
