import type { DocumentModel } from '@shared/types/document';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
  doc: DocumentModel;
  searchQuery: string;
}

export function MarkdownViewer({ doc, searchQuery: _searchQuery }: MarkdownViewerProps) {
  const pageData = doc.pages[0];
  if (!pageData) {
    return <div className="p-4 text-muted-foreground text-sm">文档内容为空</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-card rounded-lg shadow-sm border p-8">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {pageData.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
