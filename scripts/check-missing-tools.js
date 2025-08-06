const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parse/sync');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Get all products
  const { data: products } = await supabase
    .from('products')
    .select('product_code')
    .limit(2000);
  
  const productCodes = new Set(products.map(p => p.product_code));
  console.log('Total products in database:', productCodes.size);
  
  // Read CSV
  let csvData = fs.readFileSync('../FINAL tool to manufacturer to details link.csv', 'utf-8');
  if (csvData.charCodeAt(0) === 0xFEFF) csvData = csvData.slice(1);
  const records = csv.parse(csvData, { columns: true, skip_empty_lines: true });
  
  // Check which product codes are missing
  const missingCodes = new Set();
  const foundCodes = new Set();
  const uniqueRecords = new Map();
  
  records.forEach(r => {
    const code = r.product_code?.trim();
    const manufacturer = r.manufacturer?.trim();
    const detail = r.detail?.trim();
    
    if (code && manufacturer && detail) {
      const key = `${code}-${manufacturer}-${detail}`;
      if (!uniqueRecords.has(key)) {
        uniqueRecords.set(key, { code, manufacturer, detail });
        
        if (!productCodes.has(code)) {
          missingCodes.add(code);
        } else {
          foundCodes.add(code);
        }
      }
    }
  });
  
  console.log('\n=================================');
  console.log('MANUFACTURER CSV ANALYSIS:');
  console.log('=================================');
  console.log('Total rows in CSV:', records.length);
  console.log('Unique combinations:', uniqueRecords.size);
  console.log('');
  console.log('Product Code Analysis:');
  console.log('  Unique product codes in CSV:', foundCodes.size + missingCodes.size);
  console.log('  Codes FOUND in products table:', foundCodes.size);
  console.log('  Codes MISSING from products table:', missingCodes.size);
  
  console.log('\n🚨 THIS EXPLAINS THE PROBLEM:');
  console.log(`Only ${foundCodes.size} records can be imported because ${missingCodes.size} product codes don't exist in the database!`);
  
  if (missingCodes.size > 0) {
    console.log('\nMissing product codes that need to be added:');
    [...missingCodes].sort().forEach(code => console.log('  -', code));
  }
  
  // Check current manufacturer details count
  const { count } = await supabase
    .from('tool_manufacturer_details')
    .select('*', { count: 'exact', head: true });
  
  console.log('\nCurrent manufacturer details in database:', count);
})().catch(console.error);