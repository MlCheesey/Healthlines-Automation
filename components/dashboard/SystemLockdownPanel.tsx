"use client";

import { useEffect, useState } from "react";

export default function SystemLockdownPanel() {
  const [data, setData] =
    useState<any>(null);

  async function load() {
    const res = await fetch(
      "/api/system-lockdown-check"
    );

    const json =
      await res.json();

    setData(json);
  }

  useEffect(() => {
    load();
  }, []);

  const checks = data?.checks || [];

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            System Lockdown Check
          </h2>

          <p className="text-sm text-zinc-500 mt-1">
            Verifies protected workflow structure before production.
          </p>
        </div>

        <button
          onClick={load}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {checks.map((row: any) => (
          <div
            key={row.item}
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex justify-between"
          >
            <span className="text-zinc-400 text-sm">
              {row.item}
            </span>

            <span
              className={`text-sm ${
                row.exists
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {row.exists ? "OK" : "Missing"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}