import type { DocumentModel } from '@shared/types/document';
import { ClaudeAdapter } from '../agent/claude-adapter';
import type { AgentOutputEvent } from '../agent/types';

const summaryCache = new Map<string, string>();

export async function generateSummary(
  doc: DocumentModel,
  apiBaseUrl?: string,
  apiKey?: string,
): Promise<string> {
  const cached = summaryCache.get(doc.id);
  if (cached) return cached;

  const content = doc.pages.map(p => p.content).join('\n\n').slice(0, 6000);
  const prompt = `请为以下文档生成一份简洁的中文摘要（200-400字），包括：
1. 文档主题
2. 主要观点或结论
3. 关键信息点

文档名称：${doc.name}
文档内容：
${content}`;

  const summary = await callAgent(prompt, apiBaseUrl, apiKey);
  summaryCache.set(doc.id, summary);
  return summary;
}

export async function answerQuestion(
  doc: DocumentModel,
  question: string,
  apiBaseUrl?: string,
  apiKey?: string,
): Promise<string> {
  const content = doc.pages.map(p => p.content).join('\n\n').slice(0, 6000);
  const prompt = `基于以下文档内容回答用户问题。如果文档中没有相关信息，请明确说明。

文档名称：${doc.name}
文档内容：
${content}

用户问题：${question}`;

  return callAgent(prompt, apiBaseUrl, apiKey);
}

function callAgent(prompt: string, apiBaseUrl?: string, apiKey?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let result = '';
    const adapter = new ClaudeAdapter({
      workspacePath: process.cwd(),
      apiBaseUrl: apiBaseUrl || '',
      apiKey: apiKey || '',
      maxTurns: 1,
      timeoutMs: 60000,
    });

    adapter.onOutput((event: AgentOutputEvent) => {
      if (event.type === 'text') {
        const data = event.data as any;
        if (data.delta?.text) result += data.delta.text;
      }
    });

    adapter.onStatusChange((status) => {
      if (status === 'completed') resolve(result);
      if (status === 'error') reject(new Error('Agent failed'));
    });

    adapter.send(prompt).catch(reject);
  });
}

export function clearSummaryCache(docId?: string) {
  if (docId) {
    summaryCache.delete(docId);
  } else {
    summaryCache.clear();
  }
}
