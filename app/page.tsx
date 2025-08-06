'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Search, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface ManufacturerDetail {
  manufacturer: string;
  details: string[];
}

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [manufacturers, setManufacturers] = useState<ManufacturerDetail[]>([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [selectedDetail, setSelectedDetail] = useState('');
  const [availableDetails, setAvailableDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchManufacturers();
  }, []);

  useEffect(() => {
    if (selectedManufacturer) {
      const manufacturer = manufacturers.find(m => m.manufacturer === selectedManufacturer);
      setAvailableDetails(manufacturer?.details || []);
      setSelectedDetail('');
    }
  }, [selectedManufacturer, manufacturers]);

  const fetchManufacturers = async () => {
    try {
      const { data, error } = await supabase
        .from('tool_manufacturer_details')
        .select('manufacturer, detail')
        .order('manufacturer');

      if (error) {
        console.error('Error fetching manufacturers:', error);
        // For now, use hardcoded data if database is not connected
        setManufacturers(getHardcodedManufacturers());
        return;
      }

      // Group by manufacturer
      const grouped = data.reduce((acc: ManufacturerDetail[], curr) => {
        const existing = acc.find(m => m.manufacturer === curr.manufacturer);
        if (existing) {
          if (!existing.details.includes(curr.detail)) {
            existing.details.push(curr.detail);
          }
        } else {
          acc.push({
            manufacturer: curr.manufacturer,
            details: [curr.detail]
          });
        }
        return acc;
      }, []);

      setManufacturers(grouped);
    } catch (error) {
      console.error('Error:', error);
      // Fallback to hardcoded data
      setManufacturers(getHardcodedManufacturers());
    }
  };

  const getHardcodedManufacturers = (): ManufacturerDetail[] => {
    return [
      { manufacturer: 'Heidelberg', details: ['Stahlfolder', 'TH82', 'KH82', 'TI52'] },
      { manufacturer: 'MBO', details: ['K800', 'K76', 'B30', 'T49'] },
      { manufacturer: 'GUK', details: ['35mm', '20mm'] },
      { manufacturer: 'Duplo', details: ['iSaddle', 'DC616', 'DC646'] },
      { manufacturer: 'Horizon', details: ['AFC-566F', 'SPF-200', 'VAC-100'] },
      { manufacturer: 'Muller Martini', details: ['Presto', 'Tempo', 'Primera'] },
      { manufacturer: 'Kolbus', details: ['KM600', 'HD143', 'BF530'] },
      { manufacturer: 'Baumfolder', details: ['22mm', '28mm'] },
      { manufacturer: 'Agor', details: ['36mm'] },
    ];
  };

  const handleFindTools = () => {
    if (selectedManufacturer && selectedDetail) {
      setLoading(true);
      // Navigate to the machine detail hub page
      router.push(`/machines/${encodeURIComponent(selectedManufacturer)}/${encodeURIComponent(selectedDetail)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Technifold Ltd</h1>
            </div>
            <nav className="flex space-x-8">
              <Link href="/products" className="text-gray-700 hover:text-gray-900">Products</Link>
              <Link href="/about" className="text-gray-700 hover:text-gray-900">About</Link>
              <Link href="/contact" className="text-gray-700 hover:text-gray-900">Contact</Link>
              <Link href="/account" className="text-gray-700 hover:text-gray-900">Account</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Find the Perfect Tool for Your Machine
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            We specialize in print finishing equipment and accessories that retrofit onto machinery 
            from leading manufacturers. Find compatible tools for your specific machine below.
          </p>

          {/* Search Tool */}
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {/* Manufacturer Dropdown */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Manufacturer
                </label>
                <div className="relative">
                  <select
                    value={selectedManufacturer}
                    onChange={(e) => setSelectedManufacturer(e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  >
                    <option value="">Choose manufacturer...</option>
                    {manufacturers.map((m) => (
                      <option key={m.manufacturer} value={m.manufacturer}>
                        {m.manufacturer}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none mt-3" size={20} />
                </div>
              </div>

              {/* Machine Detail Dropdown */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Machine Model
                </label>
                <div className="relative">
                  <select
                    value={selectedDetail}
                    onChange={(e) => setSelectedDetail(e.target.value)}
                    disabled={!selectedManufacturer}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Choose model...</option>
                    {availableDetails.map((detail) => (
                      <option key={detail} value={detail}>
                        {detail}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none mt-3" size={20} />
                </div>
              </div>

              {/* Find Tools Button */}
              <div className="flex items-end">
                <button
                  onClick={handleFindTools}
                  disabled={!selectedManufacturer || !selectedDetail || loading}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  ) : (
                    <>
                      <Search className="mr-2" size={20} />
                      Find My Tool(s)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Why Choose Technifold?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold mb-2">Perfect Compatibility</h4>
              <p className="text-gray-600">Our tools are designed to perfectly fit machinery from all major manufacturers</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold mb-2">Fast Delivery</h4>
              <p className="text-gray-600">Quick turnaround times with worldwide shipping available</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold mb-2">Expert Support</h4>
              <p className="text-gray-600">Technical support from industry experts to help you find the right solution</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4">Already a Customer?</h3>
          <p className="text-lg text-gray-600 mb-8">
            Access your personalized portal to view your tools and reorder consumables
          </p>
          <Link href="/customer-portal"
            className="inline-block px-8 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors"
          >
            Access Customer Portal
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <h5 className="font-bold mb-4">Technifold Ltd</h5>
            <p className="text-gray-400">Leading supplier of print finishing equipment and accessories</p>
          </div>
          <div>
            <h5 className="font-semibold mb-4">Quick Links</h5>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/products" className="hover:text-white">All Products</Link></li>
              <li><Link href="/tools" className="hover:text-white">Tools</Link></li>
              <li><Link href="/consumables" className="hover:text-white">Consumables</Link></li>
              <li><Link href="/support" className="hover:text-white">Support</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold mb-4">Manufacturers</h5>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/manufacturers/heidelberg" className="hover:text-white">Heidelberg</Link></li>
              <li><Link href="/manufacturers/muller-martini" className="hover:text-white">Muller Martini</Link></li>
              <li><Link href="/manufacturers/duplo" className="hover:text-white">Duplo</Link></li>
              <li><Link href="/manufacturers/kolbus" className="hover:text-white">Kolbus</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold mb-4">Contact</h5>
            <ul className="space-y-2 text-gray-400">
              <li>Email: sales@technifold.com</li>
              <li>Phone: +44 (0) 1234 567890</li>
              <li>Mon-Fri: 9am-5pm GMT</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
          <p>&copy; 2025 Technifold Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
