import { XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-muted-foreground', className)}>
      <XCircle className="h-8 w-8 text-destructive mb-3" />
      <p className="text-sm mb-4 text-center max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          重试
        </Button>
      )}
    </div>
  );
}
