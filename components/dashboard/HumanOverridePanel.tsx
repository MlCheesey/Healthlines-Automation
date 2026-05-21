"use client";

import { useState } from "react";

export default function HumanOverridePanel() {
  const [form, setForm] = useState({
    client: "",
    location: "",
    override_type: "",
    target: "",
    previous_value: "",
    new_value: "",
    reason: "",
    approved_by: "dashboard_user",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  function updateField(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function submitOverride() {
    if (!form.client) {
      alert("Client is required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/human-override", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">
          Human Overrides
        </h2>

        <p className="text-sm text-zinc-500 mt-1">
          Manually override workflow values without fake preset locations.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Client"
          value={form.client}
          onChange={(v) => updateField("client", v)}
          placeholder="davita / client name"
        />

        <Input
          label="Location"
          value={form.location}
          onChange={(v) => updateField("location", v)}
          placeholder="location name"
        />

        <Input
          label="Override Type"
          value={form.override_type}
          onChange={(v) => updateField("override_type", v)}
          placeholder="Delivery Date Change / Rate Update / MRN Correction"
        />

        <Input
          label="Target"
          value={form.target}
          onChange={(v) => updateField("target", v)}
          placeholder="PO / DN / invoice / task reference"
        />

        <Input
          label="Previous Value"
          value={form.previous_value}
          onChange={(v) => updateField("previous_value", v)}
          placeholder="old value"
        />

        <Input
          label="New Value"
          value={form.new_value}
          onChange={(v) => updateField("new_value", v)}
          placeholder="new value"
        />
      </div>

      <label className="block mt-4">
        <span className="text-xs text-zinc-500">Reason</span>
        <textarea
          value={form.reason}
          onChange={(e) => updateField("reason", e.target.value)}
          placeholder="Why this override is needed"
          className="mt-2 w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
        />
      </label>

      <button
        onClick={submitOverride}
        disabled={loading}
        className="mt-5 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-sm"
      >
        {loading ? "Submitting..." : "Submit Override"}
      </button>

      {result && (
        <pre className="mt-5 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="text-xs text-zinc-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
      />
    </label>
  );
}