type InvoiceItem = {
  sl_no: number;
  description: string;
  item_code?: string;
  quantity: number;
  unit?: string;
  rate: number;
  per?: string;
  amount: number;
  vat_percent?: number;
  vat_amount?: number;
  total_with_vat?: number;
  batch?: string;
  expiry?: string;
  extra_lines?: string[];
  taxability?: string;
  tax_reason?: string;
};

type InvoiceTemplateData = {
  invoice_number: string;
  invoice_date: string;
  invoice_time: string;
  delivery_note: string;
  delivery_note_date: string;
  buyer_order_no: string;
  buyer_order_date?: string;
  other_references?: string;
  destination?: string;
  payment_terms?: string;
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
  items: InvoiceItem[];
  amount_in_words: string;
};

function safe(value: any) {
  return String(value ?? "").trim();
}

function money(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function hasVatValue(item: InvoiceItem) {
  return item.vat_percent !== undefined && item.vat_percent !== null;
}

export function invoiceHtmlTemplate(data: InvoiceTemplateData) {
  const subtotal = data.items.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const vatTotal = data.items.reduce(
    (sum, item) => sum + Number(item.vat_amount || 0),
    0
  );

  const grandTotal = subtotal + vatTotal;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
body{font-family:Arial,sans-serif;margin:0;padding:20px;font-size:12px;color:#000;}
table{width:100%;border-collapse:collapse;}
td,th{border:1px solid #000;padding:5px;vertical-align:top;}
.heading{font-size:20px;font-weight:bold;text-align:center;margin-bottom:10px;}
.center{text-align:center;}
.right{text-align:right;}
.bold{font-weight:bold;}
.small{font-size:10px;}
.mt-10{margin-top:10px;}
.item-description{line-height:1.4;}
.footer{margin-top:20px;}
</style>
</head>
<body>

<div class="heading">TAX INVOICE</div>

<table>
<tr>
<td width="50%">
<div><b>Invoice No.</b> ${safe(data.invoice_number)}</div>
<div><b>Date</b> ${safe(data.invoice_date)}</div>
<div><b>Time</b> ${safe(data.invoice_time)}</div>
</td>
<td width="50%">
<div><b>Delivery Note</b> ${safe(data.delivery_note)}</div>
<div><b>DN Date</b> ${safe(data.delivery_note_date)}</div>
</td>
</tr>

<tr>
<td>
<div><b>Buyer Order No.</b> ${safe(data.buyer_order_no)}</div>
<div><b>Buyer Order Date</b> ${safe(data.buyer_order_date)}</div>
</td>
<td>
<div><b>Other Reference(s)</b> ${safe(data.other_references)}</div>
<div><b>Destination</b> ${safe(data.destination)}</div>
<div><b>Payment Terms</b> ${safe(data.payment_terms)}</div>
</td>
</tr>

<tr>
<td>
<div class="bold">Consignee</div>
<div>${safe(data.consignee_name)}</div>
<div>${safe(data.consignee_city)}</div>
</td>
<td>
<div class="bold">Buyer</div>
<div>${safe(data.buyer_name)}</div>
<div>${safe(data.buyer_city)}</div>
<div>${safe(data.buyer_building_no)}</div>
<div>${safe(data.buyer_district)}</div>
<div>${safe(data.buyer_postal_code)}</div>
<div>${safe(data.buyer_region)}</div>
<div>${safe(data.buyer_country)}</div>
<div>VAT No: ${safe(data.buyer_vat_no)}</div>
<div>Secondary No: ${safe(data.buyer_secondary_no)}</div>
<div>Place of Supply: ${safe(data.place_of_supply)}</div>
</td>
</tr>
</table>

<table class="mt-10">
<thead>
<tr>
<th>Sl</th>
<th>Description</th>
<th>Qty</th>
<th>Unit</th>
<th>Rate</th>
<th>Taxable Amount</th>
<th>VAT %</th>
<th>VAT Amount</th>
<th>Total</th>
</tr>
</thead>

<tbody>
${data.items
  .map(
    (item) => `
<tr>
<td class="center">${item.sl_no}</td>
<td class="item-description">
<div>${safe(item.description)}</div>
${item.item_code ? `<div class="small">Code: ${safe(item.item_code)}</div>` : ""}
${item.batch ? `<div class="small">Batch: ${safe(item.batch)}</div>` : ""}
${item.expiry ? `<div class="small">Expiry: ${safe(item.expiry)}</div>` : ""}
${item.taxability ? `<div class="small">Taxability: ${safe(item.taxability)}</div>` : ""}
${item.tax_reason ? `<div class="small">Tax Reason: ${safe(item.tax_reason)}</div>` : ""}
${Array.isArray(item.extra_lines) ? item.extra_lines.map((line) => `<div class="small">${safe(line)}</div>`).join("") : ""}
</td>
<td class="right">${money(item.quantity)}</td>
<td class="center">${safe(item.unit)}</td>
<td class="right">${money(item.rate)}</td>
<td class="right">${money(item.amount)}</td>
<td class="center">${hasVatValue(item) ? safe(item.vat_percent) + "%" : ""}</td>
<td class="right">${hasVatValue(item) ? money(item.vat_amount || 0) : ""}</td>
<td class="right">${money(item.total_with_vat ?? item.amount)}</td>
</tr>
`
  )
  .join("")}

<tr>
<td colspan="5" class="right bold">Subtotal</td>
<td class="right bold">${money(subtotal)}</td>
<td></td>
<td class="right bold">${money(vatTotal)}</td>
<td class="right bold">${money(grandTotal)}</td>
</tr>
</tbody>
</table>

<div class="footer">
<div><b>Amount in Words:</b></div>
<div>${safe(data.amount_in_words)}</div>
</div>

</body>
</html>
`;
}