'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Package, ShoppingCart, Calendar, FileText } from 'lucide-react';
import Image from 'next/image';
import { Customer, Product } from '@/types/database';
import Link from 'next/link';

interface CustomerTool extends Product {
  purchase_date?: string;
  compatible_consumables?: Product[];
}

export default function CustomerPortalPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const token = params.token as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tools, setTools] = useState<CustomerTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsumables, setSelectedConsumables] = useState<{[key: string]: number}>({});
  const [reminderFrequency, setReminderFrequency] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');

  useEffect(() => {
    if (token) {
      validateTokenAndLoadData();
    }
  }, [token]);

  const validateTokenAndLoadData = async () => {
    try {
      setLoading(true);
      
      // Validate the token and get customer
      const { data: linkData, error: linkError } = await supabase
        .from('customer_links')
        .select('customer_id, expires_at')
        .eq('link_token', token)
        .single();

      if (linkError || !linkData) {
        console.error('Invalid token');
        router.push('/customer-portal');
        return;
      }

      // Check if link is expired
      if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
        console.error('Link expired');
        router.push('/customer-portal');
        return;
      }

      // Update last accessed
      await supabase
        .from('customer_links')
        .update({ last_accessed: new Date().toISOString() })
        .eq('link_token', token);

      // Get customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', linkData.customer_id)
        .single();

      if (customerError || !customerData) {
        console.error('Customer not found');
        return;
      }

      setCustomer(customerData);
      setReminderFrequency(customerData.reminder_frequency || 'monthly');

      // Get customer's tools
      const { data: customerTools, error: toolsError } = await supabase
        .from('customer_tool')
        .select(`
          tool_product_id,
          purchase_date,
          quantity,
          products!tool_product_id (*)
        `)
        .eq('customer_id', linkData.customer_id);

      if (toolsError) {
        console.error('Error fetching tools:', toolsError);
        return;
      }

      // For each tool, get compatible consumables
      const toolsWithConsumables = await Promise.all(
        (customerTools || []).map(async (ct: any) => {
          const tool = ct.products;
          
          // Get compatible consumables
          const { data: compatibility } = await supabase
            .from('tool_consumable_compatibility')
            .select('consumable_product_id')
            .eq('tool_product_id', tool.id);

          if (compatibility && compatibility.length > 0) {
            const consumableIds = compatibility.map(c => c.consumable_product_id);
            
            const { data: consumables } = await supabase
              .from('products')
              .select('*')
              .in('id', consumableIds);

            return {
              ...tool,
              purchase_date: ct.purchase_date,
              compatible_consumables: consumables || []
            };
          }

          return {
            ...tool,
            purchase_date: ct.purchase_date,
            compatible_consumables: []
          };
        })
      );

      setTools(toolsWithConsumables);
    } catch (error) {
      console.error('Error loading portal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConsumableQuantityChange = (consumableId: string, quantity: number) => {
    setSelectedConsumables(prev => ({
      ...prev,
      [consumableId]: quantity
    }));
  };

  const calculateTotal = () => {
    let total = 0;
    tools.forEach(tool => {
      tool.compatible_consumables?.forEach(consumable => {
        const quantity = selectedConsumables[consumable.id] || 0;
        total += (consumable.sales_price || 0) * quantity;
      });
    });
    return total;
  };

  const handleCheckout = () => {
    const items = tools.flatMap(tool =>
      tool.compatible_consumables
        ?.filter(c => selectedConsumables[c.id] > 0)
        .map(c => ({
          product_id: c.id,
          product_code: c.product_code,
          description: c.description,
          quantity: selectedConsumables[c.id],
          price: c.sales_price
        })) || []
    );
    
    console.log('Checkout items:', items);
    // This would integrate with Stripe checkout
  };

  const handleRequestProforma = async () => {
    const items = tools.flatMap(tool =>
      tool.compatible_consumables
        ?.filter(c => selectedConsumables[c.id] > 0)
        .map(c => ({
          product_id: c.id,
          product_code: c.product_code,
          description: c.description,
          quantity: selectedConsumables[c.id],
          price: c.sales_price
        })) || []
    );
    
    console.log('Requesting proforma for:', items);
    // This would integrate with Zoho to generate proforma
  };

  const updateReminderFrequency = async (frequency: 'weekly' | 'monthly' | 'quarterly') => {
    if (!customer) return;
    
    const { error } = await supabase
      .from('customers')
      .update({ reminder_frequency: frequency })
      .eq('id', customer.id);

    if (!error) {
      setReminderFrequency(frequency);
      setCustomer({ ...customer, reminder_frequency: frequency });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h2>
          <p className="text-gray-600 mb-6">This portal link is no longer valid.</p>
          <Link href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Technifold Customer Portal</h1>
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              Visit Main Site
            </Link>
          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <section className="bg-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {customer.company_name}!
          </h2>
          <p className="text-blue-100">
            Your personalized portal for managing tools and reordering consumables
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Reminder Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="text-blue-600 mr-3" size={24} />
              <div>
                <h3 className="font-semibold text-gray-900">Reminder Settings</h3>
                <p className="text-sm text-gray-600">
                  How often would you like to receive reorder reminders?
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              {(['weekly', 'monthly', 'quarterly'] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => updateReminderFrequency(freq)}
                  className={`px-4 py-2 rounded-lg capitalize ${
                    reminderFrequency === freq
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Your Tools */}
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Your Tools & Consumables</h3>
        
        {tools.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-600">No tools registered to your account yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {tools.map((tool) => (
              <div key={tool.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Tool Header */}
                <div className="bg-gray-50 p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">
                        {tool.description || tool.product_code}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Product Code: {tool.product_code}
                        {tool.purchase_date && ` • Purchased: ${new Date(tool.purchase_date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Tool Type</p>
                      <p className="font-semibold text-gray-900">{tool.product_group_detail}</p>
                    </div>
                  </div>
                </div>

                {/* Compatible Consumables */}
                <div className="p-6">
                  <h5 className="font-semibold text-gray-900 mb-4">
                    Compatible Consumables ({tool.compatible_consumables?.length || 0})
                  </h5>
                  
                  {tool.compatible_consumables && tool.compatible_consumables.length > 0 ? (
                    <div className="space-y-3">
                      {tool.compatible_consumables.map((consumable) => (
                        <div
                          key={consumable.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="relative h-16 w-16 bg-gray-100 rounded overflow-hidden">
                              {consumable.image_url ? (
                                <Image
                                  src={consumable.image_url}
                                  alt={consumable.description || consumable.product_code}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <Package className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <p className="font-medium text-gray-900">
                                {consumable.description || consumable.product_code}
                              </p>
                              <p className="text-sm text-gray-500">{consumable.product_code}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                £{consumable.sales_price?.toFixed(2) || 'POA'}
                              </p>
                              <p className="text-xs text-gray-500">per unit</p>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <label className="text-sm text-gray-600">Qty:</label>
                              <input
                                type="number"
                                min="0"
                                value={selectedConsumables[consumable.id] || 0}
                                onChange={(e) => handleConsumableQuantityChange(consumable.id, parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border rounded-lg text-center"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No consumables available for this tool
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Summary */}
        {Object.values(selectedConsumables).some(q => q > 0) && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Order Summary</h3>
                <p className="text-gray-600">
                  {Object.values(selectedConsumables).reduce((a, b) => a + b, 0)} items selected
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  £{calculateTotal().toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleCheckout}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <ShoppingCart className="mr-2" size={20} />
                Proceed to Checkout
              </button>
              <button
                onClick={handleRequestProforma}
                className="flex-1 px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center"
              >
                <FileText className="mr-2" size={20} />
                Request Proforma Invoice
              </button>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12 bg-gray-100 rounded-xl p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Need Assistance?
          </h3>
          <p className="text-gray-600 mb-6">
            Our team is here to help with your orders and technical questions
          </p>
          <div className="flex justify-center space-x-4">
            <a
              href="mailto:sales@technifold.com"
              className="px-6 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Email Support
            </a>
            <a
              href="tel:+441234567890"
              className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              Call: +44 (0) 1234 567890
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}