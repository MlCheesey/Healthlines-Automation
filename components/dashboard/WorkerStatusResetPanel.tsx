"use client";

import { useState } from "react";

export default function WorkerStatusResetPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function resetStatus() {
    const confirmed = window.confirm(
      "Reset stale worker status display? This does not restart PM2 and does not process Gmail/Tally/invoices."
    );

    if (!confirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/worker-status-reset", {
        method: "POST",
      });

      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white">
        Worker Status Reset
      </h2>

      <p className="text-sm text-zinc-500 mt-1">
        Use this only when the dashboard is showing an old stale worker status from a previous local run.
      </p>

      <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
        <p className="text-sm text-zinc-400">
          This does not restart the worker, does not process Gmail, does not call Tally, and does not touch invoices.
          It only archives the old status file and writes a clean reset status.
        </p>

        <button
          onClick={resetStatus}
          disabled={loading}
          className="mt-4 bg-white text-black rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Resetting..." : "Reset Stale Worker Status"}
        </button>
      </div>

      {result && (
        <pre className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-emerald-300 whitespace-pre-wrap max-h-[260px] overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </section>
  );
}