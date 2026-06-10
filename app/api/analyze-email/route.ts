import { normalizeClassification } from "@/lib/ai/emailClassificationSchema";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

const MIN_CONFIDENCE_TO_AUTOMATE = 0.7;

function extractRefs(text: string, regex: RegExp) {
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) matches.push(match[1].trim());
  }

  return [...new Set(matches)];
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

  return [...new Set(dates)];
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

function postProcessClassification(raw: any, text: string) {
  const lower = text.toLowerCase();
  const confidence = Number(raw?.confidence || 0);

  if (confidence < MIN_CONFIDENCE_TO_AUTOMATE) {
    return forceOther(
      `Low confidence classification blocked from automation. Confidence was ${confidence}.`,
      raw
    );
  }

  if (
    lower.includes("credit note") ||
    lower.includes("duplicate delivery") ||
    lower.includes("paid in our system") ||
    lower.includes("correct below invoice")
  ) {
    return {
      ...raw,
      email_type: "Invoice Issue",
      confidence: Math.max(confidence, 0.8),
      human_required: true,
      recommended_action: "Review credit note / invoice issue manually",
      notes:
        "Detected credit note, duplicate delivery, or invoice correction wording.",
    };
  }

  return raw;
}

function fallbackClassify(text: string) {
  const lower = text.toLowerCase();
  const deliveryDates = extractDates(text);
  const simpleItems = extractSimpleItems(text);

  if (
    lower.includes("credit note") ||
    lower.includes("duplicate delivery") ||
    lower.includes("paid in our system") ||
    lower.includes("correct below invoice")
  ) {
    return {
      email_type: "Invoice Issue",
      confidence: 0.82,
      po_numbers: extractRefs(text, /po[\s:#-]*([a-z0-9/-]+)/gi),
      dn_numbers: extractRefs(text, /dn[\s:#-]*([a-z0-9/-]+)/gi),
      mrn_numbers: extractRefs(text, /mrn[\s:#-]*([a-z0-9/-]+)/gi),
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
      mrn_numbers: extractRefs(text, /mrn[\s:#-]*([a-z0-9/-]+)/gi),
      dn_numbers: extractRefs(text, /dn[\s:#-]*([a-z0-9/-]+)/gi),
      po_numbers: extractRefs(text, /po[\s:#-]*([a-z0-9/-]+)/gi),
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
      po_numbers: extractRefs(text, /po[\s:#-]*([a-z0-9/-]+)/gi),
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
      po_numbers: extractRefs(text, /po[\s:#-]*([a-z0-9/-]+)/gi),
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
      human_required: true,
      recommended_action: "Review invoice/payment issue manually",
      notes: "Fallback classifier detected invoice-related wording.",
    };
  }

  return {
    email_type: "Other",
    confidence: 0.3,
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