import { XMLParser } from "fast-xml-parser";

function asArray(value: any) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractText(value: any): string {
  if (value === undefined || value === null) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (typeof value === "object") {
    if (value["#text"] !== undefined) return extractText(value["#text"]);
    if (value._ !== undefined) return extractText(value._);
    if (value.VALUE !== undefined) return extractText(value.VALUE);
    if (value.NAME !== undefined) return extractText(value.NAME);

    const possible = Object.values(value).find(
      (v) => typeof v === "string" || typeof v === "number"
    );

    if (possible !== undefined) return extractText(possible);
  }

  return "";
}

function cleanNumber(value: any) {
  const raw = extractText(value).replace(/,/g, "");
  const match = raw.match(/-?\d+(\.\d+)?/);
  return match ? Math.abs(Number(match[0])) : 0;
}

function extractUnitFromQty(value: any) {
  return extractText(value).replace(/[0-9., -]/g, "").trim();
}

function tallyDateToIso(value: any) {
  const raw = extractText(value);

  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  return raw;
}

function pick(obj: any, keys: string[]) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }

  return "";
}

function collectNestedObjects(obj: any, keyNames: string[]): any[] {
  const found: any[] = [];

  function walk(value: any) {
    if (!value || typeof value !== "object") return;

    for (const [key, child] of Object.entries(value)) {
      if (keyNames.includes(key)) {
        found.push(...asArray(child));
      }

      if (typeof child === "object") {
        walk(child);
      }
    }
  }

  walk(obj);

  return found;
}

function collectNestedNumbersByKey(obj: any, keyNames: string[]) {
  const values: number[] = [];

  function walk(value: any) {
    if (!value || typeof value !== "object") return;

    for (const [key, child] of Object.entries(value)) {
      if (keyNames.includes(key)) {
        const n = cleanNumber(child);
        if (n > 0) values.push(n);
      }

      if (typeof child === "object") {
        walk(child);
      }
    }
  }

  walk(obj);

  return values;
}

function looksLikeVatLedgerName(value: any) {
  const text = extractText(value).toLowerCase();

  return (
    text.includes("vat") ||
    text.includes("output vat") ||
    text.includes("tax")
  );
}

function extractExplicitVatRate(entry: any) {
  const rateFields = [
    "VATPERCENT",
    "VAT_PERCENT",
    "VATRATE",
    "VAT_RATE",
    "TAXRATE",
    "TAX_RATE",
    "RATEOFTAX",
    "RATEOFVAT",
    "GSTRATE",
    "GST_RATE",
    "STATUTORYTAXRATE",
  ];

  const direct = cleanNumber(pick(entry, rateFields));

  if (direct > 0 && direct <= 25) return direct;

  const nestedRates = collectNestedNumbersByKey(entry, rateFields);

  const valid = nestedRates.find((n) => n > 0 && n <= 25);

  return valid || 0;
}

function extractLineVatAmount(entry: any) {
  const directVatNumbers = collectNestedNumbersByKey(entry, [
    "VATAMOUNT",
    "TAXAMOUNT",
    "GSTAMOUNT",
    "OUTPUTVATAMOUNT",
    "OUTPUTTAXAMOUNT",
  ]);

  const saneDirectVat = directVatNumbers.filter((n) => n > 0);

  if (saneDirectVat.length > 0) {
    return saneDirectVat.reduce((sum, n) => sum + n, 0);
  }

  const allocations = collectNestedObjects(entry, [
    "ACCOUNTINGALLOCATIONS.LIST",
    "ACCOUNTINGALLOCATIONS",
    "LEDGERENTRIES.LIST",
    "LEDGERENTRIES",
  ]);

  let vatAmount = 0;

  for (const allocation of allocations) {
    const ledgerName = pick(allocation, [
      "LEDGERNAME",
      "LEDGER",
      "ACCOUNTINGLEDGER",
      "NAME",
    ]);

    if (!looksLikeVatLedgerName(ledgerName)) continue;

    vatAmount += cleanNumber(
      pick(allocation, ["VATAMOUNT", "TAXAMOUNT", "GSTAMOUNT", "AMOUNT"])
    );
  }

  return vatAmount;
}

function calculateVatPercent({
  explicitRate,
  vatAmount,
  taxableAmount,
}: {
  explicitRate: number;
  vatAmount: number;
  taxableAmount: number;
}) {
  if (explicitRate > 0 && explicitRate <= 25) {
    return explicitRate;
  }

  if (!vatAmount || !taxableAmount) return 0;

  const percent = (vatAmount / taxableAmount) * 100;
  const rounded = Number(percent.toFixed(2));

  // Safety guard: never accept impossible VAT rates like 100%.
  if (rounded < 0 || rounded > 25) {
    return 0;
  }

  return rounded;
}

export function parseTallyDeliveryNotesXml(xml: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    trimValues: true,
    parseTagValue: false,
    parseAttributeValue: false,
  });

  const parsed = parser.parse(xml);

  const collection =
    parsed?.ENVELOPE?.BODY?.DATA?.COLLECTION ||
    parsed?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA ||
    {};

  const vouchers = asArray(
    collection.VOUCHER ||
      collection.TALLYMESSAGE?.VOUCHER ||
      parsed?.ENVELOPE?.BODY?.DATA?.TALLYMESSAGE?.VOUCHER
  );

  return vouchers.map((voucher: any) => {
    const entries = asArray(
      voucher["ALLINVENTORYENTRIES.LIST"] ||
        voucher.ALLINVENTORYENTRIES ||
        voucher.INVENTORYENTRIES ||
        voucher["INVENTORYENTRIES.LIST"]
    );

    const lines = entries.map((entry: any) => {
      const qtyRaw = pick(entry, [
        "BILLEDQTY",
        "ACTUALQTY",
        "QTY",
        "BILLEDQUANTITY",
      ]);

      const stockName = pick(entry, [
        "STOCKITEMNAME",
        "STOCKITEM",
        "ITEMNAME",
      ]);

      const rate = cleanNumber(pick(entry, ["RATE", "BASICRATE"])) || null;

      const deliveredQty = cleanNumber(qtyRaw);

      const taxableAmount =
        cleanNumber(pick(entry, ["AMOUNT", "TAXABLEAMOUNT", "BASICAMOUNT"])) ||
        Number(((rate || 0) * deliveredQty).toFixed(2));

      const explicitRate = extractExplicitVatRate(entry);
      const vatAmount = extractLineVatAmount(entry);

      const vatPercent = calculateVatPercent({
        explicitRate,
        vatAmount,
        taxableAmount,
      });

      const needsVatReview =
        vatAmount > 0 && taxableAmount > 0 && vatPercent === 0;

      return {
        item_code: extractText(stockName),
        item_name: extractText(stockName),
        delivered_qty: deliveredQty,
        unit: extractUnitFromQty(qtyRaw),
        rate,
        taxable_amount: taxableAmount,
        vat_amount: vatAmount,
        vat_percent: vatPercent,
        taxability:
          vatPercent > 0
            ? "Taxable from Tally"
            : needsVatReview
              ? "VAT Review Required"
              : "No VAT from Tally",
        tax_reason:
          vatPercent > 0
            ? explicitRate > 0
              ? "VAT rate extracted directly from Tally"
              : "VAT rate calculated from Tally VAT amount and taxable amount"
            : needsVatReview
              ? "Tally VAT amount exists but calculated VAT rate was invalid"
              : "Tally delivery note did not show VAT for this line",
        needs_vat_review: needsVatReview,
      };
    });

    return {
      po_number: extractText(
        pick(voucher, ["REFERENCE", "REFERENCENO", "ORDERNO"])
      ),
      dn_number: extractText(
        pick(voucher, ["VOUCHERNUMBER", "VOUCHERNO", "NUMBER"])
      ),
      dn_date: tallyDateToIso(pick(voucher, ["DATE", "VOUCHERDATE"])),
      party_name: extractText(pick(voucher, ["PARTYLEDGERNAME", "PARTYNAME"])),
      remarks: extractText(pick(voucher, ["NARRATION"])),
      lines,
    };
  });
}