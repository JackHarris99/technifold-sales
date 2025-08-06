const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parse/sync');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function restoreManufacturers() {
  console.log('🚨 URGENTLY RESTORING MANUFACTURER DETAILS\n');
  
  // Read CSV
  const csvPath = '../FINAL tool to manufacturer to details link.csv';
  let csvData = fs.readFileSync(csvPath, 'utf-8');
  if (csvData.charCodeAt(0) === 0xFEFF) {
    csvData = csvData.slice(1);
  }
  const records = csv.parse(csvData, { columns: true, skip_empty_lines: true });
  
  console.log(`Found ${records.length} records in CSV\n`);
  
  // Get all product codes from database
  const productMap = new Map();
  let offset = 0;
  
  while (true) {
    const { data } = await supabase
      .from('products')
      .select('id, product_code')
      .range(offset, offset + 999);
    
    if (!data || data.length === 0) break;
    data.forEach(p => productMap.set(p.product_code, p.id));
    offset += 1000;
  }
  
  console.log(`Loaded ${productMap.size} products for mapping\n`);
  
  // Prepare records
  const toInsert = [];
  const seen = new Set();
  let skipped = 0;
  
  for (const record of records) {
    const toolCode = record.product_code?.trim();
    const manufacturer = record.manufacturer?.trim();
    const detail = record.detail?.trim();
    
    if (toolCode && manufacturer && detail) {
      const toolId = productMap.get(toolCode);
      
      if (toolId) {
        const key = `${toolId}-${manufacturer}-${detail}`;
        if (!seen.has(key)) {
          seen.add(key);
          toInsert.push({
            tool_product_id: toolId,
            manufacturer: manufacturer,
            detail: detail
          });
        }
      } else {
        skipped++;
      }
    }
  }
  
  console.log(`Prepared ${toInsert.length} unique records to insert`);
  console.log(`Skipped ${skipped} (product not found)\n`);
  
  // Import in batches
  const batchSize = 100;
  let success = 0;
  
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('tool_manufacturer_details')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`Batch ${Math.floor(i/batchSize) + 1} error:`, error.message);
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
  
  console.log('=================================');
  console.log(`TOTAL IN DATABASE: ${count}`);
  console.log('=================================');
  
  if (count > 0) {
    console.log('✅ MANUFACTURERS RESTORED!');
  } else {
    console.log('❌ FAILED TO RESTORE - SOMETHING IS WRONG!');
  }
}

restoreManufacturers().catch(console.error);