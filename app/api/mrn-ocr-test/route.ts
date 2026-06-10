import fs from "fs";
import path from "path";
import os from "os";
import { runOCR } from "@/lib/parsers/ocrParser";

function extractMatches(text: string, regex: RegExp) {
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const value = String(match[1] || match[0] || "").trim();
    if (value && !matches.includes(value)) matches.push(value);
  }

  return matches;
}

function analyzeMrnText(text: string) {
  return {
    mrn_numbers: extractMatches(text, /\b(?:MRN|M\.?R\.?N\.?|Material Receipt Note)\s*[:#-]?\s*([A-Z0-9/-]+)/gi),
    dn_numbers: extractMatches(text, /\b(?:DN|D\.?N\.?|Delivery Note)\s*[:#-]?\s*([A-Z0-9/-]+)/gi),
    po_numbers: extractMatches(text, /\b(?:PO|P\.?O\.?|Purchase Order)\s*[:#-]?\s*([A-Z0-9/-]+)/gi),
    dates: extractMatches(text, /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g),
    possible_locations: extractMatches(text, /\b(KFH|Al Ahsa|Ahsa|Khobar|Dammam|Jeddah|Riyadh|Makkah|Madinah|King Faisal)[A-Za-z\s-]*/gi),
  };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tempDir = path.join(os.tmpdir(), "healthlines-mrn-ocr");
    fs.mkdirSync(tempDir, { recursive: true });

    const safeName = String(file.name || "mrn-image")
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    const filePath = path.join(tempDir, `${Date.now()}-${safeName}`);
    fs.writeFileSync(filePath, buffer);

    const ocr = await runOCR(filePath);
    const text = ocr.text || "";

    return Response.json({
      success: true,
      filename: file.name,
      text_length: text.length,
      extracted_text: text,
      structured: analyzeMrnText(text),
    });
  } catch (error: any) {
    return Response.json(
      { success: false, error: error?.message || "MRN OCR test failed" },
      { status: 500 }
    );
  }
}