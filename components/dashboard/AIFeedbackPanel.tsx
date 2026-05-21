"use client";

import {
  useEffect,
  useState,
} from "react";

export default function AIFeedbackPanel() {
  const [rows, setRows] =
    useState<any[]>([]);

  const [message, setMessage] =
    useState("");

  const [correction, setCorrection] =
    useState("");

  async function load() {
    const res = await fetch(
      "/api/ai-feedback"
    );

    const data =
      await res.json();

    setRows(data.rows || []);
  }

  async function submit() {
    if (!message.trim()) return;

    await fetch(
      "/api/ai-feedback",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          message,
          correction,
        }),
      }
    );

    setMessage("");
    setCorrection("");

    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">
        AI Feedback / Corrections
      </h2>

      <div className="space-y-3 mb-6">
        <textarea
          value={message}
          onChange={(e) =>
            setMessage(
              e.target.value
            )
          }
          placeholder="What did AI do wrong?"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white min-h-[90px]"
        />

        <textarea
          value={correction}
          onChange={(e) =>
            setCorrection(
              e.target.value
            )
          }
          placeholder="Correct behaviour"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white min-h-[90px]"
        />

        <button
          onClick={submit}
          className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-sm"
        >
          Save Feedback
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-auto">
        {rows.map((row) => (
          <div
            key={row.id}
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-4"
          >
            <p className="text-white text-sm">
              {row.message}
            </p>

            <p className="text-blue-300 text-sm mt-2">
              {row.correction}
            </p>

            <p className="text-xs text-zinc-500 mt-2">
              {row.created_at}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}