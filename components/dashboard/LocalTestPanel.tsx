"use client";

import { useState } from "react";

export default function LocalTestPanel() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runTest() {
    setLoading(true);

    try {
      const res = await fetch("/api/local-workflow-test", {
        method: "POST",
      });

      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  async function cleanup() {
    setLoading(true);

    try {
      const res = await fetch("/api/local-cleanup-test-data", {
        method: "POST",
      });

      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-2">
        Local Workflow Test
      </h2>

      <p className="text-sm text-zinc-500 mb-5">
        Creates/removes local test rows for queue, notifications, retry, attachment and PDF registries.
      </p>

      <div className="flex gap-3">
        <button
          onClick={runTest}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-sm"
        >
          Run Local Test
        </button>

        <button
          onClick={cleanup}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm"
        >
          Clean Test Data
        </button>
      </div>

      {result && (
        <pre className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </section>
  );
}