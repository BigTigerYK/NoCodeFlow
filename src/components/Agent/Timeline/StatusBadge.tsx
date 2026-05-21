import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'pending' | 'running' | 'completed' | 'error';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'pending') return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'running' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse',
        status === 'completed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        status === 'error' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      )}
      role="status"
    >
      {status === 'running' && '执行中'}
      {status === 'completed' && '完成'}
      {status === 'error' && '错误'}
    </span>
  );
}
