import { useKnowledgeStore } from '@/stores/knowledge';
import type { DocumentFormat } from '@shared/types/document';
import { cn } from '@/lib/utils';

const filters: { label: string; value: DocumentFormat | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: 'PDF', value: 'pdf' },
  { label: 'Word', value: 'word' },
  { label: 'Markdown', value: 'markdown' },
];

export function FilterTags() {
  const { filterFormat, setFilterFormat } = useKnowledgeStore();

  return (
    <div className="flex gap-2">
      {filters.map(f => (
        <button
          key={f.value}
          onClick={() => setFilterFormat(f.value)}
          className={cn(
            'px-3 py-1 text-xs rounded-full border transition-colors',
            filterFormat === f.value
              ? 'bg-accent-soft border-accent text-accent-foreground'
              : 'bg-background border-input text-muted-foreground hover:bg-muted'
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
