import { useEffect } from 'react';
import { useDocumentStore } from '@/stores/document';
import { X, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function DocumentSelector({ selectedIds, onChange }: DocumentSelectorProps) {
  const { documents, fetchDocuments } = useDocumentStore();

  useEffect(() => {
    if (documents.length === 0) fetchDocuments();
  }, []);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedDocs = documents.filter(d => selectedIds.includes(d.id));

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {selectedDocs.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedDocs.map(doc => (
            <span
              key={doc.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-accent-soft rounded-full"
            >
              {doc.name}
              <button
                onClick={() => toggle(doc.id)}
                className="hover:text-destructive"
                aria-label={`移除 ${doc.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <div className="relative group">
        <button
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="关联文档"
        >
          <Paperclip className="h-3.5 w-3.5" />
          关联文档
        </button>

        {documents.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-64 bg-popover border rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 max-h-48 overflow-auto">
            {documents.map(doc => (
              <button
                key={doc.id}
                onClick={() => toggle(doc.id)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2',
                  selectedIds.includes(doc.id) && 'bg-accent-soft'
                )}
              >
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  doc.format === 'pdf' ? 'bg-red-500' :
                  doc.format === 'word' ? 'bg-blue-500' : 'bg-green-500'
                )} />
                <span className="truncate">{doc.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
