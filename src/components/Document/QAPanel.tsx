import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { IPC_CHANNELS } from '@shared/types/ipc';

interface QAPanelProps {
  documentId: string;
}

interface QAMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ documentName: string; excerpt: string }>;
}

export function QAPanel({ documentId }: QAPanelProps) {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setIsLoading(true);

    try {
      const result = await window.api.invoke(IPC_CHANNELS.DOCUMENT_QA, {
        documentIds: [documentId],
        question,
      }) as { data?: { answer: string; sources: Array<{ documentName: string; excerpt: string }> }; error?: string };

      if (result.error) throw new Error(result.error);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.data?.answer || '无法生成回答',
        sources: result.data?.sources,
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `错误：${err.message}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-lg flex flex-col h-80">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <MessageSquare className="h-4 w-4" />
        <h3 className="text-sm font-medium">文档问答</h3>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            提问关于此文档的问题
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                  <p className="text-[10px] text-muted-foreground mb-1">引用来源：</p>
                  {msg.sources.map((s, j) => (
                    <p key={j} className="text-[10px] text-muted-foreground">
                      [{j + 1}] {s.documentName} - {s.excerpt.slice(0, 60)}...
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-left">
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-sm text-muted-foreground">思考中...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 p-2 border-t">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入问题..."
          className="flex-1 h-8 px-2 text-sm bg-background border rounded focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={isLoading}
          aria-label="文档问答输入"
        />
        <Button variant="ghost" size="sm" onClick={handleSend} disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
