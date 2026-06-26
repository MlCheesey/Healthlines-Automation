import fs from "fs";
import path from "path";
import Tesseract from "tesseract.js";

function isPdf(filePath: string) {
  return path.extname(filePath).toLowerCase() === ".pdf";
}

export async function runOCR(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error("OCR file not found");
  }

  if (isPdf(filePath)) {
    return {
      success: false,
      text: "",
      skipped: true,
      reason:
        "Direct OCR for scanned PDF is not supported by this local OCR parser yet. PDF text parser should run first; scanned PDF page-image OCR will be added separately.",
    };
  }

  const result = await Tesseract.recognize(filePath, "eng");

  return {
    success: true,
    text: result.data.text || "",
    confidence: result.data.confidence ?? null,
  };
}