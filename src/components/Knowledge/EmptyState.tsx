import { Button } from '@/components/ui/button';
import { BookOpen, Upload } from 'lucide-react';

interface EmptyStateProps {
  onImport: () => void;
}

export function EmptyState({ onImport }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <BookOpen className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <h2 className="text-lg font-semibold mb-2">知识库为空</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        导入 PDF、Word、Markdown 让 AI 理解你的资料
      </p>
      <Button onClick={onImport} size="sm">
        <Upload className="h-4 w-4 mr-2" />
        导入文件
      </Button>
      <p className="text-xs text-muted-foreground mt-4">
        或将文件拖拽到此页面
      </p>
    </div>
  );
}
