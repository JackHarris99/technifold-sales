'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Package, ShoppingCart, FileText, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { Product } from '@/types/database';
import Link from 'next/link';

interface ConsumableWithDetails extends Product {
  quantity?: number;
}

export default function ToolProductPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const productCode = decodeURIComponent(params.productCode as string);
  
  const [tool, setTool] = useState<Product | null>(null);
  const [consumables, setConsumables] = useState<ConsumableWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'features' | 'instructions' | 'video'>('features');
  const [selectedConsumables, setSelectedConsumables] = useState<{[key: string]: number}>({});
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchToolDetails();
  }, [productCode]);

  const fetchToolDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch the tool details
      const { data: toolData, error: toolError } = await supabase
        .from('products')
        .select('*')
        .eq('product_code', productCode)
        .single();

      if (toolError) {
        console.error('Error fetching tool:', toolError);
        return;
      }

      setTool(toolData);

      // Fetch compatible consumables
      const { data: compatibilityData, error: compatibilityError } = await supabase
        .from('tool_consumable_compatibility')
        .select('consumable_product_id')
        .eq('tool_product_id', toolData.id);

      if (compatibilityError) {
        console.error('Error fetching compatibility:', compatibilityError);
        return;
      }

      if (compatibilityData && compatibilityData.length > 0) {
        const consumableIds = compatibilityData.map(c => c.consumable_product_id);
        
        // Fetch the actual consumable products
        const { data: consumableProducts, error: consumableError } = await supabase
          .from('products')
          .select('*')
          .in('id', consumableIds)
          .eq('product_group', 'Consumable');

        if (consumableError) {
          console.error('Error fetching consumables:', consumableError);
        } else {
          setConsumables(consumableProducts || []);
        }
      }
    } catch (error) {
      console.error('Error:', error);
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
    let total = tool?.sales_price || 0;
    consumables.forEach(consumable => {
      const quantity = selectedConsumables[consumable.id] || 0;
      total += (consumable.sales_price || 0) * quantity;
    });
    return total;
  };

  const handleAddToCart = () => {
    // This would integrate with your cart/checkout system
    const items = [
      { product: tool, quantity: 1 },
      ...consumables
        .filter(c => selectedConsumables[c.id] > 0)
        .map(c => ({ product: c, quantity: selectedConsumables[c.id] }))
    ];
    console.log('Adding to cart:', items);
    // Navigate to checkout or add to cart state
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tool Not Found</h2>
          <p className="text-gray-600 mb-6">We couldn't find a tool with code: {productCode}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Technifold Ltd</h1>
            </div>
            <nav className="flex space-x-6">
              <Link href="/" className="text-gray-700 hover:text-gray-900">Home</Link>
              <Link href="/products" className="text-gray-700 hover:text-gray-900">Products</Link>
              <Link href="/customer-portal" className="text-gray-700 hover:text-gray-900">Portal</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Product Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Product Image */}
            <div className="relative h-96 md:h-full bg-gray-100">
              {tool.image_url && !imageError ? (
                <Image
                  src={tool.image_url}
                  alt={tool.description || tool.product_code}
                  fill
                  className="object-contain p-8"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-32 w-32 text-gray-400" />
                </div>
              )}
              <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded-full shadow-md">
                <span className="text-sm font-semibold text-gray-700">
                  {tool.product_code}
                </span>
              </div>
            </div>

            {/* Product Info */}
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {tool.description || tool.product_code}
              </h1>
              
              {tool.product_group_detail && (
                <p className="text-lg text-blue-600 font-medium mb-6">
                  {tool.product_group_detail}
                </p>
              )}

              {/* Price */}
              <div className="mb-6">
                <p className="text-4xl font-bold text-gray-900">
                  £{tool.sales_price?.toFixed(2) || 'POA'}
                </p>
                <p className="text-sm text-gray-500 mt-1">Excluding VAT</p>
              </div>

              {/* Tabs */}
              <div className="border-b mb-6">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('features')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'features'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Features & Benefits
                  </button>
                  <button
                    onClick={() => setActiveTab('instructions')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'instructions'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Instructions
                  </button>
                  {tool.video_url && (
                    <button
                      onClick={() => setActiveTab('video')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'video'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Video
                    </button>
                  )}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mb-8">
                {activeTab === 'features' && (
                  <div>
                    {tool.features && tool.features.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Key Features:</h3>
                        <ul className="space-y-2">
                          {tool.features.map((feature, index) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
                              <span className="text-gray-700">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {tool.benefits && tool.benefits.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Benefits:</h3>
                        <ul className="space-y-2">
                          {tool.benefits.map((benefit, index) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
                              <span className="text-gray-700">{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'instructions' && (
                  <div>
                    {tool.instructions ? (
                      <div className="prose max-w-none">
                        <p className="text-gray-700">{tool.instructions}</p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                        <p className="text-gray-500">
                          Instructions will be provided with your order
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'video' && tool.video_url && (
                  <div>
                    <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg">
                      <iframe
                        src={tool.video_url}
                        className="w-full h-full rounded-lg"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={() => handleAddToCart()}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <ShoppingCart className="mr-2" size={20} />
                Add Tool to Quote
              </button>
            </div>
          </div>
        </div>

        {/* Compatible Consumables Section */}
        {consumables.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Compatible Consumables for This Tool
            </h2>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="grid gap-4">
                {consumables.map((consumable) => (
                  <div
                    key={consumable.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      {/* Consumable Image */}
                      <div className="relative h-20 w-20 bg-gray-100 rounded-lg overflow-hidden">
                        {consumable.image_url ? (
                          <Image
                            src={consumable.image_url}
                            alt={consumable.description || consumable.product_code}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Consumable Details */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {consumable.description || consumable.product_code}
                        </h3>
                        <p className="text-sm text-gray-500">{consumable.product_code}</p>
                        {consumable.product_group_detail && (
                          <p className="text-sm text-blue-600">{consumable.product_group_detail}</p>
                        )}
                      </div>
                    </div>

                    {/* Price and Quantity */}
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

              {/* Total and Add to Cart */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      Total: £{calculateTotal().toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">Tool + selected consumables</p>
                  </div>
                  <button
                    onClick={handleAddToCart}
                    disabled={Object.values(selectedConsumables).every(q => q === 0)}
                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    <ShoppingCart className="mr-2" size={20} />
                    Add All to Quote
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Section */}
        <div className="mt-12 bg-blue-50 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Need Help or Custom Configuration?
          </h3>
          <p className="text-gray-600 mb-6">
            Our technical experts are here to help you find the perfect solution for your needs
          </p>
          <div className="flex justify-center space-x-4">
            <a
              href={`mailto:sales@technifold.com?subject=Inquiry about ${tool.product_code}`}
              className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Email Us
            </a>
            <a
              href="tel:+441234567890"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Call: +44 (0) 1234 567890
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}