const navItems = [
  "Dashboard",
  "Emails",
  "Delivery Tasks",
  "Locations",
  "MRNs",
  "Invoices",
  "Issues",
  "AI Activity",
  "Settings",
];

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-zinc-950 border-r border-zinc-800 px-5 py-6">
      <div className="mb-10">
        <h1 className="text-xl font-semibold text-white tracking-tight">
          HealthLines AI
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Operations Command
        </p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <button
            key={item}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="mt-10 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
        <p className="text-xs text-zinc-500">Mode</p>
        <p className="text-sm text-emerald-400 mt-1">
          Non-Interference Build
        </p>
      </div>
    </aside>
  );
}