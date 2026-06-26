import path from "path";

import { parseZipFile } from "@/lib/parsers/zipParser";
import { parseExcelFile } from "@/lib/parsers/excelParser";
import { parsePdfFile } from "@/lib/parsers/pdfParser";
import { runOCR } from "@/lib/parsers/ocrParser";
import { registerAttachment } from "@/lib/system/attachmentRegistry";
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

function analyzeOperationalAttachmentText(text: string) {
  const cleanedText = String(text || "").replace(/\u0000/g, " ").trim();

  const structured = {
    mrn_numbers: extractMrnNumbers(cleanedText),
    dn_numbers: extractDnNumbers(cleanedText),
    po_numbers: extractPoNumbers(cleanedText),
    dates: extractDates(cleanedText),
    possible_locations: extractPossibleLocations(cleanedText),
  };

  let confidence = 0;

  if (cleanedText.length > 40) confidence += 0.2;
  if (structured.mrn_numbers.length > 0) confidence += 0.3;
  if (structured.dn_numbers.length > 0) confidence += 0.25;
  if (structured.po_numbers.length > 0) confidence += 0.1;
  if (structured.dates.length > 0) confidence += 0.1;
  if (structured.possible_locations.length > 0) confidence += 0.05;

  confidence = Number(Math.min(confidence, 0.95).toFixed(2));

  const reviewReasons: string[] = [];

  if (cleanedText.length < 40) reviewReasons.push("Attachment text is too short");
  if (structured.mrn_numbers.length === 0) reviewReasons.push("MRN number not found");
  if (structured.dn_numbers.length === 0) reviewReasons.push("DN number not found");
  if (confidence < 0.7) reviewReasons.push("Attachment confidence below automation threshold");

  return {
    ...structured,
    confidence,
    human_required: reviewReasons.length > 0,
    review_reasons: reviewReasons,
    recommended_action:
      reviewReasons.length > 0
        ? "Review attachment extraction manually"
        : "Attachment extraction looks usable for MRN matching",
  };
}

function bestTextFromResult(result: any) {
  return (
    result?.extracted_text ||
    result?.text ||
    result?.ocr?.text ||
    result?.raw_text ||
    ""
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const filePath = body.filePath || body.path || body.local_path;

    if (!filePath) {
      return Response.json(
        {
          success: false,
          error: "filePath required",
        },
        { status: 400 }
      );
    }

    const ext = path.extname(filePath).toLowerCase();

    let result: any = null;
    let parser = "";

    if (ext === ".zip") {
      parser = "zip";
      result = await parseZipFile(filePath);
    } else if (ext === ".xlsx" || ext === ".xls") {
      parser = "excel";
      result = await parseExcelFile(filePath);
    } else if (ext === ".pdf") {
      parser = "pdf";
      const parsed = await parsePdfFile(filePath);

      let ocr = null;

      if (!parsed.extracted_text || parsed.extracted_text.trim().length < 30) {
        ocr = await runOCR(filePath);
      }

      result = {
        ...parsed,
        ocr,
      };
    } else if (
      ext === ".png" ||
      ext === ".jpg" ||
      ext === ".jpeg" ||
      ext === ".webp" ||
      ext === ".tif" ||
      ext === ".tiff"
    ) {
      parser = "ocr";
      result = await runOCR(filePath);
    } else {
      return Response.json(
        {
          success: false,
          error: "Unsupported attachment type",
          ext,
        },
        { status: 400 }
      );
    }

    const extractedText = bestTextFromResult(result);
    const structured = analyzeOperationalAttachmentText(extractedText);

    const registry = registerAttachment({
      filename: filePath.split("\\").pop() || filePath.split("/").pop() || filePath,
      type: ext,
      parser_status: "parsed",
      path: filePath,
    });

    logSystemEvent("attachment_analyzed", "Attachment analyzed", {
      filePath,
      ext,
      parser,
      text_length: extractedText.length,
      confidence: structured.confidence,
      human_required: structured.human_required,
      mrn_count: structured.mrn_numbers.length,
      dn_count: structured.dn_numbers.length,
    });

    return Response.json({
      success: true,
      parser,
      filePath,
      ext,
      result,
      extracted_text: extractedText,
      structured,
      registry,
    });
  } catch (error: any) {
    logSystemError("analyze-attachment", error);

    return Response.json(
      {
        success: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}