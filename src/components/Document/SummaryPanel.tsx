import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';
import { IPC_CHANNELS } from '@shared/types/ipc';

interface SummaryPanelProps {
  documentId: string;
}

export function SummaryPanel({ documentId }: SummaryPanelProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.invoke(IPC_CHANNELS.DOCUMENT_SUMMARIZE, { documentId }) as { data?: { summary: string }; error?: string };
      if (result.error) throw new Error(result.error);
      setSummary(result.data?.summary || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          文档摘要
        </h3>
        {summary && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {isCollapsed ? '展开' : '收起'}
          </button>
        )}
      </div>

      {!summary && !isLoading && (
        <Button variant="outline" size="sm" onClick={handleGenerate} className="w-full">
          生成摘要
        </Button>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">正在生成摘要...</span>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {summary && !isCollapsed && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {summary}
        </p>
      )}
    </div>
  );
}
