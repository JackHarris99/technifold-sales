'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

type Row = {
  link_id: string;
  customer_code: string;
  company_name: string | null;

  // machine guess
  manufacturer: string;
  model: string;

  // match meta
  status: 'probable' | 'confirmed' | 'rejected';
  confidence: number; // 0..1
  evidence_count: number;
  sample_tool_code?: string | null;
  updated_at: string;

  // identifiers (may be missing)
  company_id?: string | null;
  company_ref?: string | null;
  machine_id?: string | null;
};

type ApiResp = {
  count: number;
  rows: Row[];
};

export default function AdminMachinesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'probable' | 'confirmed' | 'rejected'>('all');
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status !== 'all') params.set('status', status);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/machines-list?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Fetch failed ${res.status}`);
        }
        const data: ApiResp = await res.json();
        setRows(data.rows || []);
        setCount(data.count || 0);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      }
    });
  }, [q, status]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => load();

  const filteredLabel = useMemo(() => {
    const s = status === 'all' ? 'all statuses' : status;
    return `${count.toLocaleString()} matches • ${s}`;
  }, [count, status]);

  const updateStatus = async (
    r: Row,
    action: 'confirm' | 'reject'
  ) => {
    // only act if identifiers are present
    if (!r.machine_id || (!r.company_id && !r.company_ref)) return;

    const body = {
      companyId: r.company_id ?? null,
      companyRef: r.company_ref ?? null,
      machineId: r.machine_id,
      correct: action === 'confirm',
    };

    try {
      const res = await fetch('/api/machines/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Update failed (${res.status})`);
      }
      // optimistic update
      setRows(prev =>
        prev.map(x =>
          x.link_id === r.link_id
            ? {
                ...x,
                status: action === 'confirm' ? 'confirmed' : 'rejected',
                confidence: action === 'confirm' ? 1 : 0,
                updated_at: new Date().toISOString(),
              }
            : x
        )
      );
    } catch (e: any) {
      alert(e?.message || 'Failed to update');
    }
  };

  const canAct = (r: Row) => Boolean(r.machine_id && (r.company_id || r.company_ref));

  return (
    <div className="p-4 text-sm text-gray-100">
      <h1 className="text-2xl font-semibold mb-4">Machine Matches</h1>

      <div className="flex flex-wrap gap-2 items-center mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company, code, OEM, model, tool code…"
          className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 w-[320px] outline-none focus:border-neutral-400"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
        >
          <option value="all">All statuses</option>
          <option value="probable">Probable</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2 hover:bg-neutral-700 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>

        <span className="ml-auto text-xs text-neutral-400">{filteredLabel}</span>
      </div>

      {error && (
        <div className="mb-3 text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded border border-neutral-800">
        <table className="min-w-full bg-neutral-950">
          <thead>
            <tr className="bg-neutral-900/60 text-neutral-300">
              <th className="text-left font-medium px-3 py-2">Customer</th>
              <th className="text-left font-medium px-3 py-2">Company</th>
              <th className="text-left font-medium px-3 py-2">Machine (with evidence)</th>
              <th className="text-left font-medium px-3 py-2">Status</th>
              <th className="text-left font-medium px-3 py-2">Confidence</th>
              <th className="text-left font-medium px-3 py-2">Evidence</th>
              <th className="text-left font-medium px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const missing = !canAct(r);
              return (
                <tr key={r.link_id} className="border-t border-neutral-900 hover:bg-neutral-900/40">
                  <td className="px-3 py-2 whitespace-nowrap">{r.customer_code}</td>
                  <td className="px-3 py-2">{r.company_name ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className="whitespace-nowrap">{r.manufacturer} {r.model}</span>
                    {r.sample_tool_code && (
                      <span className="ml-2 text-xs text-neutral-400">
                        [tool: {r.sample_tool_code}]
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={[
                        'px-2 py-0.5 rounded text-xs border',
                        r.status === 'confirmed' && 'bg-emerald-900/40 border-emerald-600 text-emerald-200',
                        r.status === 'rejected' && 'bg-red-900/30 border-red-600 text-red-200',
                        r.status === 'probable' && 'bg-amber-900/30 border-amber-600 text-amber-200',
                      ].filter(Boolean).join(' ')}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{(r.confidence * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2">{r.evidence_count}</td>
                  <td className="px-3 py-2">
                    {missing ? (
                      <span className="text-xs text-amber-300 bg-amber-900/30 border border-amber-700 px-2 py-1 rounded">
                        IDs missing; update API
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(r, 'confirm')}
                          className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => updateStatus(r, 'reject')}
                          className="bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-neutral-400">
                  {loading ? 'Loading…' : 'No matches'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

