-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code TEXT UNIQUE NOT NULL,
  description TEXT,
  sales_price DECIMAL(10, 2),
  cost_price DECIMAL(10, 2),
  product_group TEXT CHECK (product_group IN ('Tool', 'Consumable')),
  product_group_detail TEXT,
  image_url TEXT,
  features TEXT[],
  benefits TEXT[],
  instructions TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_code TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  postal_code TEXT,
  reminder_frequency TEXT CHECK (reminder_frequency IN ('weekly', 'monthly', 'quarterly')),
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create customer_tool junction table
CREATE TABLE IF NOT EXISTS customer_tool (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  tool_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  purchase_date DATE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(customer_id, tool_product_id)
);

-- Create tool_consumable_compatibility table
CREATE TABLE IF NOT EXISTS tool_consumable_compatibility (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  consumable_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(tool_product_id, consumable_product_id)
);

-- Create tool_manufacturer_details table
CREATE TABLE IF NOT EXISTS tool_manufacturer_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  manufacturer TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(tool_product_id, manufacturer, detail)
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  order_number TEXT UNIQUE NOT NULL,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  total_amount DECIMAL(10, 2),
  status TEXT DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create customer_links table for personalized URLs
CREATE TABLE IF NOT EXISTS customer_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  link_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  last_accessed TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_products_product_code ON products(product_code);
CREATE INDEX idx_products_product_group ON products(product_group);
CREATE INDEX idx_customers_customer_code ON customers(customer_code);
CREATE INDEX idx_tool_manufacturer_details_manufacturer ON tool_manufacturer_details(manufacturer);
CREATE INDEX idx_tool_manufacturer_details_detail ON tool_manufacturer_details(detail);
CREATE INDEX idx_customer_links_link_token ON customer_links(link_token);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();