import { normalizeClassification } from "@/lib/ai/emailClassificationSchema";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

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

function fallbackClassify(text: string) {
  const lower = text.toLowerCase();
  const deliveryDates = extractDates(text);

  if (
    lower.includes("mrn") ||
    lower.includes("material receipt") ||
    lower.includes("receipt note")
  ) {
    return {
      email_type: "MRN",
      confidence: 0.7,
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
      email_type: lower.includes("quarterly")
        ? "Quarterly PO"
        : "Additional PO",
      confidence: 0.65,
      po_numbers: extractRefs(text, /po[\s:#-]*([a-z0-9/-]+)/gi),
      delivery_dates: deliveryDates,
      delivery_date: deliveryDates[0] || "",
      items: [],
      human_required: true,
      recommended_action: deliveryDates.length
        ? `Record PO and schedule delivery for ${deliveryDates[0]}`
        : "Review PO manually and confirm extracted items",
      notes: deliveryDates.length
        ? "Fallback classifier detected PO with delivery date."
        : "Fallback classifier detected PO-related wording.",
    };
  }

  if (
    lower.includes("delivery") ||
    lower.includes("deliver") ||
    lower.includes("stock")
  ) {
    return {
      email_type: "Delivery Instruction",
      confidence: 0.55,
      po_numbers: extractRefs(text, /po[\s:#-]*([a-z0-9/-]+)/gi),
      delivery_dates: deliveryDates,
      delivery_date: deliveryDates[0] || "",
      human_required: true,
      recommended_action: deliveryDates.length
        ? `Review delivery instruction for ${deliveryDates[0]}`
        : "Review delivery instruction manually",
      notes: "Fallback classifier detected delivery-related wording.",
    };
  }

  if (
    lower.includes("invoice") ||
    lower.includes("payment") ||
    lower.includes("credit note")
  ) {
    return {
      email_type: "Invoice Issue",
      confidence: 0.55,
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
- Do not invent quantities, PO numbers, DN numbers, MRNs, locations, or dates.
- If uncertain, set human_required true.
- If email contains MRN references, classify as MRN.
- If email contains quarterly multi-location PO, classify as Quarterly PO and use locations[].
- If email contains a one-off PO, classify as Additional PO.
- If item extraction is unclear, leave items empty and explain in notes.
- If the email mentions a delivery date like "Please deliver on November 16, 2025", extract it into delivery_dates[].
- If that date applies to all requested products, also put that same date in each item.delivery_date.
- If delivery date applies only to a location, put it inside that location.delivery_date and its items.
- Missing MRN does not block invoice; missing rate blocks invoice.
- Client is usually davita only if clearly mentioned or context strongly indicates it.

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
        (normalized as any).delivery_date ||
        normalized.delivery_dates?.[0] ||
        "",
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