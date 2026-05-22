import { useKnowledgeStore } from '@/stores/knowledge';
import { DocumentCard } from './DocumentCard';

export function DocumentGrid() {
  const { getFilteredDocuments } = useKnowledgeStore();
  const documents = getFilteredDocuments();

  if (documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        没有匹配的文档
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map(doc => (
        <DocumentCard key={doc.id} doc={doc} />
      ))}
    </div>
  );
}
