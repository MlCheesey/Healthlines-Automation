"use client";

import { useEffect, useState } from "react";

export default function InvoiceDraftEditorPanel() {
  const defaultClient = process.env.NEXT_PUBLIC_DEFAULT_CLIENT || "";
  const [client, setClient] = useState(defaultClient);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [editableItems, setEditableItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [lastPdf, setLastPdf] = useState("");

  async function loadDrafts() {
    const res = await fetch(
      `/api/invoice-draft-data?client=${encodeURIComponent(client)}`
    );
    const data = await res.json();

    setDrafts(data.drafts || []);
  }

  function selectDraft(draft: any) {
    setSelected(draft);
    setLastPdf("");

    setEditableItems(
      (draft.items || []).map((item: any) => ({
        item_name: item.item_name || "",
        qty: item.qty ?? "",
        unit: item.unit ?? "",
        rate: item.rate ?? "",
        vat_percent: item.vat_percent ?? "",
        taxability: item.taxability ?? "",
        tax_reason: item.tax_reason ?? "",
      }))
    );
  }

  function updateItem(index: number, field: string, value: string) {
    setEditableItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  async function saveDraft() {
    if (!selected) return;

    setSaving(true);

    try {
      const res = await fetch("/api/invoice-draft-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client,
          location: selected.location,
          dn_number: selected.dn_number,
          items: editableItems.map((item) => ({
            ...item,
            qty: Number(item.qty || 0),
            rate: item.rate === "" ? "" : Number(item.rate),
            vat_percent:
              item.vat_percent === "" ? "" : Number(item.vat_percent),
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Save failed");
        return;
      }

      alert("Invoice draft saved.");
      await loadDrafts();
    } finally {
      setSaving(false);
    }
  }

  async function regeneratePdf() {
    if (!selected) return;

    setRegenerating(true);

    try {
      const res = await fetch("/api/regenerate-invoice-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client,
          location: selected.location,
          dn_number: selected.dn_number,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "PDF regeneration failed");
        return;
      }

      setLastPdf(data.pdfPath || "");
      alert("PDF regenerated successfully.");
    } finally {
      setRegenerating(false);
    }
  }

  useEffect(() => {
  if (client) loadDrafts();

  const interval = setInterval(() => {
    if (client) loadDrafts();
  }, 20000);

  return () => clearInterval(interval);
}, [client]);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Invoice Draft Editor
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Edit VAT, rate, unit, qty and tax fields before regenerating PDF.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white"
            placeholder="client"
          />

          <button
            onClick={loadDrafts}
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            Load
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 max-h-96 overflow-auto">
          {drafts.length === 0 ? (
            <p className="text-sm text-zinc-500">No invoice drafts found.</p>
          ) : (
            drafts.map((draft, index) => (
              <button
                key={index}
                onClick={() => selectDraft(draft)}
                className="w-full text-left border-b border-zinc-800 py-3 hover:bg-zinc-900 px-2 rounded-lg"
              >
                <p className="text-white text-sm">
                  {draft.invoice_number || "-"}
                </p>
                <p className="text-xs text-zinc-500">
                  DN: {draft.dn_number || "-"} · {draft.location || "-"}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="md:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
          {!selected ? (
            <p className="text-sm text-zinc-500">
              Select an invoice draft to edit.
            </p>
          ) : (
            <div>
              <div className="flex justify-between gap-4 items-start mb-4">
                <div>
                  <h3 className="text-white font-medium">
                    {selected.invoice_number}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    DN: {selected.dn_number || "-"} · PO:{" "}
                    {selected.po_number || "-"} · MRN:{" "}
                    {selected.mrn_number || "MRN Pending"}
                  </p>
                  {lastPdf && (
                    <a
                      href={`/api/file-preview?path=${encodeURIComponent(
                        lastPdf
                      )}`}
                      target="_blank"
                      className="inline-block mt-2 text-xs text-blue-400 hover:underline"
                    >
                      Download regenerated PDF
                    </a>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveDraft}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-sm"
                  >
                    {saving ? "Saving..." : "Save Draft"}
                  </button>

                  <button
                    onClick={regeneratePdf}
                    disabled={regenerating}
                    className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-sm"
                  >
                    {regenerating ? "Regenerating..." : "Regenerate PDF"}
                  </button>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-zinc-500 border-b border-zinc-800">
                    <tr>
                      <th className="text-left py-2">Item</th>
                      <th className="text-left py-2">Qty</th>
                      <th className="text-left py-2">Unit</th>
                      <th className="text-left py-2">Rate</th>
                      <th className="text-left py-2">VAT %</th>
                      <th className="text-left py-2">Taxability</th>
                      <th className="text-left py-2">Tax Reason</th>
                    </tr>
                  </thead>

                  <tbody>
                    {editableItems.map((item, index) => (
                      <tr key={index} className="border-b border-zinc-800">
                        <td className="py-2 min-w-56 text-zinc-300">
                          {item.item_name || "-"}
                        </td>

                        <td className="py-2">
                          <input
                            value={item.qty}
                            onChange={(e) =>
                              updateItem(index, "qty", e.target.value)
                            }
                            className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white"
                          />
                        </td>

                        <td className="py-2">
                          <input
                            value={item.unit}
                            onChange={(e) =>
                              updateItem(index, "unit", e.target.value)
                            }
                            className="w-24 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white"
                          />
                        </td>

                        <td className="py-2">
                          <input
                            value={item.rate}
                            onChange={(e) =>
                              updateItem(index, "rate", e.target.value)
                            }
                            className="w-24 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white"
                          />
                        </td>

                        <td className="py-2">
                          <input
                            value={item.vat_percent}
                            onChange={(e) =>
                              updateItem(index, "vat_percent", e.target.value)
                            }
                            className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white"
                          />
                        </td>

                        <td className="py-2">
                          <input
                            value={item.taxability}
                            onChange={(e) =>
                              updateItem(index, "taxability", e.target.value)
                            }
                            className="w-36 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white"
                          />
                        </td>

                        <td className="py-2">
                          <input
                            value={item.tax_reason}
                            onChange={(e) =>
                              updateItem(index, "tax_reason", e.target.value)
                            }
                            className="w-48 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-zinc-500 mt-4">
                Save changes first, then regenerate the PDF.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}