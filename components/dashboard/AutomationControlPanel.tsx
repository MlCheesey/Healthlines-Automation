"use client";

import { useEffect, useState } from "react";

export default function AutomationControlPanel() {
  const [status, setStatus] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/automation-status");
    const data = await res.json();
    setStatus(data);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const running = status?.worker_running;

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Automation Status
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Background worker status. Automation should run without dashboard clicks.
          </p>
        </div>

        <button
          onClick={load}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
        >
          Refresh
        </button>
      </div>

      {!status ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : (
        <div className="space-y-4">
          <div
            className={`inline-flex px-3 py-1 rounded-lg border text-sm ${
              running
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                : "bg-red-950/40 border-red-800 text-red-300"
            }`}
          >
            {running ? "Worker Running" : "Worker Not Running"}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <StatusCard
              title="Gmail Last Run"
              value={status?.status?.gmail_cycle_last_run_at || "-"}
            />
            <StatusCard
              title="MRN Last Run"
              value={status?.status?.mrn_watcher_last_run_at || "-"}
            />
            <StatusCard
              title="Invoice Last Run"
              value={status?.status?.invoice_cycle_last_run_at || "-"}
            />
          </div>

          {!running && (
            <p className="text-sm text-zinc-500">
              Start automation in a separate terminal using: npm run worker
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function StatusCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <p className="text-zinc-500">{title}</p>
      <p className="text-zinc-300 mt-2 break-all">{value}</p>
    </div>
  );
}