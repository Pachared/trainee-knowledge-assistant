import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export type ExtractedPage = {
  pageNumber: number;
  text: string;
};

export type ExtractedText = {
  text: string;
  pages: ExtractedPage[];
};

type PdfTextContentItem = {
  str?: string;
};

type PdfPageData = {
  pageIndex?: number;
  getTextContent: () => Promise<{ items: PdfTextContentItem[] }>;
};

async function renderPdfPage(pageData: PdfPageData) {
  const textContent = await pageData.getTextContent();
  const text = textContent.items.map((item) => item.str ?? "").join(" ").trim();
  const pageNumber = typeof pageData.pageIndex === "number" ? pageData.pageIndex + 1 : undefined;

  return `${pageNumber ? `\n\n[[PAGE:${pageNumber}]]\n` : "\n\n"}${text}`;
}

function splitPdfPages(text: string): ExtractedPage[] {
  const matches = Array.from(text.matchAll(/\[\[PAGE:(\d+)]]\s*([\s\S]*?)(?=\n\s*\[\[PAGE:\d+]]|$)/g));

  if (!matches.length) {
    return [{ pageNumber: 1, text: text.trim() }];
  }

  return matches
    .map((match) => ({
      pageNumber: Number(match[1]),
      text: (match[2] ?? "").trim()
    }))
    .filter((page) => page.text);
}

export async function extractTextWithPagesFromFile(buffer: Buffer, mimeType: string): Promise<ExtractedText> {
  if (mimeType === "application/pdf") {
    const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
      data: Buffer,
      options?: { pagerender?: (pageData: PdfPageData) => Promise<string> }
    ) => Promise<{ text: string }>;

    if (!pdfParse) {
      throw new Error("ไม่สามารถโหลดตัวอ่าน PDF ได้");
    }

    const parsed = await pdfParse(buffer, { pagerender: renderPdfPage });
    const pages = splitPdfPages(parsed.text);

    return {
      text: pages.map((page) => page.text).join("\n\n"),
      pages
    };
  }

  const text = buffer.toString("utf8");

  return {
    text,
    pages: [{ pageNumber: 1, text }]
  };
}

export async function extractTextFromFile(buffer: Buffer, mimeType: string) {
  return (await extractTextWithPagesFromFile(buffer, mimeType)).text;
}
