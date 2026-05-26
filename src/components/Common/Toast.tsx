import { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const COLORS: Record<ToastType, string> = {
  success: 'border-green-500/30 bg-green-500/8 text-green-400',
  warning: 'border-yellow-500/30 bg-yellow-500/8 text-yellow-400',
  error: 'border-red-500/30 bg-red-500/8 text-red-400',
  info: 'border-info/30 bg-info/8 text-info',
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [exiting, setExiting] = useState(false);
  const Icon = ICONS[toast.type];

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const duration = toast.duration ?? 3000;
    const timer = setTimeout(handleDismiss, duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, handleDismiss]);

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-3 rounded-sm border shadow-custom-sm',
        'animate-in slide-in-from-right-full duration-300',
        exiting && 'animate-out slide-out-to-right-full duration-200',
        COLORS[toast.type]
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-sm flex-1">{toast.message}</span>
      <button
        onClick={handleDismiss}
        className="shrink-0 hover:opacity-70 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Global toast state
let toastListeners: ((toasts: ToastMessage[]) => void)[] = [];
let toasts: ToastMessage[] = [];

function notify(type: ToastType, message: string, duration?: number) {
  const toast: ToastMessage = {
    id: crypto.randomUUID(),
    type,
    message,
    duration,
  };
  toasts = [...toasts, toast];
  toastListeners.forEach((l) => l(toasts));
}

export const toast = {
  success: (msg: string, dur?: number) => notify('success', msg, dur),
  warning: (msg: string, dur?: number) => notify('warning', msg, dur),
  error: (msg: string, dur?: number) => notify('error', msg, dur),
  info: (msg: string, dur?: number) => notify('info', msg, dur),
};

export function ToastContainer() {
  const [current, setCurrent] = useState<ToastMessage[]>(toasts);

  useEffect(() => {
    toastListeners.push(setCurrent);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setCurrent);
    };
  }, []);

  const handleDismiss = useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    toastListeners.forEach((l) => l(toasts));
  }, []);

  if (current.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80" role="alert" aria-live="polite">
      {current.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}
