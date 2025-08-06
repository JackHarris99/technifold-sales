-- Run this in Supabase SQL editor to properly support 'Other' category

-- Step 1: Drop existing constraint
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_product_group_check;

-- Step 2: Add new constraint with 'Other'
ALTER TABLE products 
ADD CONSTRAINT products_product_group_check 
CHECK (product_group IN ('Tool', 'Consumable', 'Other'));

-- Step 3: Update products that should be 'Other'
UPDATE products 
SET product_group = 'Other' 
WHERE product_group_detail = 'Other' 
  AND product_group = 'Consumable';

-- Verify the update
SELECT product_group, COUNT(*) 
FROM products 
GROUP BY product_group 
ORDER BY COUNT(*) DESC;