import {
  PenLine,
  BookOpen,
  Code2,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskType {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  borderColor: string;
  prompt: string;
}

const taskTypes: TaskType[] = [
  {
    id: 'writing',
    label: '写论文',
    description: '论文写作、文献综述、学术创作',
    icon: PenLine,
    color: 'text-blue-500',
    borderColor: 'border-blue-500/20 hover:border-blue-500/40',
    prompt: '帮我写一篇论文，请先打开一个工作文件夹',
  },
  {
    id: 'research',
    label: '分析文献',
    description: '文献阅读、要点提取、对比分析',
    icon: BookOpen,
    color: 'text-green-500',
    borderColor: 'border-green-500/20 hover:border-green-500/40',
    prompt: '帮我分析这些文献，请先打开包含文献的文件夹',
  },
  {
    id: 'development',
    label: '开发软件',
    description: '代码编写、项目搭建、功能开发',
    icon: Code2,
    color: 'text-purple-500',
    borderColor: 'border-purple-500/20 hover:border-purple-500/40',
    prompt: '帮我开发一个软件项目，请先打开项目文件夹',
  },
  {
    id: 'analysis',
    label: '做分析',
    description: '数据分析、可视化、报告生成',
    icon: BarChart3,
    color: 'text-orange-500',
    borderColor: 'border-orange-500/20 hover:border-orange-500/40',
    prompt: '帮我做数据分析，请先打开数据文件夹',
  },
];

interface TaskCardProps {
  onSelect: (prompt: string) => void;
}

export function TaskCard({ onSelect }: TaskCardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {taskTypes.map((task) => {
        const Icon = task.icon;
        return (
          <button
            key={task.id}
            className={cn(
              'flex flex-col items-start gap-2 p-4 rounded-lg border bg-card text-left',
              'card-hover cursor-pointer',
              task.borderColor,
            )}
            onClick={() => onSelect(task.prompt)}
          >
            <Icon className={cn('h-5 w-5', task.color)} />
            <div>
              <div className="text-sm font-medium">{task.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {task.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
