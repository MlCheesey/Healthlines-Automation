import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { DATA_ROOT } from "@/lib/config/storage";

type InvoiceRow = {
  client: string;
  location: string;
  po_number: string;
  dn_number: string;
  dn_date?: string;
  mrn_number?: string;
  mrn_status?: string;
  invoice_number: string;
  invoice_package_id?: string;
  item_code?: string;
  item_name?: string;
  qty: number;
  unit?: string;
  rate?: number | string;
  amount?: number;
  batch?: string;
  expiry?: string;
  vat_percent?: number | string;
  vat_amount?: number | string;
  taxability?: string;
  tax_reason?: string;
  needs_vat_review?: string;
  status?: string;
};

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export async function generateInvoiceCycleExcel(rows: InvoiceRow[]) {
  const workbook = new ExcelJS.Workbook();

  const summary = workbook.addWorksheet("Summary");

  summary.columns = [
    { header: "Client", key: "client", width: 20 },
    { header: "Location", key: "location", width: 24 },
    { header: "PO", key: "po_number", width: 22 },
    { header: "DN", key: "dn_number", width: 22 },
    { header: "DN Date", key: "dn_date", width: 16 },
    { header: "MRN", key: "mrn_number", width: 22 },
    { header: "MRN Status", key: "mrn_status", width: 18 },
    { header: "Invoice", key: "invoice_number", width: 28 },
    { header: "Package ID", key: "invoice_package_id", width: 24 },
    { header: "Item Code", key: "item_code", width: 16 },
    { header: "Item Name", key: "item_name", width: 40 },
    { header: "Qty", key: "qty", width: 10 },
    { header: "Unit", key: "unit", width: 12 },
    { header: "Rate", key: "rate", width: 12 },
    { header: "Amount", key: "amount", width: 15 },
    { header: "Batch", key: "batch", width: 16 },
    { header: "Expiry", key: "expiry", width: 16 },
    { header: "VAT %", key: "vat_percent", width: 10 },
    { header: "VAT Amount", key: "vat_amount", width: 15 },
    { header: "Taxability", key: "taxability", width: 18 },
    { header: "Tax Reason", key: "tax_reason", width: 28 },
    { header: "VAT Review", key: "needs_vat_review", width: 18 },
    { header: "Status", key: "status", width: 28 },
  ];

  for (const row of rows) {
    summary.addRow(row);
  }

  summary.getRow(1).font = { bold: true };
  summary.views = [{ state: "frozen", ySplit: 1 }];

  const outputDir = path.join(DATA_ROOT, "invoices");
  ensureDir(outputDir);

  const outputPath = path.join(
    outputDir,
    `invoice_cycle_${Date.now()}.xlsx`
  );

  await workbook.xlsx.writeFile(outputPath);

  return outputPath;
}