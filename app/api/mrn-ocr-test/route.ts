import fs from "fs";
import path from "path";
import os from "os";
import { runOCR } from "@/lib/parsers/ocrParser";
import { logSystemEvent, logSystemError } from "@/lib/system/logger";

function unique(values: string[]) {
  return [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))];
}

function extractMatches(text: string, regex: RegExp) {
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const value = String(match[1] || match[0] || "").trim();
    if (value) matches.push(value);
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

  const compact = raw.replace(/\s+/g, "");

  const fullPo = compact.match(/PO\/KSA\/20\d{2}\/\d{1,6}/i);
  if (fullPo) return fullPo[0].toUpperCase();

  const numeric = compact.match(/^\d{2,6}$/);
  if (numeric) return numeric[0];

  return "";
}

function normalizeDnNumber(value: any) {
  const raw = String(value || "")
    .trim()
    .replace(/^DN\s*[:#-]\s*/i, "DN-")
    .replace(/[),.;]+$/g, "");

  const match = raw.match(/DN[-/ ]?\d{2,6}[-/]\d{2}[-/]\d{2}/i);
  return match ? match[0].replace(/\s+/g, "-").toUpperCase() : "";
}

function normalizeMrnNumber(value: any) {
  const raw = String(value || "")
    .trim()
    .replace(/^MRN\s*[:#-]\s*/i, "MRN-")
    .replace(/[),.;]+$/g, "");

  const match = raw.match(/MRN[-/ ]?[A-Z0-9-]{3,30}/i);
  return match ? match[0].replace(/\s+/g, "-").toUpperCase() : "";
}

function extractPoNumbers(text: string) {
  const fullMatches = text.match(/PO\/KSA\/20\d{2}\/\d{1,6}/gi) || [];
  const numericMatches = extractMatches(
    text,
    /\b(?:PO|P\.?O\.?|Purchase Order|Buyer Order)\s*[:#-]?\s*(\d{2,6})\b/gi
  );

  return unique([...fullMatches, ...numericMatches].map(normalizePoNumber).filter(Boolean));
}

function extractDnNumbers(text: string) {
  const direct = text.match(/\bDN[-/ ]?\d{2,6}[-/]\d{2}[-/]\d{2}\b/gi) || [];

  const labeled = extractMatches(
    text,
    /\b(?:DN|D\.?N\.?|Delivery Note|Delivery No|Delivery Number)\s*[:#-]?\s*([A-Z0-9/-]+)/gi
  );

  return unique([...direct, ...labeled].map(normalizeDnNumber).filter(Boolean));
}

function extractMrnNumbers(text: string) {
  const direct = text.match(/\bMRN[-/ ]?[A-Z0-9-]{3,30}\b/gi) || [];

  const labeled = extractMatches(
    text,
    /\b(?:MRN|M\.?R\.?N\.?|Material Receipt Note|Goods Receipt|GRN)\s*[:#-]?\s*([A-Z0-9/-]+)/gi
  );

  return unique([...direct, ...labeled].map(normalizeMrnNumber).filter(Boolean));
}

function extractDates(text: string) {
  const patterns = [
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
    /\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/g,
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

function extractPossibleLocations(text: string) {
  const known = [
    "KFH Al Ahsa",
    "Al Ahsa",
    "Ahsa",
    "Khobar",
    "Dammam",
    "Jeddah",
    "Riyadh",
    "Makkah",
    "Madinah",
    "Taif",
    "Sabya",
    "Samta",
    "King Faisal",
  ];

  const found: string[] = [];

  for (const location of known) {
    const regex = new RegExp(`\\b${location.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (regex.test(text)) found.push(location);
  }

  return unique(found);
}

function extractPossibleItems(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: any[] = [];

  for (const line of lines) {
    if (line.length < 8) continue;
    if (/mrn|delivery note|purchase order|invoice|date|customer|address/i.test(line)) {
      continue;
    }

    const match =
      line.match(/(.+?)\s+(\d+(?:\.\d+)?)\s*(pcs|pc|box|boxes|each|ea|ctn|carton|bottle|pack|packs|set|sets)?\b/i) ||
      line.match(/(.+?)\s+(qty|quantity)\s*[:=]?\s*(\d+(?:\.\d+)?)/i);

    if (!match) continue;

    const itemName = String(match[1] || "").trim();
    const qty = Number(match[3] || match[2] || 0);
    const unit = String(match[4] || "").trim();

    if (!itemName || !qty) continue;

    items.push({
      item_name: itemName,
      quantity: qty,
      unit,
      source_line: line,
    });
  }

  return items.slice(0, 30);
}

function scoreConfidence(structured: any, textLength: number) {
  let score = 0;

  if (textLength > 40) score += 0.2;
  if (structured.mrn_numbers.length > 0) score += 0.3;
  if (structured.dn_numbers.length > 0) score += 0.25;
  if (structured.po_numbers.length > 0) score += 0.1;
  if (structured.dates.length > 0) score += 0.1;
  if (structured.possible_locations.length > 0) score += 0.05;

  return Number(Math.min(score, 0.95).toFixed(2));
}

function analyzeMrnText(text: string) {
  const cleanedText = String(text || "").replace(/\u0000/g, " ").trim();

  const structured = {
    mrn_numbers: extractMrnNumbers(cleanedText),
    dn_numbers: extractDnNumbers(cleanedText),
    po_numbers: extractPoNumbers(cleanedText),
    dates: extractDates(cleanedText),
    possible_locations: extractPossibleLocations(cleanedText),
    possible_items: extractPossibleItems(cleanedText),
  };

  const confidence = scoreConfidence(structured, cleanedText.length);

  const reviewReasons: string[] = [];

  if (cleanedText.length < 40) reviewReasons.push("OCR text is too short");
  if (structured.mrn_numbers.length === 0) reviewReasons.push("MRN number not found");
  if (structured.dn_numbers.length === 0) reviewReasons.push("DN number not found");
  if (confidence < 0.7) reviewReasons.push("OCR confidence below automation threshold");

  return {
    ...structured,
    confidence,
    human_required: reviewReasons.length > 0,
    review_reasons: reviewReasons,
    recommended_action:
      reviewReasons.length > 0
        ? "Review OCR result manually before syncing MRN"
        : "OCR result looks usable for MRN matching",
  };
}

export async function POST(req: Request) {
  let filePath = "";

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tempDir = path.join(os.tmpdir(), "healthlines-mrn-ocr");
    fs.mkdirSync(tempDir, { recursive: true });

    const safeName = String(file.name || "mrn-file").replace(/[^a-zA-Z0-9._-]/g, "_");

    filePath = path.join(tempDir, `${Date.now()}-${safeName}`);
    fs.writeFileSync(filePath, buffer);

    const ocr = await runOCR(filePath);
    const text = ocr.text || "";
    const structured = analyzeMrnText(text);

    logSystemEvent("mrn_ocr_test_completed", "MRN OCR test completed", {
      filename: file.name,
      text_length: text.length,
      confidence: structured.confidence,
      human_required: structured.human_required,
      mrn_count: structured.mrn_numbers.length,
      dn_count: structured.dn_numbers.length,
    });

    return Response.json({
      success: true,
      filename: file.name,
      file_type: file.type || "",
      text_length: text.length,
      extracted_text: text,
      structured,
      note:
        "OCR test only. This does not update MRN_Log or Delivery_History yet.",
    });
  } catch (error: any) {
    logSystemError("mrn-ocr-test", error);

    return Response.json(
      { success: false, error: error?.message || "MRN OCR test failed" },
      { status: 500 }
    );
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }
  }
}