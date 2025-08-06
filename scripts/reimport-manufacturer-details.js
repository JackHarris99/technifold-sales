const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function reimportManufacturerDetails() {
  console.log('🔧 RE-IMPORTING MANUFACTURER DETAILS...\n');
  
  // Read the CSV
  const csvPath = path.join(__dirname, '../../FINAL tool to manufacturer to details link.csv');
  let csvData = fs.readFileSync(csvPath, 'utf-8');
  
  // Remove BOM if present
  if (csvData.charCodeAt(0) === 0xFEFF) {
    csvData = csvData.slice(1);
  }
  
  const records = csv.parse(csvData, { columns: true, skip_empty_lines: true, bom: true });
  
  console.log(`📄 Found ${records.length} records in CSV\n`);
  
  // First, clear existing data
  console.log('🗑️  Clearing existing manufacturer details...');
  const { error: deleteError } = await supabase
    .from('tool_manufacturer_details')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (deleteError) {
    console.error('Error clearing:', deleteError);
    return;
  }
  
  // Analyze the data
  const manufacturerMap = new Map();
  const uniqueTools = new Set();
  
  records.forEach(record => {
    const manufacturer = record.manufacturer?.trim();
    const detail = record.detail?.trim();
    const toolCode = record.product_code?.trim();
    
    if (manufacturer && detail && toolCode) {
      uniqueTools.add(toolCode);
      
      if (!manufacturerMap.has(manufacturer)) {
        manufacturerMap.set(manufacturer, new Set());
      }
      manufacturerMap.get(manufacturer).add(detail);
    }
  });
  
  console.log('📊 Data Analysis:');
  console.log(`   Unique manufacturers: ${manufacturerMap.size}`);
  console.log(`   Unique tools: ${uniqueTools.size}`);
  console.log('\n🏭 Manufacturers found:');
  [...manufacturerMap.keys()].sort().forEach(mfr => {
    console.log(`   - ${mfr} (${manufacturerMap.get(mfr).size} details)`);
  });
  
  // Prepare records for import
  const toInsert = [];
  
  for (const record of records) {
    const manufacturer = record.manufacturer?.trim();
    const detail = record.detail?.trim();
    const toolCode = record.product_code?.trim();
    
    if (manufacturer && detail && toolCode) {
      // Note: We're storing the tool_code directly now
      // The product linking can be done via join when needed
      toInsert.push({
        tool_code: toolCode,
        manufacturer: manufacturer,
        detail: detail
      });
    }
  }
  
  console.log(`\n📦 Prepared ${toInsert.length} records for import`);
  
  // Import in batches
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('tool_manufacturer_details')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`❌ Error in batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += data.length;
      process.stdout.write(`\r⏳ Importing... ${successCount}/${toInsert.length}`);
    }
  }
  
  console.log('\n');
  
  // Verify the import
  const { count } = await supabase
    .from('tool_manufacturer_details')
    .select('*', { count: 'exact', head: true });
  
  // Get unique manufacturers in DB
  const { data: dbManufacturers } = await supabase
    .from('tool_manufacturer_details')
    .select('manufacturer, detail')
    .limit(1000);
    
  const dbManufacturerMap = new Map();
  dbManufacturers?.forEach(record => {
    if (!dbManufacturerMap.has(record.manufacturer)) {
      dbManufacturerMap.set(record.manufacturer, new Set());
    }
    dbManufacturerMap.get(record.manufacturer).add(record.detail);
  });
  
  console.log('✅ IMPORT COMPLETE!');
  console.log(`   Successfully imported: ${successCount} records`);
  console.log(`   Failed: ${errorCount} records`);
  console.log(`   Total in database now: ${count} records`);
  console.log(`   Unique manufacturers in DB: ${dbManufacturerMap.size}`);
  
  console.log('\n🏭 Manufacturers in database:');
  [...dbManufacturerMap.keys()].sort().forEach(mfr => {
    console.log(`   - ${mfr} (${dbManufacturerMap.get(mfr).size} machine details)`);
  });
}

reimportManufacturerDetails().catch(console.error);