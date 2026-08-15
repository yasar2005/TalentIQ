export async function extractPdfText(buffer: Buffer): Promise<string> {
  // Use pdf-parse direct lib path to avoid Vercel serverless test-file issue
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
  try {
    const data = await pdfParse(buffer);
    return (data.text ?? "").trim();
  } catch {
    return "";
  }
}
