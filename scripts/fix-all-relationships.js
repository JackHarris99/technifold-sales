const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAllRelationships() {
  console.log('🚨 FIXING ALL COMPATIBILITY AND RELATIONSHIPS...\n');
  
  // First, get ALL products for lookup (no limit)
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
    
  let allProducts = [];
  const batchSize = 1000;
  for (let offset = 0; offset < productCount; offset += batchSize) {
    const { data: batch } = await supabase
      .from('products')
      .select('id, product_code')
      .range(offset, offset + batchSize - 1);
    if (batch) allProducts = allProducts.concat(batch);
  }
  const products = allProducts;
  
  // Create lookup map
  const productLookup = {};
  products.forEach(p => {
    productLookup[p.product_code] = p.id;
  });
  
  console.log(`📦 Loaded ${products.length} products for lookup\n`);

  // ========================================
  // 1. FIX TOOL-MANUFACTURER DETAILS
  // ========================================
  console.log('1️⃣ FIXING TOOL-MANUFACTURER DETAILS...\n');
  
  const manufacturerPath = path.join(__dirname, '../../FINAL tool to manufacturer to details link.csv');
  let manufacturerData = fs.readFileSync(manufacturerPath, 'utf-8');
  if (manufacturerData.charCodeAt(0) === 0xFEFF) {
    manufacturerData = manufacturerData.slice(1);
  }
  const manufacturerCSV = csv.parse(manufacturerData, { columns: true, skip_empty_lines: true });
  
  // Clear existing
  await supabase.from('tool_manufacturer_details').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  const manufacturerRecords = [];
  const uniqueManufacturers = new Set();
  const missingToolsInManufacturer = [];
  
  for (const record of manufacturerCSV) {
    const toolCode = record.product_code?.trim();
    const manufacturer = record.manufacturer?.trim();
    const detail = record.detail?.trim();
    
    if (toolCode && manufacturer && detail) {
      uniqueManufacturers.add(manufacturer);
      const toolId = productLookup[toolCode];
      
      if (toolId) {
        manufacturerRecords.push({
          tool_product_id: toolId,
          manufacturer: manufacturer,
          detail: detail
        });
      } else {
        missingToolsInManufacturer.push(toolCode);
      }
    }
  }
  
  console.log(`   Found ${uniqueManufacturers.size} unique manufacturers`);
  console.log(`   Manufacturers: ${[...uniqueManufacturers].sort().join(', ')}`);
  console.log(`   Prepared ${manufacturerRecords.length} records`);
  if (missingToolsInManufacturer.length > 0) {
    console.log(`   ⚠️ ${missingToolsInManufacturer.length} tools not found in products table`);
  }
  
  // Insert in batches
  let manufacturerSuccess = 0;
  
  for (let i = 0; i < manufacturerRecords.length; i += batchSize) {
    const batch = manufacturerRecords.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('tool_manufacturer_details')
      .insert(batch)
      .select();
    
    if (!error && data) {
      manufacturerSuccess += data.length;
    } else if (error) {
      console.error('   Error:', error.message);
    }
  }
  
  console.log(`   ✅ Imported ${manufacturerSuccess} manufacturer details\n`);

  // ========================================
  // 2. FIX TOOL-CONSUMABLE COMPATIBILITY
  // ========================================
  console.log('2️⃣ FIXING TOOL-CONSUMABLE COMPATIBILITY...\n');
  
  const compatPath = path.join(__dirname, '../../Tool_Code_to_Consumable_Code_Pairings - Fron Chat GPT.csv');
  const compatData = fs.readFileSync(compatPath, 'utf-8');
  const compatCSV = csv.parse(compatData, { columns: true, skip_empty_lines: true });
  
  // Clear existing
  await supabase.from('tool_consumable_compatibility').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  const compatRecords = [];
  const missingInCompat = { tools: [], consumables: [] };
  
  for (const record of compatCSV) {
    const toolCode = record.tool_code?.trim();
    const consumableCode = record.consumable_code?.trim();
    
    if (toolCode && consumableCode) {
      const toolId = productLookup[toolCode];
      const consumableId = productLookup[consumableCode];
      
      if (toolId && consumableId) {
        compatRecords.push({
          tool_product_id: toolId,
          consumable_product_id: consumableId
        });
      } else {
        if (!toolId) missingInCompat.tools.push(toolCode);
        if (!consumableId) missingInCompat.consumables.push(consumableCode);
      }
    }
  }
  
  console.log(`   Prepared ${compatRecords.length} compatibility records`);
  if (missingInCompat.tools.length > 0) {
    console.log(`   ⚠️ ${[...new Set(missingInCompat.tools)].length} unique tools not found`);
  }
  if (missingInCompat.consumables.length > 0) {
    console.log(`   ⚠️ ${[...new Set(missingInCompat.consumables)].length} unique consumables not found`);
  }
  
  // Insert in batches
  let compatSuccess = 0;
  
  for (let i = 0; i < compatRecords.length; i += batchSize) {
    const batch = compatRecords.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('tool_consumable_compatibility')
      .insert(batch)
      .select();
    
    if (!error && data) {
      compatSuccess += data.length;
    } else if (error) {
      console.error('   Error:', error.message);
    }
  }
  
  console.log(`   ✅ Imported ${compatSuccess} compatibility records\n`);

  // ========================================
  // 3. FIX CUSTOMER-TOOL RELATIONSHIPS
  // ========================================
  console.log('3️⃣ FIXING CUSTOMER-TOOL RELATIONSHIPS...\n');
  
  const customerToolPath = path.join(__dirname, '../../Customer_to_Tool_Mapping.csv');
  const customerToolData = fs.readFileSync(customerToolPath, 'utf-8');
  const customerToolCSV = csv.parse(customerToolData, { columns: true, skip_empty_lines: true });
  
  // Get ALL customers for lookup
  const { count: customerCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });
    
  let allCustomers = [];
  for (let offset = 0; offset < customerCount; offset += batchSize) {
    const { data: batch } = await supabase
      .from('customers')
      .select('id, customer_code')
      .range(offset, offset + batchSize - 1);
    if (batch) allCustomers = allCustomers.concat(batch);
  }
  const customers = allCustomers;
  
  const customerLookup = {};
  customers.forEach(c => {
    customerLookup[c.customer_code] = c.id;
  });
  
  console.log(`   Loaded ${customers.length} customers for lookup`);
  
  // Clear existing
  await supabase.from('customer_tool').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  const customerToolRecords = [];
  const missingInCustomerTool = { customers: [], tools: [] };
  
  for (const record of customerToolCSV) {
    const customerCode = record.customer_code?.trim();
    const toolCode = record.tool_code?.trim();
    
    if (customerCode && toolCode) {
      const customerId = customerLookup[customerCode];
      const toolId = productLookup[toolCode];
      
      if (customerId && toolId) {
        customerToolRecords.push({
          customer_id: customerId,
          tool_product_id: toolId,
          quantity: 1
        });
      } else {
        if (!customerId) missingInCustomerTool.customers.push(customerCode);
        if (!toolId) missingInCustomerTool.tools.push(toolCode);
      }
    }
  }
  
  console.log(`   Prepared ${customerToolRecords.length} customer-tool records`);
  if (missingInCustomerTool.customers.length > 0) {
    console.log(`   ⚠️ ${[...new Set(missingInCustomerTool.customers)].length} unique customers not found`);
  }
  if (missingInCustomerTool.tools.length > 0) {
    console.log(`   ⚠️ ${[...new Set(missingInCustomerTool.tools)].length} unique tools not found`);
  }
  
  // Insert in batches
  let customerToolSuccess = 0;
  
  for (let i = 0; i < customerToolRecords.length; i += batchSize) {
    const batch = customerToolRecords.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('customer_tool')
      .insert(batch)
      .select();
    
    if (!error && data) {
      customerToolSuccess += data.length;
    } else if (error) {
      console.error('   Error:', error.message);
    }
  }
  
  console.log(`   ✅ Imported ${customerToolSuccess} customer-tool records\n`);

  // ========================================
  // FINAL VERIFICATION
  // ========================================
  console.log('📊 FINAL VERIFICATION:');
  console.log('='.repeat(50));
  
  const { count: manufacturerCount } = await supabase
    .from('tool_manufacturer_details')
    .select('*', { count: 'exact', head: true });
    
  const { count: compatCount } = await supabase
    .from('tool_consumable_compatibility')
    .select('*', { count: 'exact', head: true });
    
  const { count: customerToolCount } = await supabase
    .from('customer_tool')
    .select('*', { count: 'exact', head: true });
  
  console.log(`✅ Tool-Manufacturer Details: ${manufacturerCount} records`);
  console.log(`✅ Tool-Consumable Compatibility: ${compatCount} records`);
  console.log(`✅ Customer-Tool Relationships: ${customerToolCount} records`);
  
  // Test the cascading dropdown data
  const { data: testManufacturers } = await supabase
    .from('tool_manufacturer_details')
    .select('manufacturer')
    .limit(1000);
    
  const uniqueTestManufacturers = [...new Set(testManufacturers?.map(m => m.manufacturer) || [])];
  
  console.log(`\n🏭 ${uniqueTestManufacturers.length} Manufacturers available in dropdown:`);
  console.log(uniqueTestManufacturers.sort().map(m => `   - ${m}`).join('\n'));
  
  console.log('\n✅ ALL RELATIONSHIPS FIXED!');
  console.log('The site should now work properly with all compatibility data restored.');
}

fixAllRelationships().catch(console.error);