import { useState, useEffect, useCallback, useRef } from 'react';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { Button } from '@/components/ui/button';
import { Copy, X, RefreshCw } from 'lucide-react';

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState('');
  const [logPath, setLogPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const result = await window.api.invoke(IPC_CHANNELS.DEBUG_GET_LOGS, { lastLines: 300 }) as {
        success: boolean; content?: string; path?: string; error?: string;
      };
      if (result.success) {
        setLogs(result.content || '');
        setLogPath(result.path || '');
      } else {
        setLogs(`Error: ${result.error}`);
      }
    } catch (err: any) {
      setLogs(`Error: ${err.message}`);
    }
  }, []);

  // Ctrl+Shift+D toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // fetch on open
  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchLogs().finally(() => setLoading(false));
    }
  }, [open, fetchLogs]);

  // auto refresh
  useEffect(() => {
    if (!open || !autoRefresh) return;
    const timer = setInterval(fetchLogs, 3000);
    return () => clearInterval(timer);
  }, [open, autoRefresh, fetchLogs]);

  // auto scroll to bottom
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs);
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 40,
        right: 8,
        width: 680,
        maxHeight: '60vh',
        zIndex: 9999,
        background: 'var(--background)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--muted)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600 }}>调试日志 (Ctrl+Shift+D)</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setLoading(true); fetchLogs().finally(() => setLoading(false)); }}
            disabled={loading}
            className="h-7 px-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="h-7 px-2 text-xs"
          >
            {autoRefresh ? '自动刷新 ON' : '自动刷新'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-7 px-2">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Log path */}
      {logPath && (
        <div style={{ padding: '4px 12px', fontSize: 10, color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}>
          {logPath}
        </div>
      )}

      {/* Log content */}
      <textarea
        ref={textareaRef}
        readOnly
        value={logs}
        style={{
          flex: 1,
          minHeight: 200,
          maxHeight: '50vh',
          padding: '8px 12px',
          fontSize: 11,
          fontFamily: 'Consolas, Monaco, monospace',
          lineHeight: 1.5,
          background: 'var(--background)',
          color: 'var(--foreground)',
          border: 'none',
          outline: 'none',
          resize: 'none',
        }}
      />
    </div>
  );
}
