import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PageNavigation({ currentPage, totalPages, onPageChange }: PageNavigationProps) {
  const [inputPage, setInputPage] = useState('');

  const handleJump = () => {
    const num = parseInt(inputPage, 10);
    if (num >= 1 && num <= totalPages) {
      onPageChange(num - 1);
      setInputPage('');
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 py-2 border-t bg-muted/30">
      <Button
        variant="ghost"
        size="sm"
        disabled={currentPage <= 0}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1 text-sm">
        <input
          type="text"
          className="w-10 h-7 text-center bg-background border rounded text-xs"
          value={inputPage || (currentPage + 1).toString()}
          onChange={(e) => setInputPage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJump()}
          onBlur={() => setInputPage('')}
          aria-label="页码"
        />
        <span className="text-muted-foreground">/ {totalPages}</span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
