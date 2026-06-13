"use client";

const items = [
  "Dashboard",
  "Needs Review",
  "Emails",
  "Delivery Tasks",
  "Locations",
  "MRNs",
  "Invoices",
  "Issues",
  "AI Activity",
  "Settings",
];

export default function Sidebar({
  active,
  onChange,
}: {
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <aside className="w-64 min-h-screen bg-zinc-950 border-r border-zinc-800 p-5">
      <div className="mb-10">
        <h1 className="text-lg font-bold text-white">HealthLines AI</h1>

        <p className="text-xs text-zinc-500">Operations Command</p>
      </div>

      <nav className="space-y-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
              active === item
                ? "bg-blue-700 text-white"
                : item === "Needs Review"
                  ? "text-orange-300 hover:bg-orange-950 hover:text-orange-200"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="mt-10 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
        <p className="text-xs text-zinc-500">Current Section</p>
        <p className="text-xs text-emerald-400 font-semibold mt-1">
          {active}
        </p>
      </div>
    </aside>
  );
}