import { create } from 'zustand';
import type { DocumentModel, DocumentFormat } from '@shared/types/document';
import { useDocumentStore } from './document';

interface KnowledgeState {
  searchQuery: string;
  filterFormat: DocumentFormat | 'all';
  selectedDocumentId: string | null;
  showDetail: boolean;
  isImporting: boolean;

  setSearchQuery: (query: string) => void;
  setFilterFormat: (format: DocumentFormat | 'all') => void;
  setSelectedDocument: (id: string | null) => void;
  toggleDetail: (show?: boolean) => void;
  setIsImporting: (val: boolean) => void;
  getFilteredDocuments: () => DocumentModel[];
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  searchQuery: '',
  filterFormat: 'all',
  selectedDocumentId: null,
  showDetail: false,
  isImporting: false,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterFormat: (format) => set({ filterFormat: format }),
  setSelectedDocument: (id) => set({ selectedDocumentId: id, showDetail: !!id }),
  toggleDetail: (show) => set(state => ({ showDetail: show ?? !state.showDetail })),
  setIsImporting: (val) => set({ isImporting: val }),

  getFilteredDocuments: () => {
    const { searchQuery, filterFormat } = get();
    const { documents } = useDocumentStore.getState();

    return documents.filter(doc => {
      if (filterFormat !== 'all' && doc.format !== filterFormat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return doc.name.toLowerCase().includes(q) ||
          doc.pages.some(p => p.content.toLowerCase().includes(q));
      }
      return true;
    });
  },
}));
