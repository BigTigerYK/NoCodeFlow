import type { DocumentModel, DocumentChunk } from '@shared/types/document';

const MAX_CONTEXT_TOKENS = 4000;

export interface DocumentContext {
  documents: Array<{
    id: string;
    name: string;
    summary: string;
    chunks: DocumentChunk[];
  }>;
  totalTokens: number;
  truncated: boolean;
}

export function buildDocumentContext(
  docs: DocumentModel[],
  query?: string,
  maxTokens: number = MAX_CONTEXT_TOKENS,
): DocumentContext {
  let totalTokens = 0;
  let truncated = false;
  const result: DocumentContext['documents'] = [];

  for (const doc of docs) {
    if (totalTokens >= maxTokens) {
      truncated = true;
      break;
    }

    const summary = generateQuickSummary(doc);
    const summaryTokens = estimateTokens(summary);
    totalTokens += summaryTokens;

    const relevantChunks = query
      ? findRelevantChunks(doc.chunks, query)
      : doc.chunks.slice(0, 3);

    const selectedChunks: DocumentChunk[] = [];
    for (const chunk of relevantChunks) {
      if (totalTokens + chunk.tokenCount > maxTokens) {
        truncated = true;
        break;
      }
      selectedChunks.push(chunk);
      totalTokens += chunk.tokenCount;
    }

    result.push({
      id: doc.id,
      name: doc.name,
      summary,
      chunks: selectedChunks,
    });
  }

  return { documents: result, totalTokens, truncated };
}

export function formatContextForPrompt(context: DocumentContext): string {
  if (context.documents.length === 0) return '';

  let prompt = '## 参考文档\n\n';

  for (let i = 0; i < context.documents.length; i++) {
    const doc = context.documents[i];
    prompt += `### [${i + 1}] ${doc.name}\n`;
    prompt += `摘要：${doc.summary}\n\n`;

    if (doc.chunks.length > 0) {
      prompt += '相关内容：\n';
      for (const chunk of doc.chunks) {
        prompt += `> ${chunk.text}\n\n`;
      }
    }
  }

  if (context.truncated) {
    prompt += '（部分内容因长度限制被截断）\n\n';
  }

  return prompt;
}

function findRelevantChunks(chunks: DocumentChunk[], query: string): DocumentChunk[] {
  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);

  return chunks
    .map(chunk => {
      const text = chunk.text.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) score++;
      }
      return { chunk, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.chunk);
}

function generateQuickSummary(doc: DocumentModel): string {
  const firstPage = doc.pages[0];
  if (!firstPage) return doc.name;

  const headings = firstPage.paragraphs
    .filter(p => p.style?.startsWith('heading'))
    .map(p => p.text)
    .slice(0, 3);

  if (headings.length > 0) return headings.join(' > ');

  const firstBody = firstPage.paragraphs.find(p => p.style === 'body');
  return firstBody ? firstBody.text.slice(0, 100) + '...' : doc.name;
}

function estimateTokens(text: string): number {
  const chinese = (text.match(/[一-鿿]/g) || []).length;
  const english = text.replace(/[一-鿿]/g, '').split(/\s+/).filter(w => w.length > 0).length;
  return chinese + Math.ceil(english * 1.3);
}
