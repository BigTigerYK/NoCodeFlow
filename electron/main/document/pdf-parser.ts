import { readFile } from 'fs/promises';
import type { DocumentModel, DocumentPage, DocumentParagraph } from '@shared/types/document';

export async function parsePdf(filePath: string, docId: string, docName: string): Promise<DocumentModel> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  const buffer = await readFile(filePath);
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true });
  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;
  const pages: DocumentPage[] = [];
  let fullText = '';

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');

    fullText += pageText + '\n';

    const paragraphs = extractParagraphs(pageText);
    pages.push({
      index: i - 1,
      content: pageText,
      paragraphs,
    });
  }

  const metadata = await pdfDoc.getMetadata();
  const info = (metadata as any)?.info || {};

  return {
    id: docId,
    name: docName,
    path: filePath,
    format: 'pdf',
    metadata: {
      title: info.Title || docName,
      author: info.Author || undefined,
      createdAt: info.CreationDate || undefined,
      pageCount,
      wordCount: countWords(fullText),
    },
    pages,
    chunks: [],
    status: 'ready',
  };
}

function extractParagraphs(text: string): DocumentParagraph[] {
  if (!text.trim()) return [];

  const lines = text.split(/\n/).filter(l => l.trim());
  return lines.map(line => {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      return {
        text: headingMatch[2],
        style: `heading${level}` as DocumentParagraph['style'],
        level,
      };
    }
    return { text: trimmed, style: 'body' as const };
  });
}

function countWords(text: string): number {
  const chinese = text.match(/[一-鿿]/g)?.length || 0;
  const english = text.replace(/[一-鿿]/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
  return chinese + english;
}
