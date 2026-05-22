import type { DocumentModel, DocumentChunk, DocumentParagraph } from '@shared/types/document';
import * as crypto from 'crypto';

const MAX_CHUNK_TOKENS = 500;
const OVERLAP_TOKENS = 50;

export function chunkDocument(doc: DocumentModel): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let globalOffset = 0;

  for (const page of doc.pages) {
    const pageChunks = chunkParagraphs(page.paragraphs, page.index, globalOffset);
    chunks.push(...pageChunks);
    globalOffset += page.content.length + 1;
  }

  return chunks;
}

function chunkParagraphs(
  paragraphs: DocumentParagraph[],
  pageIndex: number,
  baseOffset: number,
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let currentText = '';
  let currentStart = 0;
  let offset = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const paraTokens = estimateTokens(para.text);

    if (isHeading(para) && currentText.trim()) {
      chunks.push(createChunk(currentText, pageIndex, currentStart, offset));
      currentText = '';
      currentStart = offset;
    }

    const combinedTokens = estimateTokens(currentText + ' ' + para.text);
    if (combinedTokens > MAX_CHUNK_TOKENS && currentText.trim()) {
      const overlapText = getOverlapText(currentText);
      chunks.push(createChunk(currentText, pageIndex, currentStart, offset));
      currentText = overlapText + ' ' + para.text;
      currentStart = offset - overlapText.length;
    } else {
      currentText = currentText ? currentText + ' ' + para.text : para.text;
    }

    offset += para.text.length + 1;
  }

  if (currentText.trim()) {
    chunks.push(createChunk(currentText, pageIndex, currentStart, offset));
  }

  return chunks;
}

function createChunk(
  text: string,
  pageIndex: number,
  startOffset: number,
  endOffset: number,
): DocumentChunk {
  return {
    id: crypto.randomBytes(6).toString('hex'),
    pageIndex,
    text: text.trim(),
    startOffset,
    endOffset,
    tokenCount: estimateTokens(text),
  };
}

function estimateTokens(text: string): number {
  const chinese = (text.match(/[一-鿿]/g) || []).length;
  const english = text.replace(/[一-鿿]/g, '').split(/\s+/).filter(w => w.length > 0).length;
  return chinese + Math.ceil(english * 1.3);
}

function isHeading(para: DocumentParagraph): boolean {
  return para.style?.startsWith('heading') ?? false;
}

function getOverlapText(text: string): string {
  const words = text.split(/\s+/);
  const overlapWords = words.slice(-Math.ceil(OVERLAP_TOKENS / 1.3));
  return overlapWords.join(' ');
}
