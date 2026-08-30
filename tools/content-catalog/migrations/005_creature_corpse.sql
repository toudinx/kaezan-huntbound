ALTER TABLE creatures
ADD COLUMN corpse_item_id INTEGER
CHECK (corpse_item_id IS NULL OR corpse_item_id >= 0);
