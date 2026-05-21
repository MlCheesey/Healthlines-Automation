"use client";

import { useEffect, useState } from "react";

export default function ProductionReadinessPanel() {
  const [data, setData] =
    useState<any>(null);

  async function load() {
    const res = await fetch(
      "/api/production-readiness"
    );

    const json =
      await res.json();

    setData(json);
  }

  useEffect(() => {
    load();
  }, []);

  if (!data) return null;

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-5">
        Production Readiness
      </h2>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <p className="text-emerald-400 text-sm mb-3">
            Completed
          </p>

          <div className="space-y-2">
            {data.completed.map(
              (item: string) => (
                <div
                  key={item}
                  className="bg-emerald-950/20 border border-emerald-900 rounded-xl p-3 text-sm text-white"
                >
                  {item}
                </div>
              )
            )}
          </div>
        </div>

        <div>
          <p className="text-yellow-400 text-sm mb-3">
            Remaining
          </p>

          <div className="space-y-2">
            {data.remaining.map(
              (item: string) => (
                <div
                  key={item}
                  className="bg-yellow-950/20 border border-yellow-900 rounded-xl p-3 text-sm text-white"
                >
                  {item}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}