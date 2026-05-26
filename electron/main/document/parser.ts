import * as path from 'path';
import * as crypto from 'crypto';
import type { DocumentModel, DocumentFormat } from '@shared/types/document';
import { detectDocumentFormat } from '@shared/types/document';
import { parsePdf } from './pdf-parser';
import { parseWord } from './word-parser';
import { parseMarkdown } from './markdown-parser';

export async function parseDocument(filePath: string): Promise<DocumentModel> {
  const format = detectDocumentFormat(filePath);
  if (!format) {
    throw new Error(`Unsupported document format: ${path.extname(filePath)}`);
  }

  const docName = path.basename(filePath);
  const docId = crypto.createHash('md5').update(filePath).digest('hex').slice(0, 12);

  try {
    switch (format) {
      case 'pdf':
        return await parsePdf(filePath, docId, docName);
      case 'word':
        return await parseWord(filePath, docId, docName);
      case 'markdown':
        return await parseMarkdown(filePath, docId, docName);
    }
  } catch (err: any) {
    return {
      id: docId,
      name: docName,
      path: filePath,
      format,
      metadata: { title: docName, pageCount: 0, wordCount: 0 },
      pages: [],
      chunks: [],
      status: 'error',
      error: err.message || String(err),
    };
  }
}
