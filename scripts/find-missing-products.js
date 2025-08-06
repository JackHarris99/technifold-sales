const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parse/sync');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Get ALL product codes from database (no limit)
  let dbCodes = new Set();
  let offset = 0;
  const batchSize = 1000;
  
  console.log('Fetching all products from database...');
  while (true) {
    const { data } = await supabase
      .from('products')
      .select('product_code')
      .range(offset, offset + batchSize - 1);
      
    if (!data || data.length === 0) break;
    data.forEach(p => dbCodes.add(p.product_code));
    offset += batchSize;
    console.log(`  Fetched ${dbCodes.size} products...`);
  }
  
  console.log('\nProducts in database:', dbCodes.size);
  
  // Read CSV
  const csvData = fs.readFileSync('../Product_Sales_Summary.csv 05-08-2025.csv', 'utf-8');
  const records = csv.parse(csvData, { columns: true, skip_empty_lines: true, bom: true });
  
  // Find missing
  const missing = [];
  records.forEach(r => {
    if (r.product_code && !dbCodes.has(r.product_code.trim())) {
      missing.push({
        code: r.product_code,
        group: r.product_group || 'EMPTY',
        detail: r.product_group_detail,
        description: r.description
      });
    }
  });
  
  console.log('Products in CSV:', records.length);
  console.log('Missing from database:', missing.length);
  
  if (missing.length > 0) {
    console.log('\nMissing products by group:');
    const byGroup = {};
    missing.forEach(m => {
      byGroup[m.group] = (byGroup[m.group] || 0) + 1;
    });
    Object.entries(byGroup).forEach(([group, count]) => {
      console.log(`  ${group}: ${count}`);
    });
    
    console.log('\nALL', missing.length, 'missing products:');
    missing.forEach(m => {
      console.log(`  ${m.code} [${m.group}] - ${m.description?.substring(0, 40)}`);
    });
  }
})().catch(console.error);