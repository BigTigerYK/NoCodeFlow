import type { DocumentModel } from '@shared/types/document';

interface WordViewerProps {
  doc: DocumentModel;
  searchQuery: string;
}

export function WordViewer({ doc, searchQuery }: WordViewerProps) {
  const pageData = doc.pages[0];
  if (!pageData) {
    return <div className="p-4 text-muted-foreground text-sm">文档内容为空</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-card rounded-lg shadow-sm border p-8">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {pageData.paragraphs.map((para, i) => {
            let className = 'mb-3 leading-relaxed';
            if (para.style === 'heading1') className = 'text-xl font-bold mb-4';
            else if (para.style === 'heading2') className = 'text-lg font-semibold mb-3';
            else if (para.style === 'heading3') className = 'text-base font-semibold mb-2';
            else if (para.style === 'quote') className = 'border-l-4 border-muted pl-4 italic text-muted-foreground mb-3';
            else if (para.style === 'code') className = 'bg-muted p-3 rounded font-mono text-sm mb-3';
            else if (para.style === 'list') className = 'ml-4 mb-1 list-disc';

            return (
              <p
                key={i}
                className={className}
                dangerouslySetInnerHTML={{ __html: highlightText(para.text, searchQuery) }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const escapedQuery = escapeHtml(query);
  const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
