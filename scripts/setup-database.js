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
  console.log('Please add:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_url_here');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_key_here');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');

  try {
    // Step 1: Import Products
    console.log('📦 Importing products...');
    const productsPath = path.join(__dirname, '../../Product_Sales_Summary.csv 05-08-2025.csv');
    if (fs.existsSync(productsPath)) {
      const productsData = fs.readFileSync(productsPath, 'utf-8');
      const products = csv.parse(productsData, { columns: true, skip_empty_lines: true });
      
      const productsToInsert = products.map(p => {
        // Map product groups to valid values
        let productGroup = p.product_group;
        
        // Handle empty or invalid product groups
        if (!productGroup || productGroup.trim() === '' || !['Tool', 'Consumable'].includes(productGroup)) {
          // Default to Consumable if empty or invalid
          productGroup = 'Consumable';
        }
        
        return {
          product_code: p.product_code,
          description: p.description,
          sales_price: parseFloat(p.sales_price) || null,
          cost_price: parseFloat(p.cost_price) || null,
          product_group: productGroup,
          product_group_detail: p.product_group_detail || p.product_group || null, // Store original group in detail
          image_url: `/product_images/${p.product_code}.jpg` // Will check if exists
        };
      });

      const { error: productsError } = await supabase
        .from('products')
        .upsert(productsToInsert, { onConflict: 'product_code' });

      if (productsError) {
        console.error('Error importing products:', JSON.stringify(productsError, null, 2));
      } else {
        console.log(`✅ Imported ${productsToInsert.length} products`);
      }
    }

    // Step 2: Import Tool to Manufacturer Details
    console.log('\n🔧 Importing tool manufacturer details...');
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
      
      console.log(`Found ${toolManufacturers.length} manufacturer detail records`);
      
      // First, get ALL products to map product_code to id (remove default limit)
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, product_code')
        .limit(10000); // Set explicit high limit
      
      const productMap = {};
      allProducts?.forEach(p => {
        productMap[p.product_code] = p.id;
      });
      
      console.log(`Found ${Object.keys(productMap).length} products in database`);

      const manufacturerDetailsToInsert = [];
      const missingProducts = [];
      const seenCombinations = new Set(); // Track unique combinations
      
      toolManufacturers.forEach(tm => {
        // Clean the product code (remove BOM and trim)
        const cleanProductCode = tm.product_code?.replace(/^\uFEFF/, '').trim();
        const manufacturer = tm.manufacturer?.trim();
        const detail = tm.detail?.trim();
        const productId = productMap[cleanProductCode];
        
        // Create unique key for this combination
        const uniqueKey = `${productId}-${manufacturer}-${detail}`;
        
        if (productId && !seenCombinations.has(uniqueKey)) {
          seenCombinations.add(uniqueKey);
          manufacturerDetailsToInsert.push({
            tool_product_id: productId,
            manufacturer: manufacturer,
            detail: detail
          });
        } else if (cleanProductCode && !productId) {
          if (!missingProducts.includes(cleanProductCode)) {
            missingProducts.push(cleanProductCode);
          }
        }
      });
      
      if (missingProducts.length > 0) {
        console.log(`⚠️  ${missingProducts.length} products not found in database:`, missingProducts.slice(0, 5));
      }

      if (manufacturerDetailsToInsert.length > 0) {
        const { error: manufacturerError } = await supabase
          .from('tool_manufacturer_details')
          .upsert(manufacturerDetailsToInsert, { 
            onConflict: 'tool_product_id,manufacturer,detail' 
          });

        if (manufacturerError) {
          console.error('Error importing manufacturer details:', JSON.stringify(manufacturerError, null, 2));
        } else {
          console.log(`✅ Imported ${manufacturerDetailsToInsert.length} manufacturer details`);
        }
      } else {
        console.log('❌ No manufacturer details to import - check product codes match');
      }
    }

    // Step 3: Import Tool to Consumable Compatibility
    console.log('\n🔗 Importing tool-consumable compatibility...');
    const toolConsumablePath = path.join(__dirname, '../../Tool_Code_to_Consumable_Code_Pairings - Fron Chat GPT.csv');
    if (fs.existsSync(toolConsumablePath)) {
      const toolConsumableData = fs.readFileSync(toolConsumablePath, 'utf-8');
      const toolConsumables = csv.parse(toolConsumableData, { columns: true, skip_empty_lines: true });
      
      // Get all products again for mapping
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, product_code');
      
      const productMap = {};
      allProducts?.forEach(p => {
        productMap[p.product_code] = p.id;
      });

      const compatibilityToInsert = [];
      toolConsumables.forEach(tc => {
        const toolId = productMap[tc.tool_code];
        const consumableId = productMap[tc.consumable_code];
        if (toolId && consumableId) {
          compatibilityToInsert.push({
            tool_product_id: toolId,
            consumable_product_id: consumableId
          });
        }
      });

      if (compatibilityToInsert.length > 0) {
        const { error: compatibilityError } = await supabase
          .from('tool_consumable_compatibility')
          .upsert(compatibilityToInsert, { 
            onConflict: 'tool_product_id,consumable_product_id' 
          });

        if (compatibilityError) {
          console.error('Error importing compatibility:', compatibilityError);
        } else {
          console.log(`✅ Imported ${compatibilityToInsert.length} compatibility records`);
        }
      }
    }

    // Step 4: Import Customers
    console.log('\n👥 Importing customers...');
    const customersPath = path.join(__dirname, '../../all technifold customers sage.csv');
    if (fs.existsSync(customersPath)) {
      const customersData = fs.readFileSync(customersPath, 'utf-8');
      const customers = csv.parse(customersData, { columns: true, skip_empty_lines: true });
      
      const customersToInsert = customers.map(c => {
        // Map the CSV columns to our database columns
        return {
          customer_code: c.customer_code,
          company_name: c.company_name || 'Unknown Company',
          email: c.email_primary || c.email_secondary || c.email_tertiary || null,
          phone: c.phone || null,
          address: null, // Not in the CSV
          city: null, // Not in the CSV
          country: null, // Not in the CSV
          postal_code: null // Not in the CSV
        };
      }).filter(c => c.customer_code && c.customer_code.trim() !== ''); // Only include if has customer code

      if (customersToInsert.length > 0) {
        const { error: customersError } = await supabase
          .from('customers')
          .upsert(customersToInsert, { onConflict: 'customer_code' });

        if (customersError) {
          console.error('Error importing customers:', JSON.stringify(customersError, null, 2));
        } else {
          console.log(`✅ Imported ${customersToInsert.length} customers`);
        }
      }
    }

    // Step 5: Import Customer-Tool Relationships
    console.log('\n🔧 Importing customer-tool relationships...');
    const customerToolPath = path.join(__dirname, '../../Customer_to_Tool_Mapping.csv');
    if (fs.existsSync(customerToolPath)) {
      const customerToolData = fs.readFileSync(customerToolPath, 'utf-8');
      const customerTools = csv.parse(customerToolData, { columns: true, skip_empty_lines: true });
      
      // Get all customers and products for mapping
      const { data: allCustomers } = await supabase
        .from('customers')
        .select('id, customer_code');
      
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, product_code');
      
      const customerMap = {};
      allCustomers?.forEach(c => {
        customerMap[c.customer_code] = c.id;
      });
      
      const productMap = {};
      allProducts?.forEach(p => {
        productMap[p.product_code] = p.id;
      });

      const customerToolsToInsert = [];
      customerTools.forEach(ct => {
        const customerId = customerMap[ct.customer_code];
        const toolId = productMap[ct.tool_code];
        if (customerId && toolId) {
          customerToolsToInsert.push({
            customer_id: customerId,
            tool_product_id: toolId
          });
        }
      });

      if (customerToolsToInsert.length > 0) {
        const { error: customerToolError } = await supabase
          .from('customer_tool')
          .upsert(customerToolsToInsert, { 
            onConflict: 'customer_id,tool_product_id' 
          });

        if (customerToolError) {
          console.error('Error importing customer-tool relationships:', customerToolError);
        } else {
          console.log(`✅ Imported ${customerToolsToInsert.length} customer-tool relationships`);
        }
      }
    }

    console.log('\n✨ Database setup complete!');
    console.log('You can now run: npm run dev');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupDatabase();