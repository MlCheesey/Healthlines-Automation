import path from "path";

import {
  parseZipFile,
} from "@/lib/parsers/zipParser";

import {
  parseExcelFile,
} from "@/lib/parsers/excelParser";

import {
  parsePdfFile,
} from "@/lib/parsers/pdfParser";

import {
  runOCR,
} from "@/lib/parsers/ocrParser";

import {
  registerAttachment,
} from "@/lib/system/attachmentRegistry";

export async function POST(
  req: Request
) {
  try {
    const body = await req.json();

    const filePath =
      body.filePath;

    if (!filePath) {
      return Response.json(
        {
          error:
            "filePath required",
        },
        { status: 400 }
      );
    }

    const ext =
      path.extname(
        filePath
      ).toLowerCase();

    let result: any = null;

    if (ext === ".zip") {
      result =
        await parseZipFile(
          filePath
        );
    } else if (
      ext === ".xlsx" ||
      ext === ".xls"
    ) {
      result =
        await parseExcelFile(
          filePath
        );
    } else if (
      ext === ".pdf"
    ) {
      const parsed =
        await parsePdfFile(
          filePath
        );

      let ocr = null;

      if (
        !parsed.extracted_text ||
        parsed.extracted_text
          .trim()
          .length < 30
      ) {
        ocr = await runOCR(
          filePath
        );
      }

      result = {
        ...parsed,
        ocr,
      };
    } else {
      return Response.json(
        {
          error:
            "Unsupported attachment type",
        },
        { status: 400 }
      );
    }

    const registry =
      registerAttachment({
        filename:
          filePath
            .split("\\")
            .pop(),

        type: ext,

        parser_status:
          "parsed",

        path: filePath,
      });

    return Response.json({
      success: true,
      result,
      registry,
    });
  } catch (error: any) {
    return Response.json(
      {
        error:
          error?.message ||
          String(error),
      },
      { status: 500 }
    );
  }
}