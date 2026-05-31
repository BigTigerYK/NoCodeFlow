import { create } from 'zustand';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { DocumentModel } from '@shared/types/document';
import { ipcInvoke } from '@/lib/ipc';

interface DocumentState {
  documents: DocumentModel[];
  currentDocumentId: string | null;
  isLoading: boolean;
  error: string | null;

  importDocuments: (filePaths?: string[]) => Promise<DocumentModel[]>;
  fetchDocuments: () => Promise<void>;
  getDocument: (id: string) => Promise<DocumentModel | null>;
  deleteDocument: (id: string) => Promise<void>;
  searchDocuments: (query: string) => Promise<DocumentModel[]>;
  setCurrentDocument: (id: string | null) => void;
  clearError: () => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  currentDocumentId: null,
  isLoading: false,
  error: null,

  importDocuments: async (filePaths?: string[]) => {
    set({ isLoading: true, error: null });
    try {
      const docs = await ipcInvoke<DocumentModel[]>(IPC_CHANNELS.DOCUMENT_IMPORT, { filePaths });
      set(state => ({
        documents: [...state.documents, ...docs.filter(d => !state.documents.some(e => e.id === d.id))],
        isLoading: false,
      }));
      return docs;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return [];
    }
  },

  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const docs = await ipcInvoke<DocumentModel[]>(IPC_CHANNELS.DOCUMENT_LIST);
      set({ documents: docs, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  getDocument: async (id: string) => {
    try {
      const doc = await ipcInvoke<DocumentModel>(IPC_CHANNELS.DOCUMENT_GET, { documentId: id });
      set(state => ({
        documents: state.documents.some(d => d.id === id)
          ? state.documents.map(d => (d.id === id ? doc : d))
          : [...state.documents, doc],
      }));
      return doc;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  deleteDocument: async (id: string) => {
    try {
      await ipcInvoke(IPC_CHANNELS.DOCUMENT_DELETE, { documentId: id });
      set(state => ({
        documents: state.documents.filter(d => d.id !== id),
        currentDocumentId: state.currentDocumentId === id ? null : state.currentDocumentId,
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  searchDocuments: async (query: string) => {
    try {
      return await ipcInvoke<DocumentModel[]>(IPC_CHANNELS.DOCUMENT_SEARCH, { query });
    } catch (err: any) {
      set({ error: err.message });
      return [];
    }
  },

  setCurrentDocument: (id) => set({ currentDocumentId: id }),
  clearError: () => set({ error: null }),
}));
