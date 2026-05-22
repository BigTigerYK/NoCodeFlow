import type { DocumentModel, DocumentMetadata } from '@shared/types/document';

export function extractMetadata(doc: DocumentModel): DocumentMetadata {
  return {
    title: doc.metadata.title || extractTitleFromContent(doc),
    author: doc.metadata.author,
    createdAt: doc.metadata.createdAt,
    pageCount: doc.pages.length,
    wordCount: doc.metadata.wordCount || countTotalWords(doc),
    language: detectLanguage(doc),
  };
}

function extractTitleFromContent(doc: DocumentModel): string {
  for (const page of doc.pages) {
    for (const para of page.paragraphs) {
      if (para.style === 'heading1' && para.text.trim()) {
        return para.text.trim();
      }
    }
  }
  return doc.name.replace(/\.[^.]+$/, '');
}

function countTotalWords(doc: DocumentModel): number {
  let total = 0;
  for (const page of doc.pages) {
    for (const para of page.paragraphs) {
      const chinese = (para.text.match(/[一-鿿]/g) || []).length;
      const english = para.text.replace(/[一-鿿]/g, '').split(/\s+/).filter(w => w.length > 0).length;
      total += chinese + english;
    }
  }
  return total;
}

function detectLanguage(doc: DocumentModel): string {
  let sample = '';
  for (const page of doc.pages) {
    sample += page.content.slice(0, 500);
    if (sample.length > 1000) break;
  }

  const chineseCount = (sample.match(/[一-鿿]/g) || []).length;
  const totalCount = sample.replace(/\s/g, '').length;

  if (totalCount === 0) return 'unknown';
  const chineseRatio = chineseCount / totalCount;
  if (chineseRatio > 0.3) return 'zh';
  return 'en';
}
