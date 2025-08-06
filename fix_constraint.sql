-- Fix the product_group constraint to allow more values
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_group_check;
ALTER TABLE products ADD CONSTRAINT products_product_group_check 
CHECK (product_group IN ('Tool', 'Consumable', 'Other', 'Machine', 'Accessory'));
