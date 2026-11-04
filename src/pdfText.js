import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function extractPdfText(file, { maxBytes = 5 * 1024 * 1024, maxPages = 50, maxCharacters = 50000 } = {}) {
  if (!file || !(file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf"))) {
    throw new Error("Please choose a PDF file.");
  }
  if (file.size > maxBytes) throw new Error("Please choose a PDF smaller than 5 MB.");

  let pdf;
  try {
    const buffer = await file.arrayBuffer();
    pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    if (pdf.numPages > maxPages) throw new Error(`This PDF has too many pages. Use a document with ${maxPages} pages or fewer.`);

    let extractedText = "";
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      extractedText += `${content.items.map((item) => item.str).join(" ")}\n`;
      if (extractedText.length > maxCharacters) {
        throw new Error(`This PDF contains more than ${maxCharacters.toLocaleString()} characters. Use a shorter resume.`);
      }
    }
    if (!extractedText.trim()) throw new Error("No readable text found. Try a text-based PDF.");
    return extractedText.trim();
  } finally {
    if (pdf) await pdf.destroy().catch(() => {});
  }
}
