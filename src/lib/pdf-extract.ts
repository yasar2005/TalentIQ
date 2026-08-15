export async function extractPdfText(buffer: Buffer): Promise<string> {
  // Dynamically import so Next.js doesn't try to bundle the worker
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // No worker needed in Node.js
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjs as any).GlobalWorkerOptions.workerSrc = "";

  const uint8 = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data: uint8,
    stopAtErrors: false,   // keep going on xref errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) pages.push(text);
  }

  return pages.join("\n\n").trim();
}
