import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useSetupStore } from '@/stores/setup';

interface DependencySetupProps {
  onReady: () => void;
}

export function DependencySetup({ onReady }: DependencySetupProps) {
  const { phase, logs, error, checkAndInstall } = useSetupStore();
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAndInstall();
  }, [checkAndInstall]);

  useEffect(() => {
    if (phase === 'success') {
      onReady();
    }
  }, [phase, onReady]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 正在检测或安装
  if (phase === 'checking' || phase === 'installing') {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              {phase === 'checking' ? '正在检测依赖环境...' : '正在安装 Claude Code CLI...'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {phase === 'installing' && (
              <>
                <p className="text-xs text-muted-foreground">首次启动需要安装 AI 组件，请耐心等待。</p>
                <ScrollArea className="h-48 w-full rounded border bg-muted/50">
                  <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
                    {logs.length === 0 ? '正在准备安装...' : logs.join('\n')}
                    <div ref={logEndRef} />
                  </pre>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // 安装失败
  if (phase === 'error') {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-red-500" />
              安装失败
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-500 font-mono">{error}</p>
            {logs.length > 0 && (
              <ScrollArea className="h-32 w-full rounded border bg-muted/50">
                <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
                  {logs.join('\n')}
                </pre>
              </ScrollArea>
            )}
            <Button className="w-full" onClick={checkAndInstall}>
              <RefreshCw className="h-4 w-4 mr-2" />
              重试安装
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
