const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixProductsImport() {
  console.log('🔧 FIXING PRODUCTS IMPORT...\n');
  
  // Read the CSV
  const productsPath = path.join(__dirname, '../../Product_Sales_Summary.csv 05-08-2025.csv');
  const productsData = fs.readFileSync(productsPath, 'utf-8');
  const productsCSV = csv.parse(productsData, { columns: true, skip_empty_lines: true });
  
  console.log(`📄 Found ${productsCSV.length} products in CSV\n`);
  
  // First, delete all existing products to start fresh
  console.log('🗑️  Clearing existing products...');
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (deleteError) {
    console.error('Error clearing products:', deleteError);
    return;
  }
  
  console.log('✅ Existing products cleared\n');
  
  // Prepare all products for import
  const productsToInsert = productsCSV.map(p => {
    // Determine product group
    let productGroup = p.product_group;
    
    // If empty or invalid, determine based on product code or description
    if (!productGroup || productGroup.trim() === '') {
      // Try to determine from code or description
      const code = p.product_code.toUpperCase();
      const desc = (p.description || '').toLowerCase();
      
      if (code.startsWith('FF-') || code.startsWith('EF-') || code.startsWith('TC-') || 
          code.startsWith('MT-') || code.startsWith('PD-') || code.startsWith('SC-') ||
          code.startsWith('SHC-') || code.startsWith('QC-') || code.startsWith('CP-AP-') ||
          desc.includes('tri-creaser') || desc.includes('tool') || desc.includes('creaser') ||
          desc.includes('perforator')) {
        productGroup = 'Tool';
      } else if (code.startsWith('MOULD-') || code.startsWith('MPB-') || code.startsWith('CB-') ||
                 code.startsWith('CK-') || code.startsWith('RS-') || code.startsWith('TWS-') ||
                 desc.includes('mould') || desc.includes('blade') || desc.includes('rubber') ||
                 desc.includes('sleeve') || desc.includes('receiver')) {
        productGroup = 'Consumable';
      } else {
        // Default based on original value
        productGroup = (p.product_group === 'Tool' || p.product_group === 'Machine') ? 'Tool' : 'Consumable';
      }
    } else if (!['Tool', 'Consumable'].includes(productGroup)) {
      // Map Other, Machine, etc.
      if (productGroup === 'Machine' || productGroup === 'Other') {
        // Check if it's really a tool based on description
        const desc = (p.description || '').toLowerCase();
        if (desc.includes('creaser') || desc.includes('perforator') || desc.includes('tool')) {
          productGroup = 'Tool';
        } else {
          productGroup = 'Consumable';
        }
      } else {
        productGroup = 'Consumable';
      }
    }
    
    return {
      product_code: p.product_code.trim(),
      description: p.description?.trim() || null,
      sales_price: parseFloat(p.sales_price) || null,
      cost_price: parseFloat(p.cost_price) || null,
      product_group: productGroup,
      product_group_detail: p.product_group_detail?.trim() || p.product_group || null,
      image_url: `/product_images/${p.product_code.trim()}.jpg`
    };
  });
  
  // Count by group
  const toolCount = productsToInsert.filter(p => p.product_group === 'Tool').length;
  const consumableCount = productsToInsert.filter(p => p.product_group === 'Consumable').length;
  
  console.log(`📦 Prepared for import:`);
  console.log(`   - Tools: ${toolCount}`);
  console.log(`   - Consumables: ${consumableCount}`);
  console.log(`   - Total: ${productsToInsert.length}\n`);
  
  // Import in batches of 100
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < productsToInsert.length; i += batchSize) {
    const batch = productsToInsert.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('products')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`❌ Error in batch ${i / batchSize + 1}:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += data.length;
      process.stdout.write(`\r⏳ Importing... ${successCount}/${productsToInsert.length}`);
    }
  }
  
  console.log('\n');
  
  // Verify the import
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  
  console.log('✅ IMPORT COMPLETE!');
  console.log(`   Successfully imported: ${successCount} products`);
  console.log(`   Failed: ${errorCount} products`);
  console.log(`   Total in database now: ${count} products`);
  
  // Check for specific products
  const { data: triCreasers } = await supabase
    .from('products')
    .select('product_code')
    .or('product_code.ilike.%TRI%,product_code.ilike.%TC-%')
    .limit(10);
  
  console.log('\n🔧 Sample Tri-Creasers in database:');
  triCreasers?.forEach(t => console.log(`   - ${t.product_code}`));
}

fixProductsImport().catch(console.error);