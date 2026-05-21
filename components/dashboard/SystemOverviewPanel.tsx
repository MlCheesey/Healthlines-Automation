"use client";

import { useEffect, useState } from "react";
import WorkflowTable from "./WorkflowTable";

export default function SystemOverviewPanel() {
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/dashboard-overview");
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const counts = data?.counts || {};
  const summary = data?.summary || {};

  return (
    <section className="space-y-5">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">System Overview</h2>
            <p className="text-sm text-zinc-500 mt-1">Live operational workflow summary</p>
          </div>

          <button onClick={load} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm">
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card title="Pending Actions" value={counts.pending_actions || 0} />
          <Card title="Invoices" value={counts.invoice_tracker || 0} />
          <Card title="MRNs" value={counts.mrn_tracker || 0} />
          <Card title="Delivery Tasks" value={counts.delivery_tasks || 0} />
          <Card title="Approvals" value={counts.approvals || 0} />
          <Card title="AI Logs" value={counts.ai_logs || 0} />
        </div>
      </div>

      <WorkflowTable title="Pending Actions" rows={(summary.pending_actions || []).slice(0, 8)} />
      <WorkflowTable title="MRN Tracker" rows={(summary.mrn_tracker || []).slice(0, 8)} />
      <WorkflowTable title="Invoice Tracker" rows={(summary.invoice_tracker || []).slice(0, 8)} />
    </section>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <div className="text-zinc-500 text-sm">{title}</div>
      <div className="text-2xl font-bold text-white mt-2">{value}</div>
    </div>
  );
}