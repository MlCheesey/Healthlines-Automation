import { withRetry } from "@/lib/system/retry";
import { DATA_ROOT } from "@/lib/config/storage";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { invoiceHtmlTemplate } from "./invoiceHtmlTemplate";
import {
  logSystemEvent,
  logSystemError,
} from "@/lib/system/logger";
import { getClientProfile } from "@/lib/config/clientProfiles";

type InvoiceItem = {
  item_code?: string;
  item_name: string;
  qty: number;
  unit?: string;
  rate: number;
  batch?: string;
  expiry?: string;
  extra_lines?: string[];
  vat_percent?: number;
  taxability?: string;
  tax_reason?: string;
};

type InvoiceData = {
  invoice_number: string;
  client: string;
  location: string;
  po_number: string;
  dn_number: string;
  dn_date?: string;
  mrn_number?: string;
  mrn_status?: "Received" | "Pending" | "Overdue";

  consignee_name?: string;
  consignee_city?: string;

  buyer_name?: string;
  buyer_city?: string;
  buyer_building_no?: string;
  buyer_district?: string;
  buyer_postal_code?: string;
  buyer_region?: string;
  buyer_country?: string;
  buyer_vat_no?: string;
  place_of_supply?: string;
  buyer_secondary_no?: string;
  payment_terms?: string;

  items: InvoiceItem[];
};

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function today() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function nowTime() {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getOtherReference(data: InvoiceData) {
  const mrn = String(data.mrn_number || "").trim();

  if (mrn) {
    return mrn;
  }

  return "MRN Pending";
}

function imageToDataUri(filePath: string) {
  if (!fs.existsSync(filePath)) return "";

  const extension = path.extname(filePath).toLowerCase();

  const mime =
    extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".webp"
        ? "image/webp"
        : "image/png";

  const base64 = fs.readFileSync(filePath).toString("base64");

  return `data:${mime};base64,${base64}`;
}

function getLogoDataUri() {
  const possiblePaths = [
    path.join(process.cwd(), "public", "healthlines-logo.png"),
    path.join(process.cwd(), "public", "healthlines-logo.jpg"),
    path.join(process.cwd(), "public", "healthlines-logo.jpeg"),
    path.join(process.cwd(), "public", "logo.png"),
  ];

  for (const filePath of possiblePaths) {
    const dataUri = imageToDataUri(filePath);
    if (dataUri) return dataUri;
  }

  return "";
}

export async function generateInvoicePdf(data: InvoiceData) {
  let browser: any = null;

  try {
    const clientProfile = getClientProfile(data.client);

    const missingRate = data.items.find(
      (item) =>
        item.rate === null ||
        item.rate === undefined ||
        Number.isNaN(Number(item.rate))
    );

    if (missingRate) {
      throw new Error(`Missing unit rate for item: ${missingRate.item_name}`);
    }

    const invoicesDir = path.join(DATA_ROOT, "invoices");
    ensureDir(invoicesDir);

    const filePath = path.join(invoicesDir, `${data.invoice_number}.pdf`);

    const items = data.items.map((item, index) => {
      const qty = Number(item.qty);
      const rate = Number(item.rate);
      const amount = qty * rate;

      const hasVatPercent =
        item.vat_percent !== undefined &&
        item.vat_percent !== null &&
        !Number.isNaN(Number(item.vat_percent));

      const vatPercent = hasVatPercent
        ? Number(item.vat_percent)
        : undefined;

      const vatAmount =
        vatPercent !== undefined
          ? amount * (vatPercent / 100)
          : undefined;

      return {
        sl_no: index + 1,
        description: item.item_name,
        item_code: item.item_code || "",
        quantity: qty,
        unit: item.unit || "",
        rate,
        per: item.unit || "",
        amount,
        vat_percent: vatPercent,
        vat_amount: vatAmount,
        total_with_vat:
          vatAmount !== undefined
            ? amount + vatAmount
            : amount,
        batch: item.batch || "",
        expiry: item.expiry || "",
        extra_lines: item.extra_lines || [],
        taxability: item.taxability || "",
        tax_reason: item.tax_reason || "",
      };
    });

    const total = items.reduce(
      (sum, item) =>
        sum + Number(item.total_with_vat || item.amount || 0),
      0
    );

    const html = invoiceHtmlTemplate({
      logo_data_uri: getLogoDataUri(),

      invoice_number: data.invoice_number,
      invoice_date: today(),
      invoice_time: nowTime(),

      delivery_note: data.dn_number,
      delivery_note_date: data.dn_date || today(),

      buyer_order_no: data.po_number,
      buyer_order_date: "",

      other_references: getOtherReference(data),
      destination: data.location?.toUpperCase() || "",
      payment_terms: data.payment_terms || clientProfile.payment_terms || "",

      consignee_name:
        data.consignee_name ||
        clientProfile.consignee_name ||
        clientProfile.display_name ||
        "",
      consignee_city: data.consignee_city || clientProfile.consignee_city || "",

      buyer_name:
        data.buyer_name ||
        clientProfile.buyer_name ||
        clientProfile.display_name ||
        "",
      buyer_city: data.buyer_city || clientProfile.buyer_city || "",
      buyer_building_no:
        data.buyer_building_no || clientProfile.buyer_building_no || "",
      buyer_district: data.buyer_district || clientProfile.buyer_district || "",
      buyer_postal_code:
        data.buyer_postal_code || clientProfile.buyer_postal_code || "",
      buyer_region: data.buyer_region || clientProfile.buyer_region || "",
      buyer_country: data.buyer_country || clientProfile.buyer_country || "",
      buyer_vat_no: data.buyer_vat_no || clientProfile.buyer_vat_no || "",
      place_of_supply:
        data.place_of_supply || clientProfile.place_of_supply || "",
      buyer_secondary_no:
        data.buyer_secondary_no || clientProfile.buyer_secondary_no || "",

      items,

      amount_in_words: `Saudi Arabian Riyal ${total.toLocaleString("en-US", {
        minimumFractionDigits: 2,
      })} Only`,
    });

    browser = await withRetry(
      () =>
        puppeteer.launch({
          headless: true,
        }),
      {
        retries: 2,
        delayMs: 1000,
        label: "puppeteer_launch",
      }
    );

    const page = await browser.newPage();

    await withRetry(() => page.setContent(html), {
      retries: 2,
      delayMs: 1000,
      label: "invoice_html_render",
    });

    await withRetry(
      () =>
        page.pdf({
          path: filePath,
          format: "A4",
          printBackground: true,
        }),
      {
        retries: 2,
        delayMs: 1000,
        label: "invoice_pdf_write",
      }
    );

    await browser.close();
    browser = null;

    logSystemEvent(
      "invoice_pdf_generated",
      `Invoice PDF generated: ${data.invoice_number}`,
      {
        invoice_number: data.invoice_number,
        path: filePath,
        mrn_status: data.mrn_status || "Pending",
        mrn_number: data.mrn_number || "",
        logo_included: Boolean(getLogoDataUri()),
      }
    );

    return filePath;
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }

    logSystemError("generate-invoice-pdf", error);
    throw error;
  }
}