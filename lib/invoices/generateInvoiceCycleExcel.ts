import path from "path";
import ExcelJS from "exceljs";

type InvoiceRow = {
  client: string;
  location: string;
  po_number: string;
  dn_number: string;
  mrn_number?: string;
  invoice_number: string;
  qty: number;
  amount: number;
  status: string;
};

export async function generateInvoiceCycleExcel(
  rows: InvoiceRow[]
) {
  const workbook =
    new ExcelJS.Workbook();

  const summary =
    workbook.addWorksheet(
      "Summary"
    );

  summary.columns = [
    {
      header: "Client",
      key: "client",
      width: 20,
    },
    {
      header: "Location",
      key: "location",
      width: 20,
    },
    {
      header: "PO",
      key: "po_number",
      width: 20,
    },
    {
      header: "DN",
      key: "dn_number",
      width: 20,
    },
    {
      header: "MRN",
      key: "mrn_number",
      width: 20,
    },
    {
      header: "Invoice",
      key: "invoice_number",
      width: 20,
    },
    {
      header: "Qty",
      key: "qty",
      width: 10,
    },
    {
      header: "Amount",
      key: "amount",
      width: 15,
    },
    {
      header: "Status",
      key: "status",
      width: 20,
    },
  ];

  rows.forEach((row) => {
    summary.addRow(row);
  });

  const outputPath = path.join(
    process.cwd(),
    "data",
    "invoices",
    `invoice_cycle_${Date.now()}.xlsx`
  );

  await workbook.xlsx.writeFile(
    outputPath
  );

  return outputPath;
}