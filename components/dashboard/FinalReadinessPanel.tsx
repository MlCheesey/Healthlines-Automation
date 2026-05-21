"use client";

import { useEffect, useState } from "react";

export default function FinalReadinessPanel() {
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/final-readiness");
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    load();
  }, []);

  const checks = data?.checks || {};

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Final Local Readiness
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Confirms local workflow pieces before OAuth/Tally/hosting.
          </p>
        </div>

        <button
          onClick={load}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
        >
          Refresh
        </button>
      </div>

      {!data ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : (
        <div className="space-y-4">
          <div
            className={`rounded-xl border p-4 ${
              data.status === "local_workflow_ready"
                ? "bg-emerald-950/20 border-emerald-900"
                : "bg-red-950/20 border-red-900"
            }`}
          >
            <p className="text-white font-medium">{data.status}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {Object.entries(checks).map(([key, value]) => (
              <div
                key={key}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex justify-between"
              >
                <span className="text-sm text-zinc-400">{key}</span>
                <span
                  className={`text-sm ${
                    value ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {value ? "OK" : "Missing"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}