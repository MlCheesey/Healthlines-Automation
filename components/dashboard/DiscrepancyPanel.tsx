"use client";

import { useState } from "react";

export default function DiscrepancyPanel() {
  const [form, setForm] = useState({
    po_qty: "",
    delivered_qty: "",
    invoiced_qty: "",
  });

  const [result, setResult] = useState<any>(null);

  function update(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function check() {
    const res = await fetch("/api/discrepancy-check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        po_qty: Number(form.po_qty || 0),
        delivered_qty: Number(form.delivered_qty || 0),
        invoiced_qty: Number(form.invoiced_qty || 0),
      }),
    });

    const data = await res.json();
    setResult(data.result);
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-2">
        Discrepancy Checker
      </h2>

      <p className="text-sm text-zinc-500 mb-5">
        Checks PO vs delivery vs invoice quantity mismatch.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <input
          value={form.po_qty}
          onChange={(e) => update("po_qty", e.target.value)}
          placeholder="PO Qty"
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white"
        />

        <input
          value={form.delivered_qty}
          onChange={(e) => update("delivered_qty", e.target.value)}
          placeholder="Delivered Qty"
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white"
        />

        <input
          value={form.invoiced_qty}
          onChange={(e) => update("invoiced_qty", e.target.value)}
          placeholder="Invoiced Qty"
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white"
        />
      </div>

      <button
        onClick={check}
        className="mt-4 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-sm"
      >
        Check
      </button>

      {result && (
        <div
          className={`mt-5 rounded-xl border p-4 ${
            result.has_issue
              ? "bg-red-950/20 border-red-900"
              : "bg-emerald-950/20 border-emerald-900"
          }`}
        >
          <p className="text-white text-sm">
            {result.has_issue ? "Issue Found" : "No Issue"}
          </p>

          {(result.issues || []).map((issue: string, index: number) => (
            <p key={index} className="text-red-300 text-sm mt-2">
              {issue}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}