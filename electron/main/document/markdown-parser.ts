import * as fs from 'fs';
import type { DocumentModel, DocumentPage, DocumentParagraph } from '@shared/types/document';

export async function parseMarkdown(filePath: string, docId: string, docName: string): Promise<DocumentModel> {
  const { marked } = await import('marked');
  const rawText = fs.readFileSync(filePath, 'utf-8');
  const paragraphs = extractMarkdownParagraphs(rawText);
  const wordCount = countWords(rawText);

  const pages: DocumentPage[] = [{
    index: 0,
    content: rawText,
    paragraphs,
  }];

  return {
    id: docId,
    name: docName,
    path: filePath,
    format: 'markdown',
    metadata: {
      title: docName.replace(/\.md$/i, ''),
      pageCount: 1,
      wordCount,
    },
    pages,
    chunks: [],
    status: 'ready',
  };
}

function extractMarkdownParagraphs(text: string): DocumentParagraph[] {
  const lines = text.split('\n');
  const paragraphs: DocumentParagraph[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        paragraphs.push({ text: codeBuffer.join('\n'), style: 'code' });
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      paragraphs.push({
        text: headingMatch[2],
        style: `heading${level}` as DocumentParagraph['style'],
        level,
      });
      continue;
    }

    if (trimmed.startsWith('>')) {
      paragraphs.push({ text: trimmed.replace(/^>\s*/, ''), style: 'quote' });
      continue;
    }

    if (trimmed.match(/^[-*+]\s/) || trimmed.match(/^\d+\.\s/)) {
      paragraphs.push({ text: trimmed.replace(/^[-*+\d.]\s+/, ''), style: 'list' });
      continue;
    }

    paragraphs.push({ text: trimmed, style: 'body' });
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    paragraphs.push({ text: codeBuffer.join('\n'), style: 'code' });
  }

  return paragraphs;
}

function countWords(text: string): number {
  const chinese = text.match(/[一-鿿]/g)?.length || 0;
  const english = text.replace(/[一-鿿]/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
  return chinese + english;
}
