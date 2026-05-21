export default function Header() {
  return (
    <header className="h-20 border-b border-zinc-800 bg-zinc-950/80 px-8 flex items-center justify-between">
      <div>
        <p className="text-sm text-zinc-500">Current Client</p>
        <h2 className="text-xl font-semibold text-white">DaVita</h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300">
          AI Monitoring Active
        </div>

        <div className="px-3 py-2 rounded-lg bg-blue-950/50 border border-blue-900 text-sm text-blue-300">
          Human Approval Required
        </div>
      </div>
    </header>
  );
}