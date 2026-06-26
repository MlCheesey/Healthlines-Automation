import { normalizeClassification } from "@/lib/ai/emailClassificationSchema";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

const MIN_CONFIDENCE_TO_AUTOMATE = 0.7;

function unique(values: string[]) {
  return [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))];
}

function extractRefs(text: string, regex: RegExp) {
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) matches.push(match[1].trim());
  }

  return unique(matches);
}

function normalizePoNumber(value: any) {
  const raw = String(value || "")
    .trim()
    .replace(/^POC\s*:\s*/i, "")
    .replace(/^PO\s*[:#-]\s*/i, "")
    .replace(/[),.;]+$/g, "")
    .trim();

  if (!raw) return "";

  const compact = raw.replace(/\s+/g, "");

  const fullPoMatch = compact.match(/PO\/KSA\/20\d{2}\/\d{1,6}/i);
  if (fullPoMatch) return fullPoMatch[0].toUpperCase();

  const numericMatch = compact.match(/^\d{2,6}$/);
  if (numericMatch) return numericMatch[0];

  return "";
}

function normalizeDnNumber(value: any) {
  const raw = String(value || "")
    .trim()
    .replace(/^DN\s*[:#-]\s*/i, "DN-")
    .replace(/[),.;]+$/g, "")
    .trim();

  const match = raw.match(/DN[-/ ]?\d{2,6}[-/]\d{2}[-/]\d{2}/i);
  return match ? match[0].replace(/\s+/g, "-").toUpperCase() : "";
}

function normalizeMrnNumber(value: any) {
  const raw = String(value || "")
    .trim()
    .replace(/^MRN\s*[:#-]\s*/i, "MRN-")
    .replace(/[),.;]+$/g, "")
    .trim();

  const match = raw.match(/MRN[-/ ]?[A-Z0-9-]{3,30}/i);
  return match ? match[0].replace(/\s+/g, "-").toUpperCase() : "";
}

function cleanPoNumbers(values: any[] = []) {
  const cleaned = unique(
    values
      .flatMap((value) => {
        const raw = String(value || "");

        const fullMatches = raw.match(/PO\/KSA\/20\d{2}\/\d{1,6}/gi) || [];
        const normalizedFull = fullMatches.map(normalizePoNumber).filter(Boolean);

        const direct = normalizePoNumber(raw);

        return [...normalizedFull, direct].filter(Boolean);
      })
      .filter(Boolean)
  );

  const fullPoNumbers = cleaned.filter((po) => /^PO\/KSA\/20\d{2}\/\d{1,6}$/i.test(po));

  if (fullPoNumbers.length > 0) {
    return unique(fullPoNumbers);
  }

  return cleaned.filter((po) => /^\d{2,6}$/.test(po));
}

function cleanDnNumbers(values: any[] = []) {
  return unique(values.map(normalizeDnNumber).filter(Boolean));
}

function cleanMrnNumbers(values: any[] = []) {
  return unique(values.map(normalizeMrnNumber).filter(Boolean));
}

function extractPoNumbersFromText(text: string) {
  const matches = [
    ...(text.match(/PO\/KSA\/20\d{2}\/\d{1,6}/gi) || []),
    ...extractRefs(text, /\bPO\s*[:#-]?\s*(\d{2,6})\b/gi),
  ];

  return cleanPoNumbers(matches);
}

function extractDnNumbersFromText(text: string) {
  const matches = text.match(/\bDN[-/ ]?\d{2,6}[-/]\d{2}[-/]\d{2}\b/gi) || [];
  return cleanDnNumbers(matches);
}

function extractMrnNumbersFromText(text: string) {
  const matches = text.match(/\bMRN[-/ ]?[A-Z0-9-]{3,30}\b/gi) || [];
  return cleanMrnNumbers(matches);
}

function extractDates(text: string) {
  const patterns = [
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
    /\b\d{1,2}\s?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s?\d{2,4}\b/gi,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/gi,
  ];

  const dates: string[] = [];

  for (const pattern of patterns) {
    const found = text.match(pattern);
    if (found) dates.push(...found);
  }

  return unique(dates);
}

function extractSimpleItems(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: any[] = [];

  for (const line of lines) {
    const qtyMatch =
      line.match(/(.+?)\s+[-–—]?\s*(qty|quantity)\s*[:=]?\s*(\d+)/i) ||
      line.match(/(.+?)\s+(\d+)\s*(pcs|pc|box|boxes|each|ea|ctn|carton|bottle|pack|packs)?\b/i);

    if (!qtyMatch) continue;

    const itemName = String(qtyMatch[1] || "").trim();
    const quantity = Number(qtyMatch[3] || qtyMatch[2] || 0);
    const unit = String(qtyMatch[4] || "").trim();

    if (itemName.length < 3 || !quantity) continue;

    if (
      /confidentiality|privacy|disclaimer|recipient|sender|email|fax|telephone|copyright/i.test(
        itemName
      )
    ) {
      continue;
    }

    items.push({
      item_code: "",
      item_name: itemName,
      quantity,
      unit,
      delivery_date: "",
    });
  }

  return items;
}

function forceOther(reason: string, original: any) {
  return {
    ...original,
    email_type: "Other",
    confidence: Number(original?.confidence || 0),
    human_required: true,
    recommended_action: "Review email manually",
    notes: `${reason}${original?.notes ? ` Original notes: ${original.notes}` : ""}`,
    items: original?.items || [],
    locations: original?.locations || [],
  };
}

function cleanClassificationRefs(raw: any, text: string) {
  const textPoNumbers = extractPoNumbersFromText(text);
  const textDnNumbers = extractDnNumbersFromText(text);
  const textMrnNumbers = extractMrnNumbersFromText(text);

  const rawPoNumbers = Array.isArray(raw?.po_numbers)
    ? raw.po_numbers
    : raw?.po_number
      ? [raw.po_number]
      : [];

  const rawDnNumbers = Array.isArray(raw?.dn_numbers) ? raw.dn_numbers : [];
  const rawMrnNumbers = Array.isArray(raw?.mrn_numbers) ? raw.mrn_numbers : [];

  const poNumbers = cleanPoNumbers([...rawPoNumbers, ...textPoNumbers]);
  const dnNumbers = cleanDnNumbers([...rawDnNumbers, ...textDnNumbers]);
  const mrnNumbers = cleanMrnNumbers([...rawMrnNumbers, ...textMrnNumbers]);

  return {
    ...raw,
    po_numbers: poNumbers,
    po_number: poNumbers[0] || "",
    dn_numbers: dnNumbers,
    mrn_numbers: mrnNumbers,
  };
}

function postProcessClassification(raw: any, text: string) {
  const lower = text.toLowerCase();
  const confidence = Number(raw?.confidence || 0);

  let cleaned = cleanClassificationRefs(raw, text);

  if (
    lower.includes("credit note") ||
    lower.includes("duplicate delivery") ||
    lower.includes("paid in our system") ||
    lower.includes("correct below invoice")
  ) {
    cleaned = {
      ...cleaned,
      email_type: "Invoice Issue",
      confidence: Math.max(confidence, 0.8),
      human_required: true,
      recommended_action: "Review credit note / invoice issue manually",
      notes:
        "Detected credit note, duplicate delivery, or invoice correction wording.",
    };
  }

  if (Number(cleaned?.confidence || 0) < MIN_CONFIDENCE_TO_AUTOMATE) {
    return forceOther(
      `Low confidence classification blocked from automation. Confidence was ${Number(
        cleaned?.confidence || 0
      )}.`,
      cleaned
    );
  }

  return cleaned;
}

function fallbackClassify(text: string) {
  const lower = text.toLowerCase();
  const deliveryDates = extractDates(text);
  const simpleItems = extractSimpleItems(text);
  const poNumbers = extractPoNumbersFromText(text);
  const dnNumbers = extractDnNumbersFromText(text);
  const mrnNumbers = extractMrnNumbersFromText(text);

  if (
    lower.includes("credit note") ||
    lower.includes("duplicate delivery") ||
    lower.includes("paid in our system") ||
    lower.includes("correct below invoice")
  ) {
    return {
      email_type: "Invoice Issue",
      confidence: 0.82,
      po_numbers: poNumbers,
      po_number: poNumbers[0] || "",
      dn_numbers: dnNumbers,
      mrn_numbers: mrnNumbers,
      items: simpleItems,
      human_required: true,
      recommended_action: "Review credit note / invoice issue manually",
      notes:
        "Fallback classifier detected credit note, duplicate delivery, or invoice correction wording.",
    };
  }

  if (
    lower.includes("mrn") ||
    lower.includes("material receipt") ||
    lower.includes("receipt note")
  ) {
    return {
      email_type: "MRN",
      confidence: 0.78,
      mrn_numbers: mrnNumbers,
      dn_numbers: dnNumbers,
      po_numbers: poNumbers,
      po_number: poNumbers[0] || "",
      human_required: true,
      recommended_action: "Review MRN references and sync with delivery history",
      notes: "Fallback classifier detected MRN-related wording.",
    };
  }

  if (
    lower.includes("purchase order") ||
    lower.includes(" po ") ||
    lower.includes("quarterly po") ||
    lower.includes("request orders")
  ) {
    return {
      email_type: lower.includes("quarterly") ? "Quarterly PO" : "Additional PO",
      confidence: simpleItems.length > 0 ? 0.78 : 0.62,
      po_numbers: poNumbers,
      po_number: poNumbers[0] || "",
      delivery_dates: deliveryDates,
      delivery_date: deliveryDates[0] || "",
      items: simpleItems,
      human_required: true,
      recommended_action: deliveryDates.length
        ? `Record PO and schedule delivery for ${deliveryDates[0]}`
        : "Review PO manually and confirm extracted items",
      notes: simpleItems.length
        ? "Fallback classifier detected PO and extracted simple item lines."
        : "Fallback classifier detected PO-related wording, but item extraction was unclear.",
    };
  }

  if (
    lower.includes("delivery") ||
    lower.includes("deliver") ||
    lower.includes("stock") ||
    lower.includes("follow up below items") ||
    lower.includes("below items")
  ) {
    return {
      email_type: "Delivery Instruction",
      confidence: simpleItems.length > 0 ? 0.76 : 0.6,
      po_numbers: poNumbers,
      po_number: poNumbers[0] || "",
      delivery_dates: deliveryDates,
      delivery_date: deliveryDates[0] || "",
      items: simpleItems,
      human_required: true,
      recommended_action: deliveryDates.length
        ? `Review delivery instruction for ${deliveryDates[0]}`
        : "Review delivery instruction manually",
      notes: simpleItems.length
        ? "Fallback classifier detected delivery wording and extracted simple item lines."
        : "Fallback classifier detected delivery wording, but item extraction was unclear.",
    };
  }

  if (lower.includes("invoice") || lower.includes("payment")) {
    return {
      email_type: "Invoice Issue",
      confidence: 0.72,
      po_numbers: poNumbers,
      po_number: poNumbers[0] || "",
      dn_numbers: dnNumbers,
      mrn_numbers: mrnNumbers,
      human_required: true,
      recommended_action: "Review invoice/payment issue manually",
      notes: "Fallback classifier detected invoice-related wording.",
    };
  }

  return {
    email_type: "Other",
    confidence: 0.3,
    po_numbers: poNumbers,
    po_number: poNumbers[0] || "",
    dn_numbers: dnNumbers,
    mrn_numbers: mrnNumbers,
    human_required: true,
    recommended_action: "Review email manually",
    notes: "Fallback classifier could not confidently classify email.",
  };
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");

    if (start >= 0 && end > start) {
      try {
        return JSON.parse(value.slice(start, end + 1));
      } catch {
        return null;
      }
    }

    return null;
  }
}

async function callGeminiClassifier(text: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return null;

  const prompt = `
You are classifying operational emails for Health Lines Medical Supply Co.

Return ONLY valid JSON. No markdown.

Allowed email_type values:
- Quarterly PO
- Additional PO
- Delivery Instruction
- Delivery Date Query
- Delivery Reminder
- Partial Stock Reminder
- MRN
- Invoice Issue
- Query / Discrepancy
- Other

JSON shape:
{
  "email_type": "",
  "confidence": 0.0,
  "client": "",
  "location": "",
  "po_number": "",
  "po_numbers": [],
  "dn_numbers": [],
  "mrn_numbers": [],
  "delivery_dates": [],
  "delivery_date": "",
  "items": [
    {
      "item_code": "",
      "item_name": "",
      "quantity": 0,
      "unit": "",
      "delivery_date": ""
    }
  ],
  "locations": [
    {
      "location": "",
      "delivery_date": "",
      "items": [
        {
          "item_code": "",
          "item_name": "",
          "quantity": 0,
          "unit": "",
          "delivery_date": ""
        }
      ]
    }
  ],
  "urgency": "Low | Medium | High",
  "human_required": true,
  "recommended_action": "",
  "notes": ""
}

Rules:
- Never guess. If uncertain, confidence must be below 0.7.
- If confidence is below 0.7, use email_type "Other".
- Credit note / duplicate delivery / invoice correction emails must be "Invoice Issue", not MRN.
- MRN only if the email is mainly about material receipt note / goods receipt confirmation.
- Do not classify credit note requests as MRN just because old quoted text contains MRN.
- PO only if there is a real purchase order request or PO attachment/text.
- Delivery Instruction / Delivery Reminder only if the email asks to deliver/follow up stock/items.
- If item extraction is unclear, leave items empty and explain in notes.
- Do not extract random words from privacy notices as PO numbers.
- Only extract PO numbers matching PO/KSA/YYYY/NUMBER or clean numeric PO references.
- Do not extract words like SED, RTABILITY, RESPONSIBLE, INTERNATIONAL, PDF, RECIPIENT, EMAIL, PRIVACY as PO numbers.
- Client is "davita" only if sender/domain/text clearly indicates DaVita.
- Location should be extracted from subject/body, for example KFH Al Ahsa, Khobar, Jeddah, Dammam.

Email text:
${text}
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini classify failed: ${res.status}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return safeJsonParse(raw);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const text = body.combined_text || body.text || body.email_text || "";

    if (!text.trim()) {
      return Response.json(
        { error: "combined_text or text is required" },
        { status: 400 }
      );
    }

    let rawClassification: any = null;
    let classifier = "fallback";

    try {
      rawClassification = await callGeminiClassifier(text);

      if (rawClassification) classifier = "gemini";
    } catch (error) {
      logSystemError("analyze-email-gemini", error);
    }

    if (!rawClassification) {
      rawClassification = fallbackClassify(text);
    }

    rawClassification = postProcessClassification(rawClassification, text);

    const normalized = normalizeClassification(rawClassification);

    logSystemEvent("email_analyzed", "Email analyzed", {
      classifier,
      email_type: normalized.email_type,
      confidence: normalized.confidence,
      human_required: normalized.human_required,
      source_email_id: body.source_email_id || "",
    });

    return Response.json({
      ...normalized,
      po_numbers: cleanPoNumbers((normalized as any).po_numbers || []),
      po_number: cleanPoNumbers((normalized as any).po_numbers || [])[0] || "",
      dn_numbers: cleanDnNumbers((normalized as any).dn_numbers || []),
      mrn_numbers: cleanMrnNumbers((normalized as any).mrn_numbers || []),
      delivery_date:
        (normalized as any).delivery_date || normalized.delivery_dates?.[0] || "",
      classifier,
      source_email_id: body.source_email_id || "",
    });
  } catch (error: any) {
    logSystemError("analyze-email-api", error);

    return Response.json(
      { error: error.message || "Email analysis failed" },
      { status: 500 }
    );
  }
}