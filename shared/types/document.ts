export interface DocumentModel {
  id: string;
  name: string;
  path: string;
  format: 'pdf' | 'word' | 'markdown';
  metadata: DocumentMetadata;
  pages: DocumentPage[];
  chunks: DocumentChunk[];
  status: 'parsing' | 'ready' | 'error';
  error?: string;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdAt?: string;
  pageCount: number;
  wordCount: number;
  language?: string;
}

export interface DocumentPage {
  index: number;
  content: string;
  paragraphs: DocumentParagraph[];
}

export interface DocumentParagraph {
  text: string;
  style?: 'heading1' | 'heading2' | 'heading3' | 'body' | 'quote' | 'code' | 'list';
  level?: number;
}

export interface DocumentChunk {
  id: string;
  pageIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
  tokenCount: number;
}

export type DocumentFormat = 'pdf' | 'word' | 'markdown';

export function detectDocumentFormat(fileName: string): DocumentFormat | null {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'word';
    case 'md':
    case 'markdown':
      return 'markdown';
    default:
      return null;
  }
}
