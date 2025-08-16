"use client";

import { useState } from "react";

type Props = {
  companyId?: string | null;     // pass one of companyId or companyRef
  companyRef?: string | null;
  machineId: string;
  status?: "probable" | "confirmed" | "rejected";
  confidence?: number;           // 0..1
};

export default function MachineConfirmBar({
  companyId,
  companyRef,
  machineId,
  status = "probable",
  confidence,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"confirmed" | "rejected" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(correct: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/machines/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, companyRef, machineId, correct }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Request failed");
      setDone(json.status);
    } catch (e: any) {
      setErr(e.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  const showButtons = !done && status !== "confirmed";

  return (
    <div className="flex items-center gap-3 rounded-xl border px-3 py-2 shadow-sm bg-white">
      <div className="text-sm">
        <span className="font-medium">
          {status === "confirmed" || done === "confirmed" ? "Confirmed" : "Probable"}
        </span>
        {typeof confidence === "number" && (
          <span className="ml-2 text-gray-500">({Math.round(confidence * 100)}%)</span>
        )}
      </div>

      {showButtons && (
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => act(true)}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-sm bg-black text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving..." : "Confirm"}
          </button>
          <button
            onClick={() => act(false)}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-sm border hover:bg-gray-50 disabled:opacity-50"
          >
            Wrong model
          </button>
        </div>
      )}

      {done && (
        <span
          className={
            "ml-auto text-sm " + (done === "confirmed" ? "text-green-600" : "text-rose-600")
          }
        >
          {done === "confirmed" ? "Saved ✓" : "Marked wrong"}
        </span>
      )}

      {err && <span className="ml-auto text-sm text-rose-600">{err}</span>}
    </div>
  );
}
