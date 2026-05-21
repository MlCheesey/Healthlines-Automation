import fs from "fs";
import Tesseract from "tesseract.js";

export async function runOCR(
  filePath: string
) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      "OCR file not found"
    );
  }

  const result =
    await Tesseract.recognize(
      filePath,
      "eng"
    );

  return {
    success: true,
    text:
      result.data.text || "",
  };
}