import { useRef } from 'react';
import type { DocumentModel } from '@shared/types/document';

interface PdfViewerProps {
  doc: DocumentModel;
  page: number;
  searchQuery: string;
}

export function PdfViewer({ doc, page, searchQuery }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const pageData = doc.pages[page];
  if (!pageData) {
    return <div className="p-4 text-muted-foreground text-sm">页面不存在</div>;
  }

  return (
    <div ref={containerRef} className="p-6 max-w-3xl mx-auto">
      <div className="bg-card rounded-lg shadow-sm border p-8 min-h-[600px]">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {pageData.paragraphs.map((para, i) => (
            <p
              key={i}
              className={
                para.style === 'heading1' ? 'text-xl font-bold mb-4' :
                para.style === 'heading2' ? 'text-lg font-semibold mb-3' :
                para.style === 'heading3' ? 'text-base font-semibold mb-2' :
                para.style === 'quote' ? 'border-l-4 border-muted pl-4 italic text-muted-foreground mb-3' :
                para.style === 'code' ? 'bg-muted p-3 rounded font-mono text-sm mb-3' :
                para.style === 'list' ? 'ml-4 mb-1' :
                'mb-3 leading-relaxed'
              }
              dangerouslySetInnerHTML={{ __html: highlightText(para.text, searchQuery) }}
            />
          ))}
        </div>
      </div>
      <div className="text-center text-xs text-muted-foreground mt-4">
        第 {page + 1} 页 / 共 {doc.metadata.pageCount} 页
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
