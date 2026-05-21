export type DeliveryLine = {
  client: string;
  location: string;
  po_number: string;
  dn_number: string;
  mrn_number?: string;
  item_name: string;
  qty: number;
  rate?: number | null;
  vat_percent?: number;
};

export function findMissingRates(lines: DeliveryLine[]) {
  return lines.filter((line) => line.rate === null || line.rate === undefined);
}

export function calculateInvoice(lines: DeliveryLine[]) {
  const missingRates = findMissingRates(lines);

  if (missingRates.length > 0) {
    return {
      can_generate: false,
      missing_rates: true,
      missing_lines: missingRates,
      message: "Human must fill missing unit rates before invoice PDF generation.",
    };
  }

  const rows = lines.map((line) => {
    const amount = line.qty * Number(line.rate);
    const vat = amount * ((line.vat_percent ?? 15) / 100);
    const total = amount + vat;

    return {
      ...line,
      amount,
      vat,
      total,
    };
  });

  return {
    can_generate: true,
    missing_rates: false,
    rows,
    subtotal: rows.reduce((sum, r) => sum + r.amount, 0),
    vat_total: rows.reduce((sum, r) => sum + r.vat, 0),
    grand_total: rows.reduce((sum, r) => sum + r.total, 0),
  };
}