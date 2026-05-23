import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useConfig } from '@/hooks/useConfig';
import { ToolIcon } from './Timeline/ToolIcon';

interface AgentStatusBarProps {
  status: 'idle' | 'starting' | 'running' | 'error' | 'completed';
  onStop: () => void;
  currentTool?: string;
}

export function AgentStatusBar({ status, onStop, currentTool }: AgentStatusBarProps) {
  const { config, updateConfig } = useConfig();
  const { profiles, activeProfileId } = config.claude;
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  const handleSwitchProfile = (id: string) => {
    updateConfig('claude', { ...config.claude, activeProfileId: id });
  };

  const statusLabel =
    status === 'running'
      ? currentTool
        ? `正在${currentTool}...`
        : 'Agent 运行中...'
      : status === 'starting'
        ? '正在启动...'
        : status === 'error'
          ? '发生错误'
          : status === 'completed'
            ? '已完成'
            : '就绪';

  return (
    <div className="border-b px-4 py-2 flex items-center justify-between" role="toolbar" aria-label="Agent controls">
      <div className="flex items-center gap-2">
        <div
          role="status"
          aria-label={
            status === 'running' ? 'Agent is running' :
            status === 'starting' ? 'Agent is starting' :
            status === 'error' ? 'Agent encountered an error' :
            status === 'completed' ? 'Agent completed' :
            'Agent is idle'
          }
          className={cn(
            'w-2 h-2 rounded-full shrink-0',
            status === 'running' && 'bg-green-500 animate-pulse',
            status === 'starting' && 'bg-yellow-500 animate-pulse',
            status === 'idle' && 'bg-gray-400',
            status === 'error' && 'bg-red-500',
            status === 'completed' && 'bg-blue-500'
          )}
        />

        {!__IS_INTERNAL_BUILD__ && profiles.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {status === 'running' && currentTool ? (
                  <span className="flex items-center gap-1.5 text-foreground">
                    <ToolIcon name={currentTool} className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[160px]">{statusLabel}</span>
                  </span>
                ) : (
                  <span className="truncate max-w-[140px]">
                    {activeProfile?.name ?? '未选择方案'}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>切换配置方案</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {profiles.map(profile => (
                <DropdownMenuItem
                  key={profile.id}
                  onClick={() => handleSwitchProfile(profile.id)}
                  className={cn(
                    profile.id === activeProfileId && 'bg-accent'
                  )}
                >
                  <div className="flex flex-col">
                    <span>{profile.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {profile.baseUrl}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
              {status === 'running' && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    切换后需重启 Agent 生效
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            {status === 'running' && currentTool && (
              <ToolIcon name={currentTool} className="w-3.5 h-3.5" />
            )}
            {status === 'running' && !currentTool && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            {statusLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {status === 'running' && (
          <Button variant="destructive" size="sm" onClick={onStop}>
            停止
          </Button>
        )}
      </div>
    </div>
  );
}
