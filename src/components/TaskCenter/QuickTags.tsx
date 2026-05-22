import {
  PenLine,
  BookOpen,
  Code2,
  BarChart3,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickTag {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  prompt: string;
}

const quickTags: QuickTag[] = [
  {
    id: 'write-paper',
    label: '写论文',
    icon: PenLine,
    color: 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20',
    prompt: '帮我写一篇论文',
  },
  {
    id: 'analyze-literature',
    label: '分析文献',
    icon: BookOpen,
    color: 'text-green-500 bg-green-500/10 hover:bg-green-500/20',
    prompt: '帮我分析这些文献',
  },
  {
    id: 'dev-software',
    label: '开发软件',
    icon: Code2,
    color: 'text-purple-500 bg-purple-500/10 hover:bg-purple-500/20',
    prompt: '帮我开发一个软件项目',
  },
  {
    id: 'analyze-data',
    label: '做分析',
    icon: BarChart3,
    color: 'text-orange-500 bg-orange-500/10 hover:bg-orange-500/20',
    prompt: '帮我做数据分析',
  },
  {
    id: 'write-report',
    label: '写报告',
    icon: FileText,
    color: 'text-pink-500 bg-pink-500/10 hover:bg-pink-500/20',
    prompt: '帮我写一份报告',
  },
];

interface QuickTagsProps {
  onSelect: (prompt: string) => void;
}

export function QuickTags({ onSelect }: QuickTagsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {quickTags.map((tag) => {
        const Icon = tag.icon;
        return (
          <button
            key={tag.id}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-full',
              'text-sm font-medium transition-all duration-200',
              'btn-press cursor-pointer border-0',
              tag.color,
            )}
            onClick={() => onSelect(tag.prompt)}
          >
            <Icon className="h-4 w-4" />
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}
