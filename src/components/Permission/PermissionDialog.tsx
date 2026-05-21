import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, ShieldX } from 'lucide-react';
import { usePermissionStore } from '@/stores/permission';
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
import { cn } from '@/lib/utils';

export function PermissionDialog() {
  const { currentRequest, respond } = usePermissionStore();
  const [remember, setRemember] = useState(false);

  // Reset remember when a new request comes in
  useEffect(() => {
    setRemember(false);
  }, [currentRequest?.id]);

  const handleAllow = useCallback(() => {
    respond('allow', remember);
  }, [respond, remember]);

  const handleDeny = useCallback(() => {
    respond('deny', remember);
  }, [respond, remember]);

  // Keyboard shortcuts
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
  const riskColor = isDeny ? 'text-destructive' : 'text-yellow-500';
  const RiskIcon = isDeny ? ShieldX : ShieldAlert;

  return (
    <Dialog open={!!currentRequest} onOpenChange={(open) => { if (!open) handleDeny(); }}>
      <DialogContent className="sm:max-w-md" aria-describedby="permission-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiskIcon className={cn('w-5 h-5', riskColor)} />
            {isDeny ? '操作被阻止' : '权限确认'}
          </DialogTitle>
          <DialogDescription id="permission-description">
            AI 请求执行以下操作
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm font-medium">{currentRequest.description}</p>

          <div className="bg-muted rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex gap-2">
              <span className="text-muted-foreground shrink-0">工具：</span>
              <span>{currentRequest.details.toolName}</span>
            </div>
            {currentRequest.details.filePath && (
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0">文件：</span>
                <span className="break-all">{currentRequest.details.filePath}</span>
              </div>
            )}
            {currentRequest.details.command && (
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0">命令：</span>
                <code className="break-all">{currentRequest.details.command}</code>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="permission-remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="permission-remember" className="text-sm cursor-pointer">
              本次会话不再询问
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDeny}>
            拒绝
          </Button>
          <Button onClick={handleAllow} variant={isDeny ? 'destructive' : 'default'}>
            允许
          </Button>
        </DialogFooter>

        <p className="text-xs text-muted-foreground text-center">
          Enter 允许 · Esc 拒绝
        </p>
      </DialogContent>
    </Dialog>
  );
}
