export async function GET() {
  return Response.json({
    success: true,
    parsers: {
      pdf_parser: true,
      ocr_parser: true,
      excel_parser: true,
      zip_parser: true,
    },
    note: "Parsers are installed locally. Gmail attachment download connects after OAuth.",
  });
}