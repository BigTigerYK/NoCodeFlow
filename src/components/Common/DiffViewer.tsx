import { useMemo } from 'react';
import { diffLines, type Change } from 'diff';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  maxHeight?: string;
  className?: string;
}

function DiffBlock({ change }: { change: Change }) {
  const lines = change.value.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();

  if (change.added) {
    return (
      <>
        {lines.map((line, i) => (
          <div key={i} className="bg-green-500/10 text-green-400 px-2 py-px">
            <span className="select-none text-green-500/50 mr-1">+</span>{line}
          </div>
        ))}
      </>
    );
  }

  if (change.removed) {
    return (
      <>
        {lines.map((line, i) => (
          <div key={i} className="bg-red-500/10 text-red-400 px-2 py-px">
            <span className="select-none text-red-500/50 mr-1">-</span>{line}
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {lines.slice(0, 6).map((line, i) => (
        <div key={i} className="px-2 py-px text-muted-foreground">
          <span className="select-none mr-1"> </span>{line}
        </div>
      ))}
      {lines.length > 6 && (
        <div className="px-2 py-px text-muted-foreground/50">
          ... ({lines.length - 6} 行)
        </div>
      )}
    </>
  );
}

export function DiffViewer({ oldContent, newContent, maxHeight = '256px', className }: DiffViewerProps) {
  const changes = useMemo(() => diffLines(oldContent, newContent), [oldContent, newContent]);
  const hasChanges = changes.some((c) => c.added || c.removed);

  if (!hasChanges) {
    return (
      <div className={cn('p-3 text-sm text-muted-foreground', className)}>
        无差异
      </div>
    );
  }

  // Count added and removed lines
  let added = 0;
  let removed = 0;
  for (const c of changes) {
    const count = c.value.split('\n').length - 1;
    if (c.added) added += count;
    if (c.removed) removed += count;
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-green-400">+{added}</span>
        <span className="text-red-400">-{removed}</span>
      </div>
      <div
        className="text-xs font-mono overflow-auto rounded-md border bg-background"
        style={{ maxHeight }}
      >
        {changes.map((change, i) => (
          <DiffBlock key={i} change={change} />
        ))}
      </div>
    </div>
  );
}
