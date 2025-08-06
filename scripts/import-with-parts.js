const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importWithPartsCategory() {
  console.log('🔧 IMPORTING PRODUCTS WITH PARTS CATEGORY...\n');
  
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
    console.log('\n⚠️  NOTE: You may need to run this SQL in Supabase first:');
    console.log("ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_group_check;");
    console.log("ALTER TABLE products ADD CONSTRAINT products_product_group_check CHECK (product_group IN ('Tool', 'Consumable', 'Parts'));\n");
    return;
  }
  
  console.log('✅ Existing products cleared\n');
  
  // Prepare all products for import with proper categorization
  const productsToInsert = productsCSV.map(p => {
    let productGroup = p.product_group;
    
    // If it's already Tool or Consumable, keep it
    if (productGroup === 'Tool' || productGroup === 'Consumable') {
      // Keep as is
    } 
    // If it's "Other" or empty, classify as Parts
    else if (productGroup === 'Other' || !productGroup || productGroup.trim() === '') {
      productGroup = 'Parts';
    }
    // For any other value (like "Machine"), apply smart logic
    else {
      const code = p.product_code.toUpperCase();
      const desc = (p.description || '').toLowerCase();
      
      // Check if it's actually a tool based on patterns
      if (code.startsWith('FF-') || code.startsWith('EF-') || code.startsWith('TC-') || 
          code.startsWith('MT-') || code.startsWith('PD-') || code.startsWith('QC-') ||
          desc.includes('tri-creaser') || desc.includes('tool') || desc.includes('creaser') ||
          desc.includes('perforator')) {
        productGroup = 'Tool';
      } 
      // Check if it's a consumable based on patterns
      else if (code.startsWith('MOULD-') || code.startsWith('MPB-') || code.startsWith('CB-') ||
               code.startsWith('CK-') || code.startsWith('RS-') || code.startsWith('TWS-') ||
               desc.includes('mould') || desc.includes('blade') || desc.includes('rubber') ||
               desc.includes('sleeve') || desc.includes('receiver')) {
        productGroup = 'Consumable';
      } 
      // Everything else becomes Parts
      else {
        productGroup = 'Parts';
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
  const partsCount = productsToInsert.filter(p => p.product_group === 'Parts').length;
  
  console.log(`📦 Prepared for import:`);
  console.log(`   - Tools: ${toolCount}`);
  console.log(`   - Consumables: ${consumableCount}`);
  console.log(`   - Parts: ${partsCount}`);
  console.log(`   - Total: ${productsToInsert.length}\n`);
  
  // Show some examples of Parts
  const partExamples = productsToInsert
    .filter(p => p.product_group === 'Parts')
    .slice(0, 10)
    .map(p => `${p.product_code} - ${p.description || 'No description'}`);
  
  console.log('📌 Example Parts items:');
  partExamples.forEach(p => console.log(`   - ${p}`));
  console.log();
  
  // Import in batches of 100
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let i = 0; i < productsToInsert.length; i += batchSize) {
    const batch = productsToInsert.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('products')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`❌ Error in batch ${i / batchSize + 1}:`, error.message);
      errorCount += batch.length;
      errors.push(error.message);
      
      // If it's a constraint error, show the note
      if (error.message.includes('product_group_check')) {
        console.log('\n⚠️  IMPORTANT: The database needs to be updated to allow "Parts" category.');
        console.log('Please run this SQL in your Supabase dashboard:');
        console.log('----------------------------------------');
        console.log("ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_group_check;");
        console.log("ALTER TABLE products ADD CONSTRAINT products_product_group_check CHECK (product_group IN ('Tool', 'Consumable', 'Parts'));");
        console.log('----------------------------------------\n');
        console.log('Then run this script again: node scripts/import-with-parts.js\n');
        return;
      }
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
  
  // Get counts by category
  const { data: toolsData } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('product_group', 'Tool');
    
  const { data: consumablesData } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('product_group', 'Consumable');
    
  const { data: partsData } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('product_group', 'Parts');
  
  console.log('✅ IMPORT COMPLETE!');
  console.log(`   Successfully imported: ${successCount} products`);
  console.log(`   Failed: ${errorCount} products`);
  console.log(`   Total in database now: ${count} products`);
  console.log('\n📊 BREAKDOWN BY CATEGORY:');
  console.log(`   Tools: ${toolCount} products`);
  console.log(`   Consumables: ${consumableCount} products`);
  console.log(`   Parts: ${partsCount} products`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    [...new Set(errors)].forEach(e => console.log(`   - ${e}`));
  }
}

importWithPartsCategory().catch(console.error);