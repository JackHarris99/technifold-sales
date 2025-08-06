export type ProductGroup = 'Tool' | 'Consumable' | 'Parts';
export type ReminderFrequency = 'weekly' | 'monthly' | 'quarterly';
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface Product {
  id: string;
  product_code: string;
  description: string | null;
  sales_price: number | null;
  cost_price: number | null;
  product_group: ProductGroup | null;
  product_group_detail: string | null;
  image_url: string | null;
  features: string[] | null;
  benefits: string[] | null;
  instructions: string | null;
  video_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  customer_code: string;
  company_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  reminder_frequency: ReminderFrequency | null;
  last_reminder_sent: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerTool {
  id: string;
  customer_id: string;
  tool_product_id: string;
  purchase_date: string | null;
  quantity: number;
  created_at: string;
}

export interface ToolConsumableCompatibility {
  id: string;
  tool_product_id: string;
  consumable_product_id: string;
  created_at: string;
}

export interface ToolManufacturerDetail {
  id: string;
  tool_product_id: string;
  manufacturer: string;
  detail: string;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  order_number: string;
  order_date: string;
  total_amount: number | null;
  status: OrderStatus;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  created_at: string;
}

export interface CustomerLink {
  id: string;
  customer_id: string;
  link_token: string;
  expires_at: string | null;
  created_at: string;
  last_accessed: string | null;
}

// Extended types with relations
export interface ProductWithRelations extends Product {
  compatible_consumables?: Product[];
  manufacturer_details?: ToolManufacturerDetail[];
}

export interface CustomerWithTools extends Customer {
  tools?: Product[];
}

export interface OrderWithItems extends Order {
  items?: (OrderItem & { product?: Product })[];
  customer?: Customer;
}