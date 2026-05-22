import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  query: string;
  onChange: (query: string) => void;
  onClose: () => void;
}

export function SearchBar({ query, onChange, onClose }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索文档内容..."
        className="flex-1 h-7 px-2 text-sm bg-background border rounded focus:outline-none focus:ring-1 focus:ring-ring"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        aria-label="搜索文档内容"
      />
      <Button variant="ghost" size="sm" onClick={onClose} aria-label="关闭搜索">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
