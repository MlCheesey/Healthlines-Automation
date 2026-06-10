"use client";

import { useState } from "react";

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

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white">MRN OCR Test</h2>
      <p className="text-sm text-zinc-500 mt-1">
        Upload a scanned MRN/photo to check whether OCR can read MRN, DN, PO, dates, and location.
      </p>

      <div className="mt-5 flex flex-wrap gap-3 items-center">
        <input
          type="file"
          accept="image/*,.png,.jpg,.jpeg,.webp,.tif,.tiff"
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
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white">Structured Result</h3>
            <pre className="text-xs text-emerald-300 whitespace-pre-wrap mt-3">
              {JSON.stringify(result.structured, null, 2)}
            </pre>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white">Raw OCR Text</h3>
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap mt-3 max-h-[400px] overflow-auto">
              {result.extracted_text || result.error || "No text extracted"}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}