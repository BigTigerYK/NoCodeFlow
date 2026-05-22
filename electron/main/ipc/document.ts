import { ipcMain, dialog } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { DocumentModel } from '@shared/types/document';
import { detectDocumentFormat } from '@shared/types/document';
import { parseDocument } from '../document/parser';
import { generateSummary } from '../document/summarizer';
import { documentQA } from '../document/qa-engine';
import { getMainWindow } from '../window';

const documentStore = new Map<string, DocumentModel>();

export function registerDocumentHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_IMPORT,
    async (_event, args: { filePaths?: string[] }) => {
      try {
        let filePaths = args.filePaths;

        if (!filePaths || filePaths.length === 0) {
          const win = getMainWindow();
          if (!win) return { error: 'No window available' };
          const result = await dialog.showOpenDialog(win, {
            properties: ['openFile', 'multiSelections'],
            filters: [
              { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'md', 'markdown'] },
            ],
          });
          if (result.canceled) return { data: [] };
          filePaths = result.filePaths;
        }

        const results: DocumentModel[] = [];
        for (const filePath of filePaths) {
          if (documentStore.has(filePath)) {
            results.push(documentStore.get(filePath)!);
            continue;
          }
          const doc = await parseDocument(filePath);
          documentStore.set(doc.id, doc);
          results.push(doc);
        }

        return { data: results };
      } catch (err: any) {
        return { error: err.message };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_LIST,
    async () => {
      try {
        const docs = Array.from(documentStore.values());
        return { data: docs };
      } catch (err: any) {
        return { error: err.message };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_GET,
    async (_event, args: { documentId: string }) => {
      try {
        const doc = documentStore.get(args.documentId);
        if (!doc) return { error: 'Document not found' };
        return { data: doc };
      } catch (err: any) {
        return { error: err.message };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_DELETE,
    async (_event, args: { documentId: string }) => {
      try {
        if (!documentStore.has(args.documentId)) {
          return { error: 'Document not found' };
        }
        documentStore.delete(args.documentId);
        return { data: { success: true } };
      } catch (err: any) {
        return { error: err.message };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_SEARCH,
    async (_event, args: { query: string }) => {
      try {
        const query = args.query.toLowerCase();
        const results = Array.from(documentStore.values()).filter(doc => {
          const nameMatch = doc.name.toLowerCase().includes(query);
          const contentMatch = doc.pages.some(p =>
            p.content.toLowerCase().includes(query)
          );
          return nameMatch || contentMatch;
        });
        return { data: results };
      } catch (err: any) {
        return { error: err.message };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_PARSE,
    async (_event, args: { filePath: string }) => {
      try {
        const doc = await parseDocument(args.filePath);
        documentStore.set(doc.id, doc);
        return { data: doc };
      } catch (err: any) {
        return { error: err.message };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_SUMMARIZE,
    async (_event, args: { documentId: string }) => {
      try {
        const doc = documentStore.get(args.documentId);
        if (!doc) return { error: 'Document not found' };
        const summary = await generateSummary(doc);
        return { data: { summary } };
      } catch (err: any) {
        return { error: err.message };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DOCUMENT_QA,
    async (_event, args: { documentIds: string[]; question: string }) => {
      try {
        const docs = args.documentIds
          .map(id => documentStore.get(id))
          .filter((d): d is DocumentModel => !!d);
        if (docs.length === 0) return { error: 'No documents found' };
        const result = await documentQA(docs, args.question);
        return { data: result };
      } catch (err: any) {
        return { error: err.message };
      }
    },
  );
}

export function getDocumentStore(): Map<string, DocumentModel> {
  return documentStore;
}
