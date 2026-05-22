import type { SnapshotMetadata } from '@shared/types/snapshot';
import { DiffViewer } from '@/components/Common/DiffViewer';

interface SnapshotDiffViewProps {
  metadata: SnapshotMetadata;
  snapshotContent: string;
  currentContent: string | null;
}

export function SnapshotDiffView({ metadata, snapshotContent, currentContent }: SnapshotDiffViewProps) {
  if (!metadata.fileExisted) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        文件在 AI 修改前不存在（AI 新建了此文件）。恢复将删除该文件。
      </div>
    );
  }

  if (currentContent === null) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        无法读取当前文件内容。
      </div>
    );
  }

  return <DiffViewer oldContent={snapshotContent} newContent={currentContent} maxHeight="256px" />;
}
