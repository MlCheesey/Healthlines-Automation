"use client";

import { useState } from "react";

export default function SystemLogsPanel() {
  const [logs, setLogs] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function loadLogs() {
    setLoading(true);

    try {
      const res = await fetch("/api/system-logs");
      const data = await res.json();
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">System Logs</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Errors and system events.
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm"
        >
          {loading ? "Loading..." : "Load Logs"}
        </button>
      </div>

      {logs && (
        <div className="grid grid-cols-2 gap-4">
          <LogBox title="Errors" rows={logs.errors || []} />
          <LogBox title="Events" rows={logs.events || []} />
        </div>
      )}
    </section>
  );
}

function LogBox({ title, rows }: { title: string; rows: any[] }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 max-h-96 overflow-auto">
      <h3 className="text-white font-medium mb-3">{title}</h3>

      {rows.length === 0 && <p className="text-sm text-zinc-500">No logs.</p>}

      {rows.slice(0, 30).map((row, index) => (
        <div key={index} className="border-b border-zinc-800 py-2">
          <p className="text-xs text-zinc-500">{row.timestamp}</p>
          <p className="text-sm text-zinc-300">
            {row.type || row.source || "log"} — {row.message || row.error}
          </p>
        </div>
      ))}
    </div>
  );
}