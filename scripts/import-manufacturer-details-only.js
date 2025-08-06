const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importManufacturerDetails() {
  console.log('🏭 IMPORTING MANUFACTURER DETAILS...\n');
  
  // Get ALL products for lookup
  const { data: products } = await supabase
    .from('products')
    .select('id, product_code')
    .limit(2000);
  
  const productLookup = {};
  products.forEach(p => {
    productLookup[p.product_code] = p.id;
  });
  
  console.log(`Loaded ${Object.keys(productLookup).length} products for lookup\n`);
  
  // Read manufacturer CSV
  const csvPath = path.join(__dirname, '../../FINAL tool to manufacturer to details link.csv');
  let csvData = fs.readFileSync(csvPath, 'utf-8');
  if (csvData.charCodeAt(0) === 0xFEFF) {
    csvData = csvData.slice(1);
  }
  const records = csv.parse(csvData, { columns: true, skip_empty_lines: true });
  
  console.log(`Found ${records.length} records in CSV\n`);
  
  // Group by unique combinations to avoid duplicates
  const uniqueRecords = new Map();
  const manufacturers = new Set();
  let skipped = 0;
  let prepared = 0;
  
  for (const record of records) {
    const toolCode = record.product_code?.trim();
    const manufacturer = record.manufacturer?.trim();
    const detail = record.detail?.trim();
    
    if (toolCode && manufacturer && detail) {
      manufacturers.add(manufacturer);
      const toolId = productLookup[toolCode];
      
      if (toolId) {
        // Create unique key
        const key = `${toolId}-${manufacturer}-${detail}`;
        if (!uniqueRecords.has(key)) {
          uniqueRecords.set(key, {
            tool_product_id: toolId,
            manufacturer: manufacturer,
            detail: detail
          });
          prepared++;
        }
      } else {
        skipped++;
      }
    }
  }
  
  console.log(`📊 Analysis:`);
  console.log(`   ${manufacturers.size} unique manufacturers`);
  console.log(`   ${prepared} unique records to insert`);
  console.log(`   ${skipped} records skipped (tool not found)\n`);
  
  console.log('🏭 Manufacturers:');
  [...manufacturers].sort().forEach(m => console.log(`   - ${m}`));
  
  // Clear existing data
  console.log('\n🗑️ Clearing existing data...');
  await supabase
    .from('tool_manufacturer_details')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Insert all unique records
  const toInsert = Array.from(uniqueRecords.values());
  console.log(`\n📦 Inserting ${toInsert.length} records...`);
  
  let success = 0;
  let failed = 0;
  
  // Insert in smaller batches to avoid errors
  const batchSize = 50;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('tool_manufacturer_details')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`Error in batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      failed += batch.length;
    } else if (data) {
      success += data.length;
      process.stdout.write(`\r✅ Inserted: ${success}/${toInsert.length}`);
    }
  }
  
  console.log('\n');
  
  // Verify
  const { count } = await supabase
    .from('tool_manufacturer_details')
    .select('*', { count: 'exact', head: true });
  
  console.log('📊 FINAL RESULT:');
  console.log(`   ✅ Successfully inserted: ${success} records`);
  console.log(`   ❌ Failed: ${failed} records`);
  console.log(`   📦 Total in database: ${count} records`);
  
  // Test the dropdown
  const { data: test } = await supabase
    .from('tool_manufacturer_details')
    .select('manufacturer, detail')
    .limit(20);
  
  console.log('\n🎯 Sample records:');
  test?.slice(0, 10).forEach(r => {
    console.log(`   ${r.manufacturer} - ${r.detail}`);
  });
}

importManufacturerDetails().catch(console.error);