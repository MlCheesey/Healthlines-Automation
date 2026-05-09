import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { combined_text } = await req.json();

    if (!combined_text) {
      return Response.json(
        { error: "combined_text is required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const prompt = `
You are the AI operations analyst for HealthLines AI.

Analyze the following client email and extracted attachment text.

Return ONLY valid JSON. No markdown. No explanation outside JSON.

Classify into ONE email_type:
- Quarterly PO
- Additional PO
- MRN
- Delivery Reminder
- Delivery Date Query
- Delivery Instruction
- Partial Stock Reminder
- Query / Discrepancy
- Invoice Issue
- Other

Rules:
- If unsure, set human_required = true.
- If delivery date is missing but needed, set human_required = true.
- If location is unclear, set human_required = true.
- Do not invent dates, quantities, PO numbers, MRNs, or locations.
- Inventory checking is NOT part of this launch.
- AI only proposes actions; it does not execute.
- External email sending always requires human approval.

Return this JSON structure:

{
  "client": "",
  "email_type": "",
  "confidence": 0.0,
  "location": "",
  "po_numbers": [],
  "mrn_numbers": [],
  "dn_numbers": [],
  "items": [
    {
      "item_code": "",
      "item_name": "",
      "quantity": null,
      "unit": "",
      "rate": null
    }
  ],
  "delivery_dates": [],
  "urgency": "low | medium | high",
  "missing_info": [],
  "risk_level": "low | medium | high",
  "human_required": false,
  "recommended_action": "",
  "proposed_action": {
    "type": "",
    "description": "",
    "execution_status": "proposed_not_executed"
  },
  "draft_reply_needed": false,
  "draft_reply_instruction": "",
  "notes": ""
}

EMAIL CONTENT:
${combined_text}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return Response.json(
        {
          error: "AI returned invalid JSON",
          raw: cleaned,
        },
        { status: 500 }
      );
    }

    return Response.json(parsed);
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Analyze email failed" },
      { status: 500 }
    );
  }
}