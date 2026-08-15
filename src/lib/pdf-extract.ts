// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer, { max: 0 });
    return (data.text ?? "").trim();
  } catch (err: unknown) {
    // Tolerate bad xref / corrupt PDFs — try again with no options
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("XRef") || msg.includes("xref") || msg.includes("Invalid")) {
      try {
        const data = await pdfParse(buffer);
        return (data.text ?? "").trim();
      } catch {
        return "";
      }
    }
    return "";
  }
}
