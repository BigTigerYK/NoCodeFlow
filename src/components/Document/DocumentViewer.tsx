import { useDocumentStore } from '@/stores/document';
import type { DocumentModel } from '@shared/types/document';
import { PdfViewer } from './PdfViewer';
import { WordViewer } from './WordViewer';
import { MarkdownViewer } from './MarkdownViewer';
import { PageNavigation } from './PageNavigation';
import { SearchBar } from './SearchBar';
import { useState, useCallback } from 'react';
import { FileText } from 'lucide-react';

export function DocumentViewer() {
  const { documents, currentDocumentId } = useDocumentStore();
  const currentDocument = documents.find(d => d.id === currentDocumentId) || null;
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setShowSearch(true);
    }
    if (e.key === 'Escape') {
      setShowSearch(false);
      setSearchQuery('');
    }
  }, []);

  if (!currentDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <FileText className="h-12 w-12 opacity-30" />
        <p className="text-sm">选择一个文档以开始查看</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown} tabIndex={0}>
      {showSearch && (
        <SearchBar
          query={searchQuery}
          onChange={setSearchQuery}
          onClose={() => { setShowSearch(false); setSearchQuery(''); }}
        />
      )}

      <div className="flex-1 overflow-auto">
        <DocumentContent doc={currentDocument} page={currentPage} searchQuery={searchQuery} />
      </div>

      {currentDocument.pages.length > 1 && (
        <PageNavigation
          currentPage={currentPage}
          totalPages={currentDocument.pages.length}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

function DocumentContent({ doc, page, searchQuery }: { doc: DocumentModel; page: number; searchQuery: string }) {
  switch (doc.format) {
    case 'pdf':
      return <PdfViewer doc={doc} page={page} searchQuery={searchQuery} />;
    case 'word':
      return <WordViewer doc={doc} searchQuery={searchQuery} />;
    case 'markdown':
      return <MarkdownViewer doc={doc} searchQuery={searchQuery} />;
  }
}
