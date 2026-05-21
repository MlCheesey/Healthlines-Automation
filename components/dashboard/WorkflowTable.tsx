import StatusBadge from "./StatusBadge";

export default function WorkflowTable({
  title,
  rows,
}: {
  title: string;
  rows: any[];
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-white font-medium">{title}</h3>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-500">
            <tr>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">PO</th>
              <th className="text-left p-3">DN</th>
              <th className="text-left p-3">Action / Item</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="p-4 text-zinc-500" colSpan={5}>
                  No records yet.
                </td>
              </tr>
            )}

            {rows.map((row, index) => (
              <tr key={index} className="border-t border-zinc-800">
                <td className="p-3 text-zinc-300">{row.location || "-"}</td>
                <td className="p-3 text-zinc-300">{row.po_number || "-"}</td>
                <td className="p-3 text-zinc-300">{row.dn_number || "-"}</td>
                <td className="p-3 text-zinc-300">
                  {row.pending_action || row.action_type || row.item_name || row.notes || "-"}
                </td>
                <td className="p-3">
                  <StatusBadge status={row.status || row.mrn_status || row.invoice_status || "Open"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}