import type { DocumentModel } from '@shared/types/document';
import { answerQuestion } from './summarizer';

export interface QAResult {
  answer: string;
  sources: Array<{
    documentId: string;
    documentName: string;
    excerpt: string;
  }>;
}

export async function documentQA(
  docs: DocumentModel[],
  question: string,
  apiBaseUrl?: string,
  apiKey?: string,
): Promise<QAResult> {
  if (docs.length === 0) {
    return { answer: '请先关联至少一个文档。', sources: [] };
  }

  if (docs.length === 1) {
    const answer = await answerQuestion(docs[0], question, apiBaseUrl, apiKey);
    return {
      answer,
      sources: [{
        documentId: docs[0].id,
        documentName: docs[0].name,
        excerpt: findRelevantExcerpt(docs[0], question),
      }],
    };
  }

  // Multi-document: combine content
  const combinedContent = docs.map(d => {
    const content = d.pages.map(p => p.content).join('\n').slice(0, 2000);
    return `【${d.name}】\n${content}`;
  }).join('\n\n---\n\n');

  const prompt = `基于以下多个文档内容回答用户问题。请在回答中标注引用来源（使用 [文档名] 格式）。

${combinedContent}

用户问题：${question}`;

  // Use first doc's agent config
  const answer = await answerQuestion(docs[0], prompt.replace(docs[0].pages.map(p => p.content).join('\n\n').slice(0, 6000), combinedContent), apiBaseUrl, apiKey);

  return {
    answer,
    sources: docs.map(d => ({
      documentId: d.id,
      documentName: d.name,
      excerpt: findRelevantExcerpt(d, question),
    })),
  };
}

function findRelevantExcerpt(doc: DocumentModel, question: string): string {
  const keywords = question.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  let bestExcerpt = '';
  let bestScore = 0;

  for (const page of doc.pages) {
    for (const para of page.paragraphs) {
      const text = para.text.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestExcerpt = para.text;
      }
    }
  }

  return bestExcerpt.slice(0, 200) || doc.name;
}
