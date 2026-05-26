import type { DocumentModel } from '@shared/types/document';
import { useKnowledgeStore } from '@/stores/knowledge';
import { FileText, FileCode, File } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatConfig = {
  pdf: { label: 'PDF', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: FileText },
  word: { label: 'DOC', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: File },
  markdown: { label: 'MD', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: FileCode },
};

interface DocumentCardProps {
  doc: DocumentModel;
}

export function DocumentCard({ doc }: DocumentCardProps) {
  const { setSelectedDocument, selectedDocumentId } = useKnowledgeStore();
  const config = formatConfig[doc.format];
  const Icon = config.icon;
  const isSelected = selectedDocumentId === doc.id;

  return (
    <button
      onClick={() => setSelectedDocument(doc.id)}
      className={cn(
        'group flex flex-col p-4 rounded-lg border bg-card text-left transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <Icon className="h-8 w-8 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded', config.color)}>
          {config.label}
        </span>
      </div>

      <h3 className="text-sm font-medium line-clamp-2 mb-2 group-hover:text-foreground transition-colors">
        {doc.name}
      </h3>

      <div className="mt-auto flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{doc.metadata.pageCount} 页</span>
        <span>·</span>
        <span>{doc.metadata.wordCount} 字</span>
        {doc.metadata.author && (
          <>
            <span>·</span>
            <span>{doc.metadata.author}</span>
          </>
        )}
      </div>
    </button>
  );
}
