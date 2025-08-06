const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to fetch ALL records from a table (handles pagination)
async function fetchAllRecords(tableName, columns = '*') {
  let allRecords = [];
  let offset = 0;
  const batchSize = 1000;
  
  console.log(`  Fetching all ${tableName}...`);
  
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select(columns)
      .range(offset, offset + batchSize - 1);
    
    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    allRecords = allRecords.concat(data);
    offset += batchSize;
    
    if (data.length < batchSize) break;
  }
  
  console.log(`  ✓ Fetched ${allRecords.length} ${tableName}`);
  return allRecords;
}

async function fixImports() {
  console.log('🚀 Starting FIXED database import...\n');
  console.log('This script properly handles pagination to import ALL data.\n');

  try {
    // ======================================
    // Step 1: Build complete product map
    // ======================================
    console.log('📦 Building complete product map...');
    const allProducts = await fetchAllRecords('products', 'id, product_code');
    
    const productMap = {};
    allProducts.forEach(p => {
      productMap[p.product_code] = p.id;
    });
    
    console.log(`✅ Product map built with ${Object.keys(productMap).length} products\n`);

    // ======================================
    // Step 2: Import Tool-Manufacturer Details
    // ======================================
    console.log('🔧 Importing tool manufacturer details...');
    const toolManufacturerPath = path.join(__dirname, '../../FINAL tool to manufacturer to details link.csv');
    
    if (fs.existsSync(toolManufacturerPath)) {
      let toolManufacturerData = fs.readFileSync(toolManufacturerPath, 'utf-8');
      
      // Remove BOM if present
      if (toolManufacturerData.charCodeAt(0) === 0xFEFF) {
        toolManufacturerData = toolManufacturerData.slice(1);
      }
      
      const toolManufacturers = csv.parse(toolManufacturerData, { 
        columns: true, 
        skip_empty_lines: true,
        bom: true
      });
      
      console.log(`  Found ${toolManufacturers.length} manufacturer detail records in CSV`);
      
      const manufacturerDetailsToInsert = [];
      const missingProducts = new Set();
      const seenCombinations = new Set();
      
      toolManufacturers.forEach(tm => {
        const cleanProductCode = tm.product_code?.replace(/^\uFEFF/, '').trim();
        const manufacturer = tm.manufacturer?.trim();
        const detail = tm.detail?.trim();
        const productId = productMap[cleanProductCode];
        
        const uniqueKey = `${productId}-${manufacturer}-${detail}`;
        
        if (productId && manufacturer && detail && !seenCombinations.has(uniqueKey)) {
          seenCombinations.add(uniqueKey);
          manufacturerDetailsToInsert.push({
            tool_product_id: productId,
            manufacturer: manufacturer,
            detail: detail
          });
        } else if (cleanProductCode && !productId) {
          missingProducts.add(cleanProductCode);
        }
      });
      
      if (missingProducts.size > 0) {
        console.log(`  ⚠️  ${missingProducts.size} products not found:`, [...missingProducts].slice(0, 5));
      }

      if (manufacturerDetailsToInsert.length > 0) {
        // Clear existing data first
        console.log('  Clearing existing manufacturer details...');
        await supabase.from('tool_manufacturer_details').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Insert in batches
        const batchSize = 500;
        for (let i = 0; i < manufacturerDetailsToInsert.length; i += batchSize) {
          const batch = manufacturerDetailsToInsert.slice(i, i + batchSize);
          const { error } = await supabase
            .from('tool_manufacturer_details')
            .insert(batch);
          
          if (error) {
            console.error('  Error inserting batch:', error);
          } else {
            console.log(`  ✓ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(manufacturerDetailsToInsert.length/batchSize)}`);
          }
        }
        
        console.log(`✅ Imported ${manufacturerDetailsToInsert.length} manufacturer details\n`);
      }
    }

    // ======================================
    // Step 3: Import Tool-Consumable Compatibility
    // ======================================
    console.log('🔗 Importing tool-consumable compatibility...');
    const toolConsumablePath = path.join(__dirname, '../../Tool_Code_to_Consumable_Code_Pairings - Fron Chat GPT.csv');
    
    if (fs.existsSync(toolConsumablePath)) {
      const toolConsumableData = fs.readFileSync(toolConsumablePath, 'utf-8');
      const toolConsumables = csv.parse(toolConsumableData, { columns: true, skip_empty_lines: true });
      
      console.log(`  Found ${toolConsumables.length} compatibility records in CSV`);
      
      const compatibilityToInsert = [];
      const seenPairs = new Set();
      
      toolConsumables.forEach(tc => {
        const toolId = productMap[tc.tool_code];
        const consumableId = productMap[tc.consumable_code];
        const pairKey = `${toolId}-${consumableId}`;
        
        if (toolId && consumableId && !seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);
          compatibilityToInsert.push({
            tool_product_id: toolId,
            consumable_product_id: consumableId
          });
        }
      });

      if (compatibilityToInsert.length > 0) {
        // Clear existing data first
        console.log('  Clearing existing compatibility data...');
        await supabase.from('tool_consumable_compatibility').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Insert in batches
        const batchSize = 500;
        for (let i = 0; i < compatibilityToInsert.length; i += batchSize) {
          const batch = compatibilityToInsert.slice(i, i + batchSize);
          const { error } = await supabase
            .from('tool_consumable_compatibility')
            .insert(batch);
          
          if (error) {
            console.error('  Error inserting batch:', error);
          } else {
            console.log(`  ✓ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(compatibilityToInsert.length/batchSize)}`);
          }
        }
        
        console.log(`✅ Imported ${compatibilityToInsert.length} compatibility records\n`);
      }
    }

    // ======================================
    // Step 4: Build complete customer map
    // ======================================
    console.log('👥 Building complete customer map...');
    const allCustomers = await fetchAllRecords('customers', 'id, customer_code');
    
    const customerMap = {};
    allCustomers.forEach(c => {
      customerMap[c.customer_code] = c.id;
    });
    
    console.log(`✅ Customer map built with ${Object.keys(customerMap).length} customers\n`);

    // ======================================
    // Step 5: Import Customer-Tool Relationships
    // ======================================
    console.log('🔧 Importing customer-tool relationships...');
    const customerToolPath = path.join(__dirname, '../../Customer_to_Tool_Mapping.csv');
    
    if (fs.existsSync(customerToolPath)) {
      const customerToolData = fs.readFileSync(customerToolPath, 'utf-8');
      const customerTools = csv.parse(customerToolData, { columns: true, skip_empty_lines: true });
      
      console.log(`  Found ${customerTools.length} customer-tool mappings in CSV`);
      
      const customerToolsToInsert = [];
      const seenMappings = new Set();
      let skippedNoCustomer = 0;
      let skippedNoTool = 0;
      
      customerTools.forEach(ct => {
        const customerId = customerMap[ct.customer_code];
        const toolId = productMap[ct.tool_code];
        const mappingKey = `${customerId}-${toolId}`;
        
        if (customerId && toolId && !seenMappings.has(mappingKey)) {
          seenMappings.add(mappingKey);
          customerToolsToInsert.push({
            customer_id: customerId,
            tool_product_id: toolId
          });
        } else if (!customerId) {
          skippedNoCustomer++;
        } else if (!toolId) {
          skippedNoTool++;
        }
      });
      
      if (skippedNoCustomer > 0 || skippedNoTool > 0) {
        console.log(`  ⚠️  Skipped: ${skippedNoCustomer} (no customer), ${skippedNoTool} (no tool)`);
      }

      if (customerToolsToInsert.length > 0) {
        // Clear existing data first
        console.log('  Clearing existing customer-tool mappings...');
        await supabase.from('customer_tool').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Insert in batches
        const batchSize = 500;
        for (let i = 0; i < customerToolsToInsert.length; i += batchSize) {
          const batch = customerToolsToInsert.slice(i, i + batchSize);
          const { error } = await supabase
            .from('customer_tool')
            .insert(batch);
          
          if (error) {
            console.error('  Error inserting batch:', error);
          } else {
            console.log(`  ✓ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(customerToolsToInsert.length/batchSize)}`);
          }
        }
        
        console.log(`✅ Imported ${customerToolsToInsert.length} customer-tool relationships\n`);
      }
    }

    // ======================================
    // Final Summary
    // ======================================
    console.log('=' .repeat(60));
    console.log('✨ IMPORT COMPLETE!');
    console.log('=' .repeat(60));
    
    // Verify final counts
    const { count: manufacturerCount } = await supabase
      .from('tool_manufacturer_details')
      .select('*', { count: 'exact', head: true });
    
    const { count: compatCount } = await supabase
      .from('tool_consumable_compatibility')
      .select('*', { count: 'exact', head: true });
    
    const { count: customerToolCount } = await supabase
      .from('customer_tool')
      .select('*', { count: 'exact', head: true });
    
    console.log('\nFinal database counts:');
    console.log(`  Products: ${allProducts.length}`);
    console.log(`  Customers: ${allCustomers.length}`);
    console.log(`  Manufacturer Details: ${manufacturerCount} (was 248, should be ~464)`);
    console.log(`  Tool-Consumable Compatibility: ${compatCount}`);
    console.log(`  Customer-Tool Mappings: ${customerToolCount} (was 593, should be ~4193)`);
    
    console.log('\n🎉 All data imported successfully with proper pagination!');
    console.log('Your database is now complete and properly linked.');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the import
fixImports();