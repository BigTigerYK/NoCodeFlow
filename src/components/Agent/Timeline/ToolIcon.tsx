import {
  FileText,
  FileEdit,
  FilePenLine,
  Terminal,
  Search,
  SearchCode,
  Globe,
  Bot,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

const TOOL_ICONS: Record<string, LucideIcon> = {
  Read: FileText,
  Write: FileEdit,
  Edit: FilePenLine,
  Bash: Terminal,
  Glob: Search,
  Grep: SearchCode,
  WebFetch: Globe,
  WebSearch: Globe,
  Agent: Bot,
};

interface ToolIconProps {
  name: string;
  className?: string;
}

export function ToolIcon({ name, className }: ToolIconProps) {
  const Icon = TOOL_ICONS[name] || Wrench;
  return <Icon className={className ?? 'w-4 h-4'} aria-label={name} />;
}
