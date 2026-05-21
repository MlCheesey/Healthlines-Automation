"use client";

import { useEffect, useState } from "react";

export default function ParserHealthPanel() {
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/parser-health");
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">
        Parser Health
      </h2>

      {!data ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {Object.entries(data.parsers || {}).map(([key, value]) => (
            <div
              key={key}
              className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex justify-between"
            >
              <span className="text-sm text-zinc-400">{key}</span>
              <span className="text-sm text-emerald-400">
                {value ? "OK" : "Missing"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}