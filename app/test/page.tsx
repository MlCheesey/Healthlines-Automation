"use client";

import { useState } from "react";

export default function TestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function runAnalysis() {
    try {
      setLoading(true);
      setError("");
      setResult(null);

      // STEP 1 — Get latest email
      const gmailRes = await fetch("/api/gmail/latest");

      const gmailData = await gmailRes.json();

      if (!gmailRes.ok) {
        throw new Error(
          gmailData.error || "Failed to fetch Gmail email"
        );
      }

      // STEP 2 — Send combined_text to AI analyzer
      const analyzeRes = await fetch("/api/analyze-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          combined_text: gmailData.combined_text,
        }),
      });

      const analyzeData = await analyzeRes.json();

      if (!analyzeRes.ok) {
        throw new Error(
          analyzeData.error || "Analyze email failed"
        );
      }

      setResult({
        gmail: gmailData,
        analysis: analyzeData,
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">
          HealthLines AI Test Console
        </h1>

        <button
          onClick={runAnalysis}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold"
        >
          {loading ? "Analyzing..." : "Analyze Latest Email"}
        </button>

        {error && (
          <div className="mt-6 bg-red-900 border border-red-500 p-4 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-3">
                Gmail Intake
              </h2>

              <pre className="bg-zinc-900 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(result.gmail, null, 2)}
              </pre>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-3">
                AI Operational Analysis
              </h2>

              <pre className="bg-zinc-900 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(result.analysis, null, 2)}
              </pre>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}