"use client";

import { useState } from "react";

export default function WorkflowSimulationPanel() {
  const [rows, setRows] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(false);

  async function simulate() {
    setLoading(true);

    const res = await fetch(
      "/api/workflow-simulation",
      {
        method: "POST",
      }
    );

    const data =
      await res.json();

    setRows(data.workflow || []);

    setLoading(false);
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Workflow Simulation
          </h2>

          <p className="text-sm text-zinc-500 mt-1">
            Simulates full local workflow lifecycle.
          </p>
        </div>

        <button
          onClick={simulate}
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-sm"
        >
          Run Simulation
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white"
          >
            {index + 1}. {row}
          </div>
        ))}
      </div>
    </section>
  );
}