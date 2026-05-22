import { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskInputProps {
  onSubmit: (task: string) => void;
  initialValue?: string;
}

export function TaskInput({ onSubmit, initialValue = '' }: TaskInputProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialValue) setValue(initialValue);
  }, [initialValue]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  }, [value, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative w-full max-w-[520px] mx-auto">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入任务描述，如：帮我写一篇关于 AI 教育的综述..."
        rows={1}
        className={cn(
          'w-full resize-none rounded-xl border bg-background px-4 py-3 pr-12',
          'text-sm placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          'transition-shadow duration-200',
        )}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className={cn(
          'absolute right-2 bottom-2 p-2 rounded-lg',
          'text-muted-foreground hover:text-foreground',
          'disabled:opacity-30 disabled:cursor-not-allowed',
          'transition-colors duration-150',
        )}
        title="发送 (Enter)"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
