const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parse/sync');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importMissing443() {
  console.log('🚨 IMPORTING 443 MISSING PRODUCTS\n');
  
  // Get existing product codes
  let existingCodes = new Set();
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from('products')
      .select('product_code')
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    data.forEach(p => existingCodes.add(p.product_code));
    offset += 1000;
  }
  console.log('Products already in database:', existingCodes.size);
  
  // Read CSV
  const csvData = fs.readFileSync('../Product_Sales_Summary.csv 05-08-2025.csv', 'utf-8');
  const records = csv.parse(csvData, { columns: true, skip_empty_lines: true, bom: true });
  
  // Find missing products
  const toImport = [];
  records.forEach(r => {
    const code = r.product_code?.trim();
    if (code && !existingCodes.has(code)) {
      let group = r.product_group?.trim();
      
      // FIX THE GROUP - convert "Other" and empty to "Parts"
      if (!group || group === '' || group === 'Other') {
        group = 'Parts';
      }
      
      toImport.push({
        product_code: code,
        description: r.description?.trim(),
        sales_price: parseFloat(r.sales_price) || 0,
        cost_price: parseFloat(r.cost_price) || 0,
        product_group: group,
        product_group_detail: r.product_group_detail?.trim() || null
      });
    }
  });
  
  console.log(`Found ${toImport.length} products to import\n`);
  
  // Count by group
  const counts = { Tool: 0, Consumable: 0, Parts: 0 };
  toImport.forEach(p => counts[p.product_group]++);
  console.log('Products to import by group:');
  console.log(`  Tools: ${counts.Tool}`);
  console.log(`  Consumables: ${counts.Consumable}`);
  console.log(`  Parts: ${counts.Parts}\n`);
  
  // Import in small batches
  const batchSize = 50;
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < toImport.length; i += batchSize) {
    const batch = toImport.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('products')
      .insert(batch)
      .select();
      
    if (error) {
      console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, error.message);
      failed += batch.length;
    } else if (data) {
      success += data.length;
      process.stdout.write(`\r✅ Imported: ${success}/${toImport.length}`);
    }
  }
  
  console.log('\n\n=================================');
  console.log('FINAL RESULTS:');
  console.log(`✅ Successfully imported: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  
  // Final count
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
    
  console.log(`\n📊 Total products in database: ${count}`);
  console.log('Expected: 1644');
  
  if (count === 1644) {
    console.log('🎉 ALL PRODUCTS IMPORTED SUCCESSFULLY!');
  } else {
    console.log(`⚠️  Still missing ${1644 - count} products`);
  }
}

importMissing443().catch(console.error);