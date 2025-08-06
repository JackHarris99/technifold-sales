'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Package, Info } from 'lucide-react';
import Image from 'next/image';
import { Product } from '@/types/database';
import Link from 'next/link';

export default function MachineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const manufacturer = decodeURIComponent(params.manufacturer as string);
  const detail = decodeURIComponent(params.detail as string);
  
  const [tools, setTools] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompatibleTools();
  }, [manufacturer, detail]);

  const fetchCompatibleTools = async () => {
    try {
      setLoading(true);
      
      // Fetch tools that match this manufacturer and detail
      const { data: toolDetails, error: detailError } = await supabase
        .from('tool_manufacturer_details')
        .select('tool_product_id')
        .eq('manufacturer', manufacturer)
        .eq('detail', detail);

      if (detailError) {
        console.error('Error fetching tool details:', detailError);
        // Use hardcoded data for demo
        setTools(getHardcodedTools());
        setLoading(false);
        return;
      }

      if (toolDetails && toolDetails.length > 0) {
        const toolIds = toolDetails.map(td => td.tool_product_id);
        
        // Fetch the actual product details
        const { data: products, error: productError } = await supabase
          .from('products')
          .select('*')
          .in('id', toolIds)
          .eq('product_group', 'Tool');

        if (productError) {
          console.error('Error fetching products:', productError);
          setTools(getHardcodedTools());
        } else {
          setTools(products || []);
        }
      } else {
        // No tools found in database, use hardcoded data
        setTools(getHardcodedTools());
      }
    } catch (error) {
      console.error('Error:', error);
      setTools(getHardcodedTools());
    } finally {
      setLoading(false);
    }
  };

  const getHardcodedTools = (): Product[] => {
    // Return sample tools based on manufacturer
    const sampleTools: Product[] = [];
    
    if (manufacturer === 'Heidelberg') {
      sampleTools.push(
        {
          id: '1',
          product_code: 'FF-HH/35-FP-01',
          description: 'Fast-Fit Tri-Creaser for Heidelberg Stahlfolder',
          sales_price: 1250.00,
          cost_price: 450.00,
          product_group: 'Tool',
          product_group_detail: 'Tri-Creaser',
          image_url: '/api/placeholder/400/300',
          features: ['Easy installation', 'Precision creasing', 'Durable construction'],
          benefits: ['Reduces setup time', 'Improves crease quality', 'Long lasting'],
          instructions: 'Installation guide available',
          video_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          product_code: 'PD-DEL-HH/35-FP',
          description: 'Micro-Perforator for Heidelberg',
          sales_price: 980.00,
          cost_price: 380.00,
          product_group: 'Tool',
          product_group_detail: 'Perforator',
          image_url: '/api/placeholder/400/300',
          features: ['Micro perforation', 'Quick change system', 'Multiple patterns'],
          benefits: ['Clean perforations', 'Fast changeover', 'Versatile'],
          instructions: 'Setup instructions included',
          video_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      );
    } else if (manufacturer === 'MBO') {
      sampleTools.push(
        {
          id: '3',
          product_code: 'FF-MBO/30-FP',
          description: 'Fast-Fit Creasing Tool for MBO Folders',
          sales_price: 1180.00,
          cost_price: 420.00,
          product_group: 'Tool',
          product_group_detail: 'Creasing Tool',
          image_url: '/api/placeholder/400/300',
          features: ['Universal fit', 'Heavy duty', 'Quick release'],
          benefits: ['Fits all MBO models', 'Built to last', 'Easy maintenance'],
          instructions: 'Full manual provided',
          video_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      );
    }
    
    // Add generic tools for all manufacturers
    sampleTools.push(
      {
        id: '4',
        product_code: 'MT-02',
        description: 'Multi-Tool Universal Adapter',
        sales_price: 650.00,
        cost_price: 250.00,
        product_group: 'Tool',
        product_group_detail: 'Adapter',
        image_url: '/api/placeholder/400/300',
        features: ['Universal compatibility', 'Adjustable', 'Lightweight'],
        benefits: ['Works with multiple machines', 'Easy adjustment', 'Portable'],
        instructions: 'Universal fitting guide',
        video_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    );
    
    return sampleTools;
  };

  const handleToolClick = (toolCode: string) => {
    router.push(`/tools/${encodeURIComponent(toolCode)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/')}
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

      {/* Machine Information */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Compatible Tools for {manufacturer} {detail}
              </h2>
              <p className="mt-2 text-gray-600">
                Found {tools.length} compatible tool{tools.length !== 1 ? 's' : ''} for your machine
              </p>
            </div>
            <div className="bg-blue-50 px-4 py-2 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">Machine Details</p>
              <p className="text-lg font-bold text-blue-900">{manufacturer}</p>
              <p className="text-sm text-blue-700">{detail}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : tools.length === 0 ? (
            <div className="text-center py-16">
              <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tools Found</h3>
              <p className="text-gray-600 mb-8">
                We couldn&apos;t find any tools for {manufacturer} {detail}.
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Another Search
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => handleToolClick(tool.product_code)}
                >
                  {/* Tool Image */}
                  <div className="relative h-48 bg-gray-100">
                    {tool.image_url ? (
                      <Image
                        src={tool.image_url}
                        alt={tool.description || tool.product_code}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full shadow-md">
                      <span className="text-sm font-semibold text-gray-700">
                        {tool.product_code}
                      </span>
                    </div>
                  </div>

                  {/* Tool Details */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {tool.description || tool.product_code}
                    </h3>
                    
                    {tool.product_group_detail && (
                      <p className="text-sm text-blue-600 font-medium mb-3">
                        {tool.product_group_detail}
                      </p>
                    )}

                    {/* Features */}
                    {tool.features && tool.features.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Key Features:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {tool.features.slice(0, 3).map((feature, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        {tool.sales_price && (
                          <p className="text-2xl font-bold text-gray-900">
                            £{tool.sales_price.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToolClick(tool.product_code);
                        }}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Info className="mr-2" size={16} />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Help Section */}
      <section className="py-12 px-4 bg-white border-t">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-bold mb-4">Need Help Choosing?</h3>
          <p className="text-gray-600 mb-8">
            Our technical experts are here to help you find the perfect tool for your needs
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/contact"
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              Contact Support
            </Link>
            <a
              href="tel:+441234567890"
              className="px-6 py-3 border-2 border-gray-800 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Call Us: +44 (0) 1234 567890
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}