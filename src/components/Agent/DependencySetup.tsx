import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ExternalLink, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { useSetupStore } from '@/stores/setup';

interface DependencySetupProps {
  onReady: () => void;
}

export function DependencySetup({ onReady }: DependencySetupProps) {
  const { phase, deps, logs, error, checkDeps, installCli, openNodeDownload, reset } = useSetupStore();
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkDeps();
  }, [checkDeps]);

  useEffect(() => {
    if (phase === 'success') {
      onReady();
    }
  }, [phase, onReady]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Checking dependencies
  if (phase === 'checking') {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">正在检测依赖环境...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Node.js not available
  if (phase === 'no-node') {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              需要安装 Node.js
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              NoCodeFlow 需要 Node.js 运行环境来安装 AI Agent 组件。
            </p>
            <div className="space-y-2">
              <Button className="w-full" onClick={openNodeDownload}>
                <ExternalLink className="h-4 w-4 mr-2" />
                下载 Node.js
              </Button>
              <Button variant="outline" className="w-full" onClick={checkDeps}>
                <RefreshCw className="h-4 w-4 mr-2" />
                安装完成，重新检测
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              下载 LTS 版本即可。安装完成后请点击"重新检测"。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // CLI not available — show install button
  if (phase === 'idle') {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-5 w-5 text-blue-500" />
              安装 Claude Code CLI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              检测到 Node.js {deps?.nodeVersion} 已安装，但缺少 Claude Code CLI。
            </p>
            <p className="text-sm text-muted-foreground">
              点击下方按钮自动安装，完成后即可使用 AI Agent 功能。
            </p>
            <Button className="w-full" onClick={installCli}>
              <Download className="h-4 w-4 mr-2" />
              一键安装 Claude Code CLI
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Installing — show progress logs
  if (phase === 'installing') {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              正在安装 Claude Code CLI...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">安装过程可能需要 1-2 分钟，请耐心等待。</p>
            <ScrollArea className="h-48 w-full rounded border bg-muted/50">
              <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
                {logs.length === 0 ? '等待输出...' : logs.join('\n')}
                <div ref={logEndRef} />
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error
  if (phase === 'error') {
    const isPermission = error?.includes('EACCES') || error?.includes('permission');
    const isNetwork = error?.includes('ENOTFOUND') || error?.includes('ETIMEDOUT') || error?.includes('network');

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
            {isPermission && (
              <p className="text-xs text-muted-foreground">
                权限不足：请以管理员身份运行 NoCodeFlow，或手动在终端执行：
                <code className="block mt-1 p-2 bg-muted rounded text-xs">
                  npm install -g @anthropic-ai/claude-code
                </code>
              </p>
            )}
            {isNetwork && (
              <p className="text-xs text-muted-foreground">
                网络连接异常：请检查网络后重试。
              </p>
            )}
            {logs.length > 0 && (
              <ScrollArea className="h-32 w-full rounded border bg-muted/50">
                <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
                  {logs.join('\n')}
                </pre>
              </ScrollArea>
            )}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={installCli}>
                <RefreshCw className="h-4 w-4 mr-2" />
                重试
              </Button>
              <Button variant="outline" className="flex-1" onClick={reset}>
                重新检测
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
