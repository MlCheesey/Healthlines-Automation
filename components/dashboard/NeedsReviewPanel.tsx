"use client";

import { useEffect, useMemo, useState } from "react";

function badgeClass(status: string) {
  const text = String(status || "").toLowerCase();

  if (text.includes("error") || text.includes("overdue")) {
    return "bg-red-950 text-red-300 border-red-800";
  }

  if (text.includes("duplicate") || text.includes("blocked")) {
    return "bg-yellow-950 text-yellow-300 border-yellow-800";
  }

  if (text.includes("review") || text.includes("open")) {
    return "bg-orange-950 text-orange-300 border-orange-800";
  }

  if (text.includes("completed")) {
    return "bg-emerald-950 text-emerald-300 border-emerald-800";
  }

  return "bg-zinc-900 text-zinc-300 border-zinc-700";
}

function priorityClass(priority: string) {
  const text = String(priority || "").toLowerCase();

  if (text === "high") return "bg-red-950 text-red-300 border-red-800";
  if (text === "medium") return "bg-orange-950 text-orange-300 border-orange-800";

  return "bg-zinc-900 text-zinc-300 border-zinc-700";
}

function defaultVatPercent(row: any) {
  if (row.vat_percent !== "" && row.vat_percent !== undefined && row.vat_percent !== null) {
    return String(row.vat_percent);
  }

  return "";
}

function defaultRate(row: any) {
  if (row.rate !== "" && row.rate !== undefined && row.rate !== null) {
    return String(row.rate);
  }

  return "";
}

function ManualUpdateForm({ row, onUpdated }: { row: any; onUpdated: () => void }) {
  const [rate, setRate] = useState(defaultRate(row));
  const [vatPercent, setVatPercent] = useState(defaultVatPercent(row));
  const [resolveVat, setResolveVat] = useState(Boolean(row.needs_vat_update));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/manual-rate-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client: row.client,
          location: row.location,
          dn_number: row.dn_number,
          item_name: row.item_name,
          rate: rate === "" ? undefined : Number(rate),
          vat_percent: vatPercent === "" ? undefined : Number(vatPercent),
          resolve_vat_review: resolveVat,
          taxability: resolveVat ? "Manually confirmed" : "",
          tax_reason: resolveVat
            ? "Rate/VAT manually reviewed and confirmed from Needs Review dashboard."
            : "",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Manual update failed");
      }

      setMessage("Updated. Refreshing queue...");
      await onUpdated();
    } catch (error: any) {
      setMessage(error?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 border border-zinc-800 rounded-xl p-3 bg-zinc-900/60">
      <p className="text-xs text-zinc-400 mb-3">
        Manual invoice line update
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-xs text-zinc-500">
          Rate
          <input
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white"
            placeholder="Unit rate"
            type="number"
            step="0.0001"
          />
        </label>

        <label className="text-xs text-zinc-500">
          VAT %
          <input
            value={vatPercent}
            onChange={(event) => setVatPercent(event.target.value)}
            className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white"
            placeholder="Example: 15"
            type="number"
            step="0.01"
          />
        </label>

        <label className="text-xs text-zinc-500 flex items-end gap-2 pb-2">
          <input
            checked={resolveVat}
            onChange={(event) => setResolveVat(event.target.checked)}
            type="checkbox"
            className="h-4 w-4"
          />
          Resolve VAT review
        </label>

        <button
          onClick={save}
          disabled={saving}
          className="self-end bg-white text-black rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Fix"}
        </button>
      </div>

      {message && (
        <p className="text-xs text-zinc-400 mt-3">
          {message}
        </p>
      )}
    </div>
  );
}

export default function NeedsReviewPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  async function load() {
    try {
      const res = await fetch("/api/needs-review");
      const data = await res.json();
      setRows(data.rows || []);
      setSummary(data.summary || {});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 15000);

    return () => clearInterval(interval);
  }, []);

  const filteredRows = useMemo(() => {
    if (filter === "All") return rows;
    if (filter === "Invoice Blocks") {
      return rows.filter((row) => row.category === "Invoice Block");
    }
    if (filter === "Missing Rate") {
      return rows.filter((row) => row.needs_rate_update);
    }
    if (filter === "VAT Review") {
      return rows.filter((row) => row.needs_vat_update);
    }
    if (filter === "MRN") {
      return rows.filter((row) =>
        String(row.reason || row.status || row.mrn_status || "")
          .toLowerCase()
          .includes("mrn")
      );
    }
    return rows;
  }, [rows, filter]);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Needs Review</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Email review, blocked invoice lines, VAT review, missing rates, and MRN follow-ups.
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2">
          <p className="text-xs text-zinc-500">Open Review Items</p>
          <p className="text-2xl font-semibold text-white">{rows.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
          <p className="text-xs text-zinc-500">Invoice Blocks</p>
          <p className="text-xl font-semibold text-white">{summary.invoice_blocks || 0}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
          <p className="text-xs text-zinc-500">Missing Rate</p>
          <p className="text-xl font-semibold text-white">{summary.missing_rate || 0}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
          <p className="text-xs text-zinc-500">VAT Review</p>
          <p className="text-xl font-semibold text-white">{summary.vat_review || 0}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
          <p className="text-xs text-zinc-500">Workflow Reviews</p>
          <p className="text-xl font-semibold text-white">{summary.workflow_reviews || 0}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
          <p className="text-xs text-zinc-500">High Priority</p>
          <p className="text-xl font-semibold text-white">{summary.high_priority || 0}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {["All", "Invoice Blocks", "Missing Rate", "VAT Review", "MRN"].map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`text-xs border rounded-full px-3 py-1 ${
              filter === item
                ? "bg-white text-black border-white"
                : "bg-zinc-950 text-zinc-400 border-zinc-800"
            }`}
          >
            {item}
          </button>
        ))}

        <button
          onClick={load}
          className="text-xs border rounded-full px-3 py-1 bg-zinc-950 text-zinc-400 border-zinc-800"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading review queue...</p>
      ) : filteredRows.length === 0 ? (
        <p className="text-sm text-emerald-400">No review items found for this filter.</p>
      ) : (
        <div className="space-y-3 max-h-[650px] overflow-auto">
          {filteredRows.map((row, index) => (
            <div
              key={`${row.id || row.source_email_id || index}-${index}`}
              className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`text-xs border px-2 py-1 rounded-full ${badgeClass(
                    row.status
                  )}`}
                >
                  {row.status || "Needs Review"}
                </span>

                <span
                  className={`text-xs border px-2 py-1 rounded-full ${priorityClass(
                    row.priority
                  )}`}
                >
                  {row.priority || "Medium"}
                </span>

                <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-1 rounded-full">
                  {row.source || "Workflow"}
                </span>

                <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-1 rounded-full">
                  {row.category || row.email_type || row.issue_type || "Other"}
                </span>

                {row.confidence !== "" && row.confidence !== undefined && (
                  <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-1 rounded-full">
                    Confidence: {row.confidence}
                  </span>
                )}
              </div>

              <p className="text-white text-sm font-medium">
                {row.subject || row.pending_action || "Untitled email/action"}
              </p>

              <p className="text-zinc-500 text-xs mt-1">
                From: {row.from || "-"} · Client: {row.client || "-"} · Location:{" "}
                {row.location || "-"}
              </p>

              <p className="text-zinc-400 text-sm mt-3">
                {row.reason ||
                  row.pending_action ||
                  row.recommended_action ||
                  row.notes ||
                  "Review manually."}
              </p>

              {(row.po_number || row.dn_number || row.mrn_number) && (
                <p className="text-zinc-600 text-xs mt-2">
                  PO: {row.po_number || "-"} · DN: {row.dn_number || "-"} · MRN:{" "}
                  {row.mrn_number || "-"}
                </p>
              )}

              {(row.item_name || row.qty || row.rate || row.vat_percent) && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2 text-xs text-zinc-400">
                  <div>
                    <span className="text-zinc-600">Item</span>
                    <div>{row.item_name || "-"}</div>
                  </div>
                  <div>
                    <span className="text-zinc-600">Qty</span>
                    <div>{row.qty || "-"}</div>
                  </div>
                  <div>
                    <span className="text-zinc-600">Rate</span>
                    <div>{row.rate || "-"}</div>
                  </div>
                  <div>
                    <span className="text-zinc-600">VAT %</span>
                    <div>{row.vat_percent || "-"}</div>
                  </div>
                  <div>
                    <span className="text-zinc-600">VAT Amount</span>
                    <div>{row.vat_amount || "-"}</div>
                  </div>
                </div>
              )}

              {row.tax_reason && (
                <p className="text-zinc-600 text-xs mt-2">
                  Tax reason: {row.tax_reason}
                </p>
              )}

              {row.can_manual_update && (
                <ManualUpdateForm row={row} onUpdated={load} />
              )}

              <p className="text-zinc-700 text-xs mt-3">
                {row.created_at || "-"}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}