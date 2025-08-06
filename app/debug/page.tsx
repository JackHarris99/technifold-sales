'use client';

import { useState, useEffect } from 'react';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/debug')
      .then(res => res.json())
      .then(data => {
        setDebugInfo(data);
        setLoading(false);
      })
      .catch(err => {
        setDebugInfo({ error: err.message });
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading debug info...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Information</h1>
      
      <div className="space-y-6">
        {/* Connection Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Connection Status</h2>
          <div className={`inline-block px-3 py-1 rounded text-white ${
            debugInfo?.connection?.status === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {debugInfo?.connection?.status || 'Unknown'}
          </div>
          {debugInfo?.connection?.error && (
            <div className="mt-3 p-3 bg-red-100 text-red-700 rounded">
              Error: {debugInfo.connection.error}
            </div>
          )}
        </div>

        {/* Database Counts */}
        {debugInfo?.connection?.data && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Database Counts</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt>Manufacturer Details:</dt>
                <dd className="font-mono">{debugInfo.connection.data.manufacturer_details_count || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Products:</dt>
                <dd className="font-mono">{debugInfo.connection.data.products_count || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Customers:</dt>
                <dd className="font-mono">{debugInfo.connection.data.customers_count || 0}</dd>
              </div>
            </dl>
          </div>
        )}

        {/* Environment Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Environment</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt>Node Environment:</dt>
              <dd className="font-mono">{debugInfo?.environment || 'Not set'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Vercel Environment:</dt>
              <dd className="font-mono">{debugInfo?.vercel?.env || 'Not on Vercel'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Supabase URL Set:</dt>
              <dd className="font-mono">{debugInfo?.supabase?.urlSet ? '✅ Yes' : '❌ No'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Supabase Anon Key Set:</dt>
              <dd className="font-mono">{debugInfo?.supabase?.anonKeySet ? '✅ Yes' : '❌ No'}</dd>
            </div>
          </dl>
        </div>

        {/* Raw JSON */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Raw Debug Data</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-100 rounded">
        <h3 className="font-semibold mb-2">What to check:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>If Connection Status is ❌ but env vars are ✅, Supabase might be down/paused</li>
          <li>If env vars are ❌, check Vercel dashboard environment variables</li>
          <li>Expected counts: Manufacturer Details: 248, Products: 1644, Customers: 374</li>
          <li>If counts are 0 but connection is ✅, database might be empty</li>
        </ol>
      </div>
    </div>
  );
}