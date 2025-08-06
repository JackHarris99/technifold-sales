-- Add 'Parts' to the product_group check constraint
-- First, we need to drop the existing constraint and create a new one

-- Drop the existing check constraint
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_product_group_check;

-- Add the new check constraint with 'Parts' included
ALTER TABLE products 
ADD CONSTRAINT products_product_group_check 
CHECK (product_group IN ('Tool', 'Consumable', 'Parts'));

-- Verify the change
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'products'::regclass 
AND contype = 'c';