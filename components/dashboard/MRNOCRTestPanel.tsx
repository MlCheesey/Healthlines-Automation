"use client";

import { useState } from "react";

function badgeClass(value: string) {
  const text = String(value || "").toLowerCase();

  if (text.includes("required") || text.includes("below") || text.includes("not")) {
    return "bg-orange-950 text-orange-300 border-orange-800";
  }

  if (text.includes("usable")) {
    return "bg-emerald-950 text-emerald-300 border-emerald-800";
  }

  return "bg-zinc-950 text-zinc-300 border-zinc-800";
}

function ValueList({ title, values }: { title: string; values: any[] }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500">{title}</p>
      {values?.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((value, index) => (
            <span
              key={`${title}-${value}-${index}`}
              className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-full px-2 py-1"
            >
              {String(value)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-600 mt-2">None found</p>
      )}
    </div>
  );
}

export default function MRNOCRTestPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runTest() {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/mrn-ocr-test", {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  const structured = result?.structured || {};

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">MRN OCR Test</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Upload a scanned MRN/photo/PDF to test extraction of MRN, DN, PO, date,
            location, and possible items.
          </p>
        </div>

        {result?.success && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2">
            <p className="text-xs text-zinc-500">Confidence</p>
            <p className="text-2xl font-semibold text-white">
              {structured.confidence ?? 0}
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 items-center">
        <input
          type="file"
          accept="image/*,.png,.jpg,.jpeg,.webp,.tif,.tiff,.pdf,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-sm text-zinc-300"
        />

        <button
          type="button"
          onClick={runTest}
          disabled={!file || loading}
          className="px-4 py-2 rounded-lg bg-blue-700 text-white disabled:opacity-50"
        >
          {loading ? "Reading..." : "Run OCR"}
        </button>

        {file && (
          <span className="text-xs text-zinc-500">
            Selected: {file.name}
          </span>
        )}
      </div>

      {result && !result.success && (
        <div className="mt-6 bg-red-950 border border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-300">{result.error || "OCR failed"}</p>
        </div>
      )}

      {result?.success && (
        <div className="mt-6 space-y-4">
          <div
            className={`border rounded-xl p-4 ${badgeClass(
              structured.recommended_action
            )}`}
          >
            <p className="text-sm font-semibold">
              {structured.human_required ? "Human Review Required" : "Looks Usable"}
            </p>
            <p className="text-xs mt-1">
              {structured.recommended_action || "-"}
            </p>

            {structured.review_reasons?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {structured.review_reasons.map((reason: string, index: number) => (
                  <span
                    key={`${reason}-${index}`}
                    className="text-xs bg-zinc-950/60 border border-zinc-800 rounded-full px-2 py-1"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ValueList title="MRN Numbers" values={structured.mrn_numbers || []} />
            <ValueList title="DN Numbers" values={structured.dn_numbers || []} />
            <ValueList title="PO Numbers" values={structured.po_numbers || []} />
            <ValueList title="Dates" values={structured.dates || []} />
            <ValueList
              title="Possible Locations"
              values={structured.possible_locations || []}
            />
            <ValueList
              title="Possible Items"
              values={(structured.possible_items || []).map(
                (item: any) =>
                  `${item.item_name || "-"} | Qty ${item.quantity || "-"} ${
                    item.unit || ""
                  }`
              )}
            />
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white">Structured JSON</h3>
            <pre className="text-xs text-emerald-300 whitespace-pre-wrap mt-3 max-h-[300px] overflow-auto">
              {JSON.stringify(structured, null, 2)}
            </pre>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white">Raw OCR Text</h3>
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap mt-3 max-h-[400px] overflow-auto">
              {result.extracted_text || "No text extracted"}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}