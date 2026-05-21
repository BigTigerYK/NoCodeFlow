import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AgentUnavailableNotice() {
  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Claude CLI 未安装</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p>NoCodeFlow 需要 Claude Code CLI 才能运行 AI Agent。</p>
        <p>请先安装：</p>
        <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
          npm install -g @anthropic-ai/claude-code
        </pre>
        <p className="text-muted-foreground text-sm">
          安装后重启 NoCodeFlow 即可使用。
        </p>
      </CardContent>
    </Card>
  );
}
