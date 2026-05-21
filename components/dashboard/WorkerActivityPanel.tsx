"use client";

import { useEffect, useState } from "react";

export default function WorkerActivityPanel() {
  const [data, setData] =
    useState<any>(null);

  async function load() {
    const res = await fetch(
      "/api/operations-status"
    );

    const json =
      await res.json();

    setData(json.worker);
  }

  useEffect(() => {
    load();

    const interval =
      setInterval(load, 10000);

    return () =>
      clearInterval(interval);
  }, []);

  if (!data) {
    return null;
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-5">
        Worker Activity
      </h2>

      <div className="space-y-3">
        <Item
          label="Gmail Cycle"
          value={
            data.gmail_last_run
          }
        />

        <Item
          label="MRN Watcher"
          value={
            data.mrn_last_run
          }
        />

        <Item
          label="Invoice Cycle"
          value={
            data.invoice_last_run
          }
        />
      </div>
    </section>
  );
}

function Item({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <p className="text-zinc-500 text-sm">
        {label}
      </p>

      <p className="text-white text-sm mt-1">
        {value || "-"}
      </p>
    </div>
  );
}