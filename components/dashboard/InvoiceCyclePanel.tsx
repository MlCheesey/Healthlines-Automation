"use client";

import { useState } from "react";

export default function InvoiceCyclePanel() {
  const defaultClient = process.env.NEXT_PUBLIC_DEFAULT_CLIENT || "";
  const [client, setClient] = useState(defaultClient);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<Record<number, string>>({});
  const [approvalLoading, setApprovalLoading] = useState(false);

  async function generatePackage() {
    if (!client.trim()) {
      alert("Enter client name first");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/invoice-package", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ client }),
      });

      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  async function updateRate(row: any, index: number) {
    const rate = rates[index];

    if (!rate) {
      alert("Enter unit rate first");
      return;
    }

    const res = await fetch("/api/manual-rate-update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client,
        location: row.location,
        dn_number: row.dn_number,
        item_name: row.item_name,
        rate,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Rate update failed");
      return;
    }

    alert("Rate updated. Regenerate invoice package.");
  }

  async function approvePackage(decision: "Approved" | "Rejected") {
    if (!result?.package_id) {
      alert("No invoice package generated yet.");
      return;
    }

    setApprovalLoading(true);

    try {
      const res = await fetch("/api/invoice-approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client,
          package_id: result.package_id,
          decision,
          remarks: "",
          approved_by: "dashboard_user",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Invoice approval failed");
        return;
      }

      alert(`Invoice package ${decision}`);
    } finally {
      setApprovalLoading(false);
    }
  }

  const counts = result?.counts || {};
  const blocked = result?.missing_rate_count > 0;

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Invoice Cycle</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Review invoice package status. Worker prepares packages automatically; this button is for review/regeneration only.
          </p>
        </div>

        <div className="flex gap-3">
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="client name"
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white"
          />

          <button
            onClick={generatePackage}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm"
          >
            {loading ? "Loading..." : "Review Package"}
          </button>
        </div>
      </div>

      {!result && (
        <p className="text-sm text-zinc-500">
          No invoice package loaded yet.
        </p>
      )}

      {result && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <StatCard
              title="Status"
              value={result.success ? "Review Ready" : "Needs Attention"}
            />
            <StatCard title="PDFs" value={result.pdf_count || 0} />
            <StatCard title="DN Groups" value={counts.total_invoice_groups || 0} />
            <StatCard title="MRN Received" value={counts.mrn_received || 0} />
            <StatCard title="MRN Pending" value={counts.mrn_pending || 0} />
            <StatCard title="MRN Overdue" value={counts.mrn_overdue || 0} />
          </div>

          {blocked && (
            <div className="bg-red-950/30 border border-red-900 rounded-xl p-4">
              <h3 className="text-red-300 font-medium">
                Missing Unit Rates
              </h3>
              <p className="text-sm text-red-200/80 mt-1">
                These DN lines are excluded from invoice generation until the unit rate is filled.
              </p>

              <div className="mt-4 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-zinc-400 border-b border-red-900">
                    <tr>
                      <th className="text-left py-2">Location</th>
                      <th className="text-left py-2">DN</th>
                      <th className="text-left py-2">Item</th>
                      <th className="text-left py-2">Qty</th>
                      <th className="text-left py-2">Unit Rate</th>
                      <th className="text-left py-2">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(result.missing_rate_rows || []).map(
                      (row: any, index: number) => (
                        <tr key={index} className="border-b border-red-950">
                          <td className="py-2">{row.location || "-"}</td>
                          <td className="py-2">{row.dn_number || "-"}</td>
                          <td className="py-2">{row.item_name || "-"}</td>
                          <td className="py-2">
                            {row.qty || row.delivered_qty || "-"}
                          </td>
                          <td className="py-2">
                            <input
                              value={rates[index] || ""}
                              onChange={(e) =>
                                setRates((prev) => ({
                                  ...prev,
                                  [index]: e.target.value,
                                }))
                              }
                              placeholder="Rate"
                              className="w-24 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-white"
                            />
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => updateRate(row, index)}
                              className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-xs"
                            >
                              Save Rate
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.success && (
            <>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">
                  Invoice Package Approval
                </h3>

                <p className="text-sm text-zinc-500 mb-4">
                  Package ID: {result.package_id || "-"}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => approvePackage("Approved")}
                    disabled={approvalLoading}
                    className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-sm"
                  >
                    Approve Package
                  </button>

                  <button
                    onClick={() => approvePackage("Rejected")}
                    disabled={approvalLoading}
                    className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-sm"
                  >
                    Reject Package
                  </button>
                </div>
              </div>

              {(counts.mrn_pending > 0 || counts.mrn_overdue > 0) && (
                <div className="bg-yellow-950/30 border border-yellow-800 rounded-xl p-4">
                  <h3 className="text-yellow-300 font-medium">
                    MRN Pending Invoices Included
                  </h3>
                  <p className="text-sm text-yellow-100/80 mt-1">
                    Some invoices will show “MRN Pending” in Other Reference(s). This does not block invoice creation.
                  </p>
                </div>
              )}

              {(result.blocked_invoice_groups || []).length > 0 && (
                <div className="bg-orange-950/30 border border-orange-800 rounded-xl p-4">
                  <h3 className="text-orange-300 font-medium">
                    Excluded DN Groups
                  </h3>
                  <p className="text-sm text-orange-100/80 mt-1">
                    Some delivery notes were excluded because unit rates are missing.
                  </p>
                </div>
              )}

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
  <h3 className="text-white font-medium mb-3">
    Generated Files
  </h3>

  <div className="space-y-3 text-sm text-zinc-300">
    <div className="flex items-center justify-between gap-4">
      <div>
        <span className="text-zinc-500">Invoice Summary Excel</span>
      </div>

      {result.excelPath ? (
        <a
          href={`/api/file-preview?path=${encodeURIComponent(
            result.excelPath
          )}`}
          className="text-blue-400 hover:underline"
          target="_blank"
        >
          Download Excel
        </a>
      ) : (
        <span>-</span>
      )}
    </div>

    {(result.pdfs || []).map((pdf: any, index: number) => (
      <div
        key={index}
        className="flex items-center justify-between gap-4 border-t border-zinc-800 pt-3"
      >
        <div>
          <p className="text-white">
            {pdf.invoice_number || "-"}
          </p>

          <p className="text-xs text-zinc-500 mt-1">
            DN: {pdf.dn_number || "-"}
          </p>

          <p className="text-xs text-zinc-500">
            MRN Status: {pdf.mrn_status || "Pending"}
          </p>
        </div>

        {pdf.pdfPath ? (
          <a
            href={`/api/file-preview?path=${encodeURIComponent(
              pdf.pdfPath
            )}`}
            className="text-blue-400 hover:underline whitespace-nowrap"
            target="_blank"
          >
            Download PDF
          </a>
        ) : (
          <span>-</span>
        )}
      </div>
    ))}
  </div>
</div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-white font-medium mb-2">
                  Draft Email Preview
                </h3>
                <p className="text-sm text-zinc-500">
                  Subject: {result.draft_email?.subject || "-"}
                </p>
                <pre className="text-sm text-zinc-300 mt-3 whitespace-pre-wrap">
                  {result.draft_email?.body || "-"}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function StatCard({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <p className="text-zinc-500 text-sm">{title}</p>
      <p className="text-white text-xl font-semibold mt-2">{value}</p>
    </div>
  );
}