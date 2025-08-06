const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parse/sync');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importRemainingProducts() {
  console.log('🔧 IMPORTING REMAINING 444 PRODUCTS\n');
  
  // Read CSV
  const csvPath = '../Product_Sales_Summary.csv 05-08-2025.csv';
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const records = csv.parse(csvData, { 
    columns: true, 
    skip_empty_lines: true,
    bom: true 
  });
  
  // Get products 1201-1644 (the ones that failed)
  const remainingProducts = [];
  for (let i = 1200; i < records.length; i++) {
    const r = records[i];
    const productCode = r.product_code?.trim();
    if (!productCode) continue;
    
    let productGroup = r.product_group?.trim();
    // Handle empty groups
    if (!productGroup || productGroup === '') {
      if (productCode.startsWith('FF-') || r.product_group_detail?.includes('Fast-Fit')) {
        productGroup = 'Tool';
      } else if (productCode.startsWith('MOULD-')) {
        productGroup = 'Consumable';
      } else {
        productGroup = 'Parts';
      }
    }
    
    remainingProducts.push({
      product_code: productCode,
      description: r.description?.trim(),
      sales_price: parseFloat(r.sales_price) || 0,
      cost_price: parseFloat(r.cost_price) || 0,
      product_group: productGroup,
      product_group_detail: r.product_group_detail?.trim() || null
    });
  }
  
  console.log(`Found ${remainingProducts.length} products to import (rows 1201-${records.length})\n`);
  
  // Import in SMALLER batches to avoid any limits
  const batchSize = 50; // Smaller batches
  let successCount = 0;
  let errorCount = 0;
  let errors = [];
  
  for (let i = 0; i < remainingProducts.length; i += batchSize) {
    const batch = remainingProducts.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('products')
      .insert(batch)
      .select();
      
    if (error) {
      console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
      errorCount += batch.length;
      errors.push({ batch: Math.floor(i/batchSize) + 1, error: error.message, products: batch.map(p => p.product_code) });
    } else if (data) {
      successCount += data.length;
      process.stdout.write(`\r✅ Imported: ${successCount}/${remainingProducts.length}`);
    }
  }
  
  console.log('\n\n=================================');
  console.log('IMPORT RESULTS:');
  console.log(`✅ Successfully imported: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n❌ FAILED BATCHES:');
    errors.forEach(e => {
      console.log(`  Batch ${e.batch}: ${e.error}`);
      console.log(`    Products: ${e.products.join(', ')}`);
    });
  }
  
  // Final count
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
    
  console.log('\n📊 FINAL DATABASE COUNT:', count);
  console.log('Expected: 1644');
  
  if (count === 1644) {
    console.log('✅ ALL PRODUCTS IMPORTED SUCCESSFULLY!');
  } else {
    console.log(`⚠️  Still missing ${1644 - count} products`);
  }
}

importRemainingProducts().catch(console.error);