"use client";

import { useEffect, useState } from "react";

export default function LearningMemoryPanel() {
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/learning-memory-summary");
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            AI Learning Memory
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Staff correction memory for future prompt improvement.
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
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-sm">Total Rules</p>
            <p className="text-white text-2xl font-semibold mt-1">
              {data.total || 0}
            </p>
          </div>

          <div className="space-y-2">
            {(data.latest || []).map((row: any) => (
              <div
                key={row.id}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"
              >
                <p className="text-white text-sm">{row.category}</p>
                <p className="text-zinc-400 text-sm mt-1">{row.rule}</p>
                <p className="text-zinc-600 text-xs mt-2">{row.created_at}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}