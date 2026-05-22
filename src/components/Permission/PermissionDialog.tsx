import { useState, useEffect, useCallback, useMemo } from 'react';
import { ShieldAlert, ShieldX, ShieldCheck, FileEdit, Terminal, AlertTriangle } from 'lucide-react';
import { usePermissionStore } from '@/stores/permission';
import { IPC_CHANNELS } from '@shared/types/ipc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DiffViewer } from '@/components/Common/DiffViewer';
import { cn } from '@/lib/utils';

function RiskBadge({ level }: { level: string }) {
  const config = {
    auto_allow: { label: '自动允许', color: 'bg-green-500/12 text-green-400 border-green-500/20', icon: ShieldCheck },
    confirm: { label: '需要确认', color: 'bg-yellow-500/12 text-yellow-400 border-yellow-500/20', icon: ShieldAlert },
    deny: { label: '已阻止', color: 'bg-red-500/12 text-red-400 border-red-500/20', icon: ShieldX },
  };
  const c = config[level as keyof typeof config] || config.confirm;
  const Icon = c.icon;

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-sm border', c.color)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

export function PermissionDialog() {
  const { currentRequest, respond } = usePermissionStore();
  const [remember, setRemember] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);

  useEffect(() => {
    setRemember(false);
    setFileContent(null);
  }, [currentRequest?.id]);

  // Load current file content for diff preview
  useEffect(() => {
    if (!currentRequest?.details.filePath) {
      setFileContent(null);
      return;
    }
    const filePath = currentRequest.details.filePath;
    window.api.invoke(IPC_CHANNELS.FS_READ, { filePath })
      .then((result: unknown) => {
        const r = result as { data?: string; error?: string };
        setFileContent(r.data ?? null);
      })
      .catch(() => setFileContent(null));
  }, [currentRequest?.details.filePath]);

  const newContent = useMemo(() => {
    if (!currentRequest) return null;
    const input = currentRequest.details.input;
    if (!input) return null;
    if (currentRequest.details.toolName === 'Write') {
      return (input.content as string) || null;
    }
    if (currentRequest.details.toolName === 'Edit') {
      const oldStr = (input.old_string as string) || '';
      const newStr = (input.new_string as string) || '';
      if (fileContent && oldStr) {
        return fileContent.replace(oldStr, newStr);
      }
    }
    return null;
  }, [currentRequest, fileContent]);

  const handleAllow = useCallback(() => {
    respond('allow', remember);
  }, [respond, remember]);

  const handleDeny = useCallback(() => {
    respond('deny', remember);
  }, [respond, remember]);

  useEffect(() => {
    if (!currentRequest) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.defaultPrevented) {
        e.preventDefault();
        handleAllow();
      }
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault();
        handleDeny();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRequest, handleAllow, handleDeny]);

  if (!currentRequest) return null;

  const isDeny = currentRequest.riskLevel === 'deny';
  const isFileOp = currentRequest.details.toolName === 'Write' || currentRequest.details.toolName === 'Edit';
  const isCommand = currentRequest.details.toolName === 'Bash';
  const showDiff = isFileOp && fileContent !== null && newContent !== null;

  return (
    <Dialog open={!!currentRequest} onOpenChange={(open) => { if (!open) handleDeny(); }}>
      <DialogContent className="sm:max-w-lg" aria-describedby="permission-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDeny ? (
              <ShieldX className="w-5 h-5 text-destructive" />
            ) : isFileOp ? (
              <FileEdit className="w-5 h-5 text-warning" />
            ) : isCommand ? (
              <Terminal className="w-5 h-5 text-warning" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-warning" />
            )}
            {isDeny ? '操作被阻止' : '权限确认'}
          </DialogTitle>
          <DialogDescription id="permission-description">
            AI 请求执行以下操作
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Risk level badge */}
          <div className="flex items-center gap-2">
            <RiskBadge level={currentRequest.riskLevel} />
            <span className="text-sm text-muted-foreground">{currentRequest.details.toolName}</span>
          </div>

          {/* Description */}
          <p className="text-sm font-medium">{currentRequest.description}</p>

          {/* Details */}
          <div className="bg-muted rounded-md p-3 text-xs space-y-1.5">
            {currentRequest.details.filePath && (
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0">文件：</span>
                <span className="break-all font-mono text-code">{currentRequest.details.filePath}</span>
              </div>
            )}
            {currentRequest.details.command && (
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0">命令：</span>
                <code className="break-all text-code">{currentRequest.details.command}</code>
              </div>
            )}
          </div>

          {/* Diff preview */}
          {showDiff && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">变更预览：</span>
              <DiffViewer oldContent={fileContent!} newContent={newContent!} maxHeight="160px" />
            </div>
          )}

          {/* Remember checkbox */}
          {!isDeny && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="permission-remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="permission-remember" className="text-caption cursor-pointer">
                本次会话不再询问此操作
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDeny}>
            拒绝
          </Button>
          {!isDeny && (
            <Button onClick={handleAllow}>
              允许
            </Button>
          )}
        </DialogFooter>

        {!isDeny && (
          <p className="text-xs text-muted-foreground text-center">
            Enter 允许 · Esc 拒绝
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
