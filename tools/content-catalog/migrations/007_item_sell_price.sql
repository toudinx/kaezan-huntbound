ALTER TABLE items
ADD COLUMN sell_price INTEGER CHECK (sell_price IS NULL OR sell_price >= 0);
