import * as fs from 'fs';
import type { DocumentModel, DocumentPage, DocumentParagraph } from '@shared/types/document';

export async function parseWord(filePath: string, docId: string, docName: string): Promise<DocumentModel> {
  const mammoth = await import('mammoth');
  const buffer = fs.readFileSync(filePath);

  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;

  const { text, paragraphs } = extractContent(html);
  const pages: DocumentPage[] = [{
    index: 0,
    content: text,
    paragraphs,
  }];

  return {
    id: docId,
    name: docName,
    path: filePath,
    format: 'word',
    metadata: {
      title: docName,
      pageCount: 1,
      wordCount: countWords(text),
    },
    pages,
    chunks: [],
    status: 'ready',
  };
}

function extractContent(html: string): { text: string; paragraphs: DocumentParagraph[] } {
  const paragraphs: DocumentParagraph[] = [];
  let plainText = '';

  const tagRegex = /<(h[1-6]|p|li|blockquote|pre|code)[^>]*>(.*?)<\/\1>/gis;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const content = stripHtml(match[2]).trim();
    if (!content) continue;

    plainText += content + '\n';

    let style: DocumentParagraph['style'] = 'body';
    let level: number | undefined;

    if (tag.startsWith('h')) {
      level = parseInt(tag[1]);
      style = `heading${Math.min(level, 3)}` as DocumentParagraph['style'];
    } else if (tag === 'blockquote') {
      style = 'quote';
    } else if (tag === 'pre' || tag === 'code') {
      style = 'code';
    } else if (tag === 'li') {
      style = 'list';
    }

    paragraphs.push({ text: content, style, level });
  }

  if (paragraphs.length === 0 && html) {
    const text = stripHtml(html).trim();
    if (text) {
      plainText = text;
      paragraphs.push({ text, style: 'body' });
    }
  }

  return { text: plainText, paragraphs };
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function countWords(text: string): number {
  const chinese = text.match(/[一-鿿]/g)?.length || 0;
  const english = text.replace(/[一-鿿]/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
  return chinese + english;
}
