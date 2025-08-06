const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeDataCompleteness() {
  console.log('🔍 ANALYZING DATA COMPLETENESS...\n');
  
  // 1. Check products CSV
  const productsPath = path.join(__dirname, '../../Product_Sales_Summary.csv 05-08-2025.csv');
  const productsData = fs.readFileSync(productsPath, 'utf-8');
  const productsCSV = csv.parse(productsData, { columns: true, skip_empty_lines: true });
  
  console.log('📄 PRODUCTS CSV:');
  console.log('Total products in CSV:', productsCSV.length);
  
  const toolsInCSV = productsCSV.filter(p => p.product_group === 'Tool');
  const consumablesInCSV = productsCSV.filter(p => p.product_group === 'Consumable');
  const otherInCSV = productsCSV.filter(p => !['Tool', 'Consumable'].includes(p.product_group));
  
  console.log('- Tools:', toolsInCSV.length);
  console.log('- Consumables:', consumablesInCSV.length);
  console.log('- Other/Empty:', otherInCSV.length);
  
  // Check for tri-creasers in CSV
  const triCreasers = productsCSV.filter(p => 
    p.product_code.includes('TRI') || 
    (p.description && p.description.toLowerCase().includes('tri-creaser')) ||
    (p.description && p.description.toLowerCase().includes('tri creaser'))
  );
  console.log('\n🔧 TRI-CREASERS IN CSV:', triCreasers.length);
  console.log('Sample tri-creaser codes:', triCreasers.slice(0, 10).map(t => t.product_code));
  
  // 2. Check what's in database
  const { data: dbProducts, count: dbCount } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .limit(2000);
  
  console.log('\n💾 DATABASE PRODUCTS:');
  console.log('Total in database:', dbCount);
  
  const dbTools = dbProducts.filter(p => p.product_group === 'Tool');
  const dbConsumables = dbProducts.filter(p => p.product_group === 'Consumable');
  
  console.log('- Tools:', dbTools.length);
  console.log('- Consumables:', dbConsumables.length);
  
  // Check for tri-creasers in database
  const dbTriCreasers = dbProducts.filter(p => 
    p.product_code.includes('TRI') || 
    (p.description && p.description.toLowerCase().includes('tri-creaser')) ||
    (p.description && p.description.toLowerCase().includes('tri creaser'))
  );
  console.log('\n🔧 TRI-CREASERS IN DATABASE:', dbTriCreasers.length);
  console.log('Sample tri-creaser codes in DB:', dbTriCreasers.slice(0, 10).map(t => t.product_code));
  
  // 3. Find missing products
  const csvCodes = new Set(productsCSV.map(p => p.product_code));
  const dbCodes = new Set(dbProducts.map(p => p.product_code));
  
  const missingFromDB = [...csvCodes].filter(code => !dbCodes.has(code));
  
  console.log('\n❌ MISSING FROM DATABASE:', missingFromDB.length);
  if (missingFromDB.length > 0) {
    console.log('First 30 missing product codes:');
    missingFromDB.slice(0, 30).forEach(code => {
      const product = productsCSV.find(p => p.product_code === code);
      const desc = product?.description ? product.description.substring(0, 40) : 'NO DESC';
      console.log(`  - ${code} | ${product?.product_group || 'NO GROUP'} | ${desc}`);
    });
    
    // Check specifically for missing tri-creasers
    const missingTriCreasers = missingFromDB.filter(code => 
      code.includes('TRI') || code.includes('TC-')
    );
    if (missingTriCreasers.length > 0) {
      console.log('\n❌ MISSING TRI-CREASERS SPECIFICALLY:', missingTriCreasers.length);
      missingTriCreasers.forEach(code => {
        const product = productsCSV.find(p => p.product_code === code);
        console.log(`  - ${code} | ${product?.description?.substring(0, 50)}`);
      });
    }
  }
  
  // 4. Check manufacturer details
  const manufacturerPath = path.join(__dirname, '../../FINAL tool to manufacturer to details link.csv');
  let manufacturerData = fs.readFileSync(manufacturerPath, 'utf-8');
  if (manufacturerData.charCodeAt(0) === 0xFEFF) {
    manufacturerData = manufacturerData.slice(1);
  }
  const manufacturerCSV = csv.parse(manufacturerData, { columns: true, skip_empty_lines: true, bom: true });
  
  console.log('\n🏭 MANUFACTURER DETAILS CSV:');
  console.log('Total records:', manufacturerCSV.length);
  
  const uniqueToolsInManufacturer = new Set(manufacturerCSV.map(m => m.product_code));
  console.log('Unique tools with manufacturer details:', uniqueToolsInManufacturer.size);
  
  // Check which tools have manufacturer details
  const toolsWithoutManufacturer = toolsInCSV.filter(t => 
    !uniqueToolsInManufacturer.has(t.product_code)
  );
  
  console.log('\n⚠️  TOOLS WITHOUT MANUFACTURER DETAILS:', toolsWithoutManufacturer.length);
  if (toolsWithoutManufacturer.length > 0) {
    console.log('First 15 tools without manufacturer details:');
    toolsWithoutManufacturer.slice(0, 15).forEach(t => {
      console.log(`  - ${t.product_code} | ${t.description?.substring(0, 50)}`);
    });
  }
  
  // 5. Check what's in tool_manufacturer_details table
  const { count: manufacturerDBCount } = await supabase
    .from('tool_manufacturer_details')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n💾 DATABASE MANUFACTURER DETAILS:', manufacturerDBCount);
  
  // 6. Check tool to consumable compatibility
  const compatPath = path.join(__dirname, '../../Tool_Code_to_Consumable_Code_Pairings - Fron Chat GPT.csv');
  const compatData = fs.readFileSync(compatPath, 'utf-8');
  const compatCSV = csv.parse(compatData, { columns: true, skip_empty_lines: true });
  
  console.log('\n🔗 TOOL-CONSUMABLE COMPATIBILITY CSV:');
  console.log('Total records:', compatCSV.length);
  
  const uniqueToolsInCompat = new Set(compatCSV.map(c => c.tool_code));
  console.log('Unique tools with consumables:', uniqueToolsInCompat.size);
  
  // 7. Check customer to tool mapping
  const customerToolPath = path.join(__dirname, '../../Customer_to_Tool_Mapping.csv');
  const customerToolData = fs.readFileSync(customerToolPath, 'utf-8');
  const customerToolCSV = csv.parse(customerToolData, { columns: true, skip_empty_lines: true });
  
  console.log('\n👥 CUSTOMER-TOOL MAPPING CSV:');
  console.log('Total records:', customerToolCSV.length);
  
  const uniqueToolsInCustomer = new Set(customerToolCSV.map(c => c.tool_code));
  console.log('Unique tools owned by customers:', uniqueToolsInCustomer.size);
  
  // 8. Summary
  console.log('\n📊 SUMMARY:');
  console.log('====================================');
  console.log('CSV has', productsCSV.length, 'products');
  console.log('Database has', dbCount, 'products');
  console.log('Missing:', missingFromDB.length, 'products');
  console.log('Import success rate:', ((dbCount / productsCSV.length) * 100).toFixed(1) + '%');
  console.log('\nTools specifically:');
  console.log('- In CSV:', toolsInCSV.length);
  console.log('- In Database:', dbTools.length);
  console.log('- Missing:', toolsInCSV.length - dbTools.length);
  
  // Check for specific patterns in missing products
  if (missingFromDB.length > 0) {
    console.log('\n🔍 PATTERN ANALYSIS OF MISSING PRODUCTS:');
    const patterns = {};
    missingFromDB.forEach(code => {
      const prefix = code.split(/[-/]/)[0];
      patterns[prefix] = (patterns[prefix] || 0) + 1;
    });
    
    console.log('Missing products by prefix:');
    Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([prefix, count]) => {
        console.log(`  ${prefix}: ${count} products`);
      });
  }
}

analyzeDataCompleteness().catch(console.error);