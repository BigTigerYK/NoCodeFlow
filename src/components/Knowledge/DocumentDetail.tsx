import { useDocumentStore } from '@/stores/document';
import { useKnowledgeStore } from '@/stores/knowledge';
import { Button } from '@/components/ui/button';
import { SummaryPanel } from '@/components/Document/SummaryPanel';
import { QAPanel } from '@/components/Document/QAPanel';
import { X, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface DocumentDetailProps {
  documentId: string;
}

export function DocumentDetail({ documentId }: DocumentDetailProps) {
  const { documents, deleteDocument } = useDocumentStore();
  const { toggleDetail, setSelectedDocument } = useKnowledgeStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const doc = documents.find(d => d.id === documentId);
  if (!doc) return null;

  const handleDelete = async () => {
    await deleteDocument(documentId);
    setSelectedDocument(null);
    toggleDetail(false);
  };

  return (
    <div className="w-80 border-l bg-muted/20 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-sm font-semibold truncate flex-1 mr-2">{doc.name}</h2>
        <Button variant="ghost" size="sm" onClick={() => toggleDetail(false)} aria-label="关闭详情">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Metadata */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">元数据</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">格式</span>
              <span className="font-medium uppercase">{doc.format}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">页数</span>
              <span className="font-medium">{doc.metadata.pageCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">字数</span>
              <span className="font-medium">{doc.metadata.wordCount}</span>
            </div>
            {doc.metadata.author && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">作者</span>
                <span className="font-medium">{doc.metadata.author}</span>
              </div>
            )}
            {doc.metadata.language && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">语言</span>
                <span className="font-medium">{doc.metadata.language === 'zh' ? '中文' : '英文'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Outline */}
        {doc.pages.some(p => p.paragraphs.some(pa => pa.style?.startsWith('heading'))) && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">大纲</h3>
            <div className="space-y-1">
              {doc.pages.flatMap(p => p.paragraphs)
                .filter(p => p.style?.startsWith('heading'))
                .map((p, i) => (
                  <div
                    key={i}
                    className="text-sm truncate"
                    style={{ paddingLeft: `${((p.level || 1) - 1) * 12}px` }}
                  >
                    {p.text}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <SummaryPanel documentId={documentId} />

        {/* Q&A */}
        <QAPanel documentId={documentId} />

        {/* Actions */}
        <div className="space-y-2 pt-2 border-t">
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除文档
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">确认删除「{doc.name}」？</p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" className="flex-1" onClick={handleDelete}>
                  确认
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                  取消
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
