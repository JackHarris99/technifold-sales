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

async function addCompatibility(toolCode, consumableCode) {
  try {
    // Find the tool product
    const { data: tool } = await supabase
      .from('products')
      .select('id')
      .eq('product_code', toolCode)
      .single();
    
    if (!tool) {
      return { error: `Tool not found: ${toolCode}` };
    }

    // Find the consumable product
    const { data: consumable } = await supabase
      .from('products')
      .select('id')
      .eq('product_code', consumableCode)
      .single();
    
    if (!consumable) {
      return { error: `Consumable not found: ${consumableCode}` };
    }

    // Add the compatibility
    const { error } = await supabase
      .from('tool_consumable_compatibility')
      .insert({
        tool_product_id: tool.id,
        consumable_product_id: consumable.id
      });

    if (error) {
      if (error.code === '23505') {
        return { error: `Already exists: ${toolCode} → ${consumableCode}` };
      }
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage:
  Add single compatibility:
    node scripts/add-compatibility.js TOOL_CODE CONSUMABLE_CODE
    
  Add from CSV file:
    node scripts/add-compatibility.js import path/to/file.csv
    
  Example:
    node scripts/add-compatibility.js FF-HH/35-FP-01 MOULD-15
    node scripts/add-compatibility.js import new_compatibilities.csv

CSV Format (no headers):
  TOOL_CODE,CONSUMABLE_CODE
  FF-HH/35-FP-01,MOULD-15
  FF-HH/35-FP-01,MOULD-16
    `);
    process.exit(0);
  }

  if (args[0] === 'import' && args[1]) {
    // Import from CSV file
    const filePath = args[1];
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rows = csv.parse(fileContent, { 
      columns: false,
      skip_empty_lines: true 
    });

    console.log(`📦 Importing ${rows.length} compatibility records...`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      const [toolCode, consumableCode] = row.map(s => s.trim());
      
      if (!toolCode || !consumableCode) continue;
      
      const result = await addCompatibility(toolCode, consumableCode);
      
      if (result.success) {
        console.log(`✅ Added: ${toolCode} → ${consumableCode}`);
        successCount++;
      } else {
        console.log(`❌ Error: ${result.error}`);
        errorCount++;
      }
    }

    console.log(`\n✨ Import complete!`);
    console.log(`Success: ${successCount}, Errors: ${errorCount}`);

  } else if (args.length === 2) {
    // Add single compatibility
    const [toolCode, consumableCode] = args;
    
    console.log(`Adding compatibility: ${toolCode} → ${consumableCode}`);
    
    const result = await addCompatibility(toolCode, consumableCode);
    
    if (result.success) {
      console.log('✅ Compatibility added successfully!');
    } else {
      console.error(`❌ Error: ${result.error}`);
    }
  } else {
    console.error('❌ Invalid arguments. Run without arguments to see usage.');
  }
}

main().catch(console.error);