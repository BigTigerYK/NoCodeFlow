import { describe, it, expect } from 'vitest';
import { chunkDocument } from '../chunker';
import type { DocumentModel, DocumentParagraph } from '@shared/types/document';

function makeDoc(paragraphs: DocumentParagraph[]): DocumentModel {
  return {
    id: 'test-doc',
    name: 'test.md',
    path: '/test.md',
    format: 'markdown',
    metadata: { pageCount: 1, wordCount: 100 },
    pages: [{ index: 0, content: paragraphs.map((p) => p.text).join('\n'), paragraphs }],
    chunks: [],
    status: 'ready',
  };
}

describe('chunkDocument', () => {
  it('returns empty array for empty document', () => {
    const doc = makeDoc([]);
    expect(chunkDocument(doc)).toEqual([]);
  });

  it('returns single chunk for short document', () => {
    const doc = makeDoc([{ text: 'Hello world', style: 'body' }]);
    const chunks = chunkDocument(doc);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe('Hello world');
    expect(chunks[0].pageIndex).toBe(0);
  });

  it('splits on heading boundaries', () => {
    const doc = makeDoc([
      { text: 'Intro paragraph', style: 'body' },
      { text: 'Section One', style: 'heading1', level: 1 },
      { text: 'Content of section one', style: 'body' },
    ]);
    const chunks = chunkDocument(doc);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('splits when multiple paragraphs exceed MAX_CHUNK_TOKENS', () => {
    // chunker splits between paragraphs, not within a single paragraph
    // each paragraph ~13 words → ~17 tokens, need ~30 paragraphs to exceed 500
    const paragraphs: DocumentParagraph[] = Array.from({ length: 40 }, (_, i) => ({
      text: `Paragraph ${i} with enough words to accumulate tokens across multiple paragraphs for splitting`,
      style: 'body' as const,
    }));
    const doc = makeDoc(paragraphs);
    const chunks = chunkDocument(doc);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('produces chunks from multiple pages with correct pageIndex', () => {
    const doc: DocumentModel = {
      id: 'multi-page',
      name: 'multi.md',
      path: '/multi.md',
      format: 'markdown',
      metadata: { pageCount: 2, wordCount: 100 },
      pages: [
        { index: 0, content: 'Page one content', paragraphs: [{ text: 'Page one content', style: 'body' }] },
        { index: 1, content: 'Page two content', paragraphs: [{ text: 'Page two content', style: 'body' }] },
      ],
      chunks: [],
      status: 'ready',
    };
    const chunks = chunkDocument(doc);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].pageIndex).toBe(0);
    expect(chunks[1].pageIndex).toBe(1);
  });

  it('generates unique chunk ids', () => {
    const longText = 'word '.repeat(600);
    const doc = makeDoc([{ text: longText, style: 'body' }]);
    const chunks = chunkDocument(doc);
    const ids = chunks.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('estimates token count for mixed CJK and English', () => {
    const doc = makeDoc([{ text: '你好 world 世界 test', style: 'body' }]);
    const chunks = chunkDocument(doc);
    expect(chunks[0].tokenCount).toBeGreaterThan(0);
  });
});
