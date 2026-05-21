import { useState } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

export type SidebarPage = 'task-center' | 'workspace' | 'knowledge' | 'settings';

interface SidebarProps {
  activePage: SidebarPage;
  onNavigate: (page: SidebarPage) => void;
}

const navItems = [
  { id: 'task-center' as const, label: '任务中心', icon: LayoutDashboard },
  { id: 'workspace' as const, label: '工作空间', icon: FolderOpen },
  { id: 'knowledge' as const, label: '知识库', icon: BookOpen },
  { id: 'settings' as const, label: '设置', icon: Settings },
];

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-muted/30 transition-all duration-200',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-2 pt-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'justify-start gap-3 h-9',
                  collapsed && 'justify-center px-0'
                )}
                onClick={() => onNavigate(item.id)}
                title={item.label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Collapse toggle */}
      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn('w-full', collapsed && 'px-0')}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">收起</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
