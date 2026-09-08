ALTER TABLE items
ADD COLUMN attack INTEGER CHECK (attack IS NULL OR attack >= 0);

ALTER TABLE items
ADD COLUMN defense INTEGER CHECK (defense IS NULL OR defense >= 0);

ALTER TABLE items
ADD COLUMN armor INTEGER CHECK (armor IS NULL OR armor >= 0);

ALTER TABLE items
ADD COLUMN slot_type TEXT CHECK (slot_type IS NULL OR length(trim(slot_type)) > 0);

ALTER TABLE items
ADD COLUMN weapon_type TEXT CHECK (weapon_type IS NULL OR length(trim(weapon_type)) > 0);
