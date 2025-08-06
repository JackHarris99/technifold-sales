'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Search, Upload, Download } from 'lucide-react';
import { Product } from '@/types/database';
import Link from 'next/link';

interface CompatibilityEntry {
  id?: string;
  tool_code: string;
  consumable_code: string;
  tool_product_id?: string;
  consumable_product_id?: string;
}

export default function CompatibilityAdminPage() {
  const supabase = createClient();
  
  const [tools, setTools] = useState<Product[]>([]);
  const [consumables, setConsumables] = useState<Product[]>([]);
  const [compatibilities, setCompatibilities] = useState<CompatibilityEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [newEntry, setNewEntry] = useState<CompatibilityEntry>({ tool_code: '', consumable_code: '' });
  const [searchTool, setSearchTool] = useState('');
  const [searchConsumable, setSearchConsumable] = useState('');
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  useEffect(() => {
    loadProducts();
    loadExistingCompatibilities();
  }, []);

  const loadProducts = async () => {
    const { data: toolsData } = await supabase
      .from('products')
      .select('*')
      .eq('product_group', 'Tool')
      .order('product_code');
    
    const { data: consumablesData } = await supabase
      .from('products')
      .select('*')
      .eq('product_group', 'Consumable')
      .order('product_code');
    
    setTools(toolsData || []);
    setConsumables(consumablesData || []);
  };

  const loadExistingCompatibilities = async () => {
    // Get total count first
    const { count } = await supabase
      .from('tool_consumable_compatibility')
      .select('*', { count: 'exact', head: true });
    
    // Then get all records (or paginate if needed)
    const { data } = await supabase
      .from('tool_consumable_compatibility')
      .select(`
        id,
        tool_product_id,
        consumable_product_id,
        tool:products!tool_product_id(product_code),
        consumable:products!consumable_product_id(product_code)
      `)
      .limit(1000) // Increased limit
      .order('tool_product_id');
    
    if (data) {
      const formatted = data.map((item: any) => ({
        id: item.id,
        tool_code: item.tool?.product_code || '',
        consumable_code: item.consumable?.product_code || '',
        tool_product_id: item.tool_product_id,
        consumable_product_id: item.consumable_product_id
      }));
      setCompatibilities(formatted);
      setTotalCount(count || 0);
    }
    
    console.log(`Loaded ${data?.length} of ${count} total compatibility records`);
  };

  const findProductId = (productCode: string, productList: Product[]) => {
    const product = productList.find(p => p.product_code === productCode);
    return product?.id;
  };

  const handleAddCompatibility = async () => {
    if (!newEntry.tool_code || !newEntry.consumable_code) {
      setMessage('Please enter both tool and consumable codes');
      return;
    }

    const toolId = findProductId(newEntry.tool_code, tools);
    const consumableId = findProductId(newEntry.consumable_code, consumables);

    if (!toolId) {
      setMessage(`Tool code "${newEntry.tool_code}" not found in database`);
      return;
    }

    if (!consumableId) {
      setMessage(`Consumable code "${newEntry.consumable_code}" not found in database`);
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('tool_consumable_compatibility')
      .insert({
        tool_product_id: toolId,
        consumable_product_id: consumableId
      });

    if (error) {
      if (error.code === '23505') {
        setMessage('This compatibility already exists');
      } else {
        setMessage('Error adding compatibility: ' + error.message);
      }
    } else {
      setMessage('✅ Compatibility added successfully');
      setNewEntry({ tool_code: '', consumable_code: '' });
      loadExistingCompatibilities();
    }
    setLoading(false);
  };

  const handleDeleteCompatibility = async (id: string) => {
    if (!confirm('Are you sure you want to delete this compatibility?')) return;
    
    const { error } = await supabase
      .from('tool_consumable_compatibility')
      .delete()
      .eq('id', id);

    if (!error) {
      setMessage('Compatibility deleted');
      loadExistingCompatibilities();
    }
  };

  const handleBulkUpload = async () => {
    const lines = bulkInput.trim().split('\n');
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    setLoading(true);
    
    for (const line of lines) {
      const [toolCode, consumableCode] = line.split(',').map(s => s.trim());
      
      if (!toolCode || !consumableCode) continue;

      const toolId = findProductId(toolCode, tools);
      const consumableId = findProductId(consumableCode, consumables);

      if (!toolId) {
        errors.push(`Tool "${toolCode}" not found`);
        errorCount++;
        continue;
      }

      if (!consumableId) {
        errors.push(`Consumable "${consumableCode}" not found`);
        errorCount++;
        continue;
      }

      const { error } = await supabase
        .from('tool_consumable_compatibility')
        .insert({
          tool_product_id: toolId,
          consumable_product_id: consumableId
        });

      if (error) {
        if (error.code === '23505') {
          errors.push(`${toolCode} → ${consumableCode} already exists`);
        } else {
          errors.push(`Error with ${toolCode} → ${consumableCode}`);
        }
        errorCount++;
      } else {
        successCount++;
      }
    }

    setLoading(false);
    setMessage(`Bulk upload complete: ${successCount} added, ${errorCount} errors`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
      alert('Errors:\n' + errors.slice(0, 10).join('\n'));
    }
    
    if (successCount > 0) {
      setBulkInput('');
      setShowBulkUpload(false);
      loadExistingCompatibilities();
    }
  };

  const exportData = () => {
    const csv = compatibilities
      .map(c => `${c.tool_code},${c.consumable_code}`)
      .join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tool_consumable_compatibility.csv';
    a.click();
  };

  const filteredTools = tools.filter(t => 
    t.product_code.toLowerCase().includes(searchTool.toLowerCase())
  );

  const filteredConsumables = consumables.filter(c => 
    c.product_code.toLowerCase().includes(searchConsumable.toLowerCase())
  );

  const filteredCompatibilities = compatibilities.filter(c => 
    filterText === '' || 
    c.tool_code.toLowerCase().includes(filterText.toLowerCase()) ||
    c.consumable_code.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Tool-Consumable Compatibility Admin</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowBulkUpload(!showBulkUpload)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Upload className="mr-2" size={16} />
                Bulk Upload
              </button>
              <button
                onClick={exportData}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <Download className="mr-2" size={16} />
                Export CSV
              </button>
              <Link href="/"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Site
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 
            message.includes('Error') ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}

        {/* Bulk Upload Section */}
        {showBulkUpload && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Bulk Upload Compatibility</h2>
            <p className="text-gray-600 mb-4">
              Enter tool-consumable pairs, one per line, in format: TOOL_CODE,CONSUMABLE_CODE
            </p>
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="FF-HH/35-FP-01,MOULD-15
FF-HH/35-FP-01,MOULD-16
FF-HH/35-FP-01,MPB-17"
              className="w-full h-40 px-3 py-2 border rounded-lg font-mono text-sm"
            />
            <div className="mt-4 flex space-x-4">
              <button
                onClick={handleBulkUpload}
                disabled={loading || !bulkInput.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {loading ? 'Processing...' : 'Upload All'}
              </button>
              <button
                onClick={() => {
                  setShowBulkUpload(false);
                  setBulkInput('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add Single Compatibility */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Add New Compatibility</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Tool Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tool Code
              </label>
              <input
                type="text"
                value={newEntry.tool_code}
                onChange={(e) => setNewEntry({ ...newEntry, tool_code: e.target.value })}
                placeholder="Enter tool code (e.g., FF-HH/35-FP-01)"
                className="w-full px-3 py-2 border rounded-lg mb-2"
              />
              
              {/* Tool Search Helper */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTool}
                  onChange={(e) => setSearchTool(e.target.value)}
                  placeholder="Search tools..."
                  className="w-full px-3 py-2 border rounded-lg pl-10"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              </div>
              
              {searchTool && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
                  {filteredTools.slice(0, 10).map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setNewEntry({ ...newEntry, tool_code: tool.product_code });
                        setSearchTool('');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      <span className="font-medium">{tool.product_code}</span>
                      <span className="text-gray-500 ml-2">{tool.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Consumable Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Consumable Code
              </label>
              <input
                type="text"
                value={newEntry.consumable_code}
                onChange={(e) => setNewEntry({ ...newEntry, consumable_code: e.target.value })}
                placeholder="Enter consumable code (e.g., MOULD-15)"
                className="w-full px-3 py-2 border rounded-lg mb-2"
              />
              
              {/* Consumable Search Helper */}
              <div className="relative">
                <input
                  type="text"
                  value={searchConsumable}
                  onChange={(e) => setSearchConsumable(e.target.value)}
                  placeholder="Search consumables..."
                  className="w-full px-3 py-2 border rounded-lg pl-10"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              </div>
              
              {searchConsumable && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
                  {filteredConsumables.slice(0, 10).map(consumable => (
                    <button
                      key={consumable.id}
                      onClick={() => {
                        setNewEntry({ ...newEntry, consumable_code: consumable.product_code });
                        setSearchConsumable('');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      <span className="font-medium">{consumable.product_code}</span>
                      <span className="text-gray-500 ml-2">{consumable.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleAddCompatibility}
            disabled={loading || !newEntry.tool_code || !newEntry.consumable_code}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center"
          >
            <Plus className="mr-2" size={20} />
            Add Compatibility
          </button>
        </div>

        {/* Existing Compatibilities */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">
              Existing Compatibilities 
              <span className="text-sm font-normal text-gray-600 ml-2">
                (Showing {filteredCompatibilities.length} of {totalCount} total)
              </span>
            </h2>
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter by tool or consumable code..."
              className="w-full max-w-md px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tool Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consumable Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCompatibilities.map((compat) => (
                  <tr key={compat.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {compat.tool_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {compat.consumable_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => compat.id && handleDeleteCompatibility(compat.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}