export function detectDiscrepancies({
  po_qty,
  delivered_qty,
  invoiced_qty,
}: {
  po_qty?: number;
  delivered_qty?: number;
  invoiced_qty?: number;
}) {
  const issues: string[] = [];

  const poQty = Number(po_qty || 0);
  const deliveredQty = Number(delivered_qty || 0);
  const invoicedQty = Number(invoiced_qty || 0);

  if (deliveredQty > poQty) {
    issues.push("Delivered quantity exceeds PO quantity");
  }

  if (invoicedQty > deliveredQty) {
    issues.push("Invoiced quantity exceeds delivered quantity");
  }

  return {
    has_issue: issues.length > 0,
    issues,
  };
}