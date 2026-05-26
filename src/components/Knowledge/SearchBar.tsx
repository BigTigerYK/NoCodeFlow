import { Search } from 'lucide-react';
import { useKnowledgeStore } from '@/stores/knowledge';

export function KnowledgeSearchBar() {
  const { searchQuery, setSearchQuery } = useKnowledgeStore();

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="搜索知识库内容..."
        className="w-full h-9 pl-9 pr-3 text-sm bg-muted/50 border rounded-md focus:outline-none focus:ring-1 focus:ring-ring focus:bg-background"
        aria-label="搜索知识库"
      />
    </div>
  );
}
