"use client";

import { useEffect, useState } from "react";

export default function KPISection() {
  const [data, setData] = useState<any>(null);

  async function loadData() {
    try {
      const res = await fetch("/api/dashboard-overview");
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    }
  }

  useEffect(() => {
    loadData();

    const interval = setInterval(loadData, 15000);

    return () => clearInterval(interval);
  }, []);

  const counts = data?.counts || {};

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard title="Pending Actions" value={counts.pending_actions || 0} />
      <KpiCard title="Invoices" value={counts.invoice_tracker || 0} />
      <KpiCard title="MRNs" value={counts.mrn_tracker || 0} />
      <KpiCard title="AI Logs" value={counts.ai_logs || 0} />
    </section>
  );
}

function KpiCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <p className="text-sm text-zinc-500">{title}</p>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
    </div>
  );
}