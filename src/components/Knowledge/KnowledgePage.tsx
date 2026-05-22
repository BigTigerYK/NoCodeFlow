import { useEffect, useCallback, useState } from 'react';
import { useDocumentStore } from '@/stores/document';
import { useKnowledgeStore } from '@/stores/knowledge';
import { KnowledgeSearchBar } from './SearchBar';
import { FilterTags } from './FilterTags';
import { DocumentGrid } from './DocumentGrid';
import { DocumentDetail } from './DocumentDetail';
import { ImportDialog } from './ImportDialog';
import { EmptyState } from './EmptyState';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export function KnowledgePage() {
  const { documents, fetchDocuments, importDocuments, isLoading } = useDocumentStore();
  const { showDetail, selectedDocumentId, isImporting, setIsImporting } = useKnowledgeStore();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleImport = useCallback(async (filePaths?: string[]) => {
    setIsImporting(true);
    await importDocuments(filePaths);
    setIsImporting(false);
  }, [importDocuments, setIsImporting]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImport(files.map(f => (f as any).path || f.name));
    }
  }, [handleImport]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div
      className="flex h-full relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h1 className="text-lg font-semibold">知识库</h1>
          <Button onClick={() => handleImport()} disabled={isImporting} size="sm">
            <Upload className="h-4 w-4 mr-2" />
            {isImporting ? '导入中...' : '导入文件'}
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="px-6 py-3 space-y-3 border-b">
          <KnowledgeSearchBar />
          <FilterTags />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              加载中...
            </div>
          ) : documents.length === 0 ? (
            <EmptyState onImport={() => handleImport()} />
          ) : (
            <DocumentGrid />
          )}
        </div>
      </div>

      {/* Detail sidebar */}
      {showDetail && selectedDocumentId && (
        <DocumentDetail documentId={selectedDocumentId} />
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-50 pointer-events-none">
          <div className="text-center">
            <Upload className="h-10 w-10 mx-auto text-primary mb-2" />
            <p className="text-sm font-medium text-primary">释放以导入文件</p>
          </div>
        </div>
      )}

      {/* Import dialog */}
      <ImportDialog />
    </div>
  );
}
