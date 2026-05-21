export default function StatusBadge({ status }: { status: string }) {
  const value = String(status || "Unknown");

  const color =
    value.toLowerCase().includes("approved") ||
    value.toLowerCase().includes("received") ||
    value.toLowerCase().includes("ready")
      ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
      : value.toLowerCase().includes("pending")
      ? "bg-yellow-950/40 border-yellow-800 text-yellow-300"
      : value.toLowerCase().includes("overdue") ||
        value.toLowerCase().includes("blocked") ||
        value.toLowerCase().includes("missing")
      ? "bg-red-950/40 border-red-800 text-red-300"
      : "bg-zinc-800 border-zinc-700 text-zinc-300";

  return (
    <span className={`px-2.5 py-1 rounded-lg border text-xs ${color}`}>
      {value}
    </span>
  );
}