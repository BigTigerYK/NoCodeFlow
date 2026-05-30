# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NoCodeFlow is an AI cognitive workbench built as an Electron desktop app. Users interact with AI Agents (Claude, OpenAI, etc.) via natural language to build applications, write documents, and analyze knowledge. Phases 1–7 are complete (workspace, agent, timeline, permissions, snapshots, document intelligence). Task center and knowledge base are in development.

## Development Commands

```bash
npm install            # Install dependencies
npm run dev            # Vite dev server (renderer only, no Electron)
npm run electron:dev   # Full Electron app with hot reload (main dev command)
npm run build          # Type-check (tsc) + Vite build
npm run electron:build # Build renderer + package with electron-builder
npm run build:win      # Build + package for Windows x64 (NSIS installer)
```

**Prerequisite**: Claude CLI must be installed globally: `npm install -g @anthropic-ai/claude-code`

No test framework, linter, or CI/CD pipeline is configured yet.

## Architecture

### Electron Process Split

- **Main process**: `electron/main/index.ts` — entry point, registers IPC handlers, creates window
- **Preload**: `electron/preload/index.ts` — exposes `window.api` via contextBridge
- **Renderer**: `src/` — React SPA (Zustand + React Router)

Security model: `contextIsolation: true`, `nodeIntegration: false`. All main↔renderer communication goes through IPC channels defined in `shared/types/ipc.ts`.

### Path Aliases

- `@/` → `src/`
- `@shared/` → `shared/`

Configured in both `tsconfig.json` and `vite.config.ts`.

### Agent System (Adapter Pattern)

The agent runtime uses an adapter pattern to support multiple AI providers. Data flow:

```
Renderer (ChatPanel) → IPC (AGENT_START/SEND/STOP) → Main (agent.ts handler)
  → AdapterFactory → AgentAdapter (claude-code | claude-api | openai)
  → IPC (AGENT_OUTPUT/AGENT_STATUS events) → Renderer (useAgentStore)
```

**Adapter types** (`electron/main/agent/adapters/`):
- `claude-code` — spawns `claude` CLI as child process, parses stream-json output
- `claude-api` — direct Anthropic API calls via `@anthropic-ai/sdk`
- `openai` — OpenAI-compatible API (for third-party providers)

Key files:
- `electron/main/agent/adapters/types.ts` — `AgentAdapter` interface with `checkAvailability()`, `send()`, `stop()`, event callbacks
- `electron/main/agent/adapters/index.ts` — `AdapterFactory` creating adapters by `AdapterType`
- `electron/main/agent/claude-adapter.ts` — legacy Claude CLI adapter (being migrated to new pattern)
- `electron/main/ipc/agent.ts` — reads active `ClaudeProfile` from config, creates adapter via factory
- `src/stores/agent.ts` — Zustand store managing messages, status, and IPC event listeners
- `src/components/Agent/` — ChatPanel, MessageBubble, ChatInput, AgentStatus, MarkdownRenderer, Timeline

The chat panel is embedded in the Workspace page (toggled by "Agent" button), not a standalone sidebar page.

**ClaudeProfile config**: Users configure adapter type, API base URL, API key, and optional model per profile in Settings → Agent 配置. The active profile is read by the agent IPC handler at `AGENT_START` time.

### IPC Communication

IPC handlers live in `electron/main/ipc/` (one file per domain). Channel constants are in `shared/types/ipc.ts`. The preload script validates channels against this allowlist.

| File | Domain |
|------|--------|
| `fs.ts` | File read/write/tree/watch |
| `config.ts` | electron-store CRUD |
| `dialog.ts` | Native file/folder dialogs |
| `agent.ts` | Agent lifecycle (start/stop/send) |
| `permission.ts` | Permission sandbox (path/command validation) |
| `snapshot.ts` | Git snapshot creation, diff, restore |
| `index.ts` | Registers all handlers |

Preload `on()` listeners are restricted to: `AGENT_OUTPUT`, `AGENT_STATUS`, `FS_WATCH`, `PERMISSION_REQUEST`.

**IPC response format**: `fs.ts` handlers return `{ data, error }` wrappers; `agent.ts` handlers return `{ success, error?, version? }` directly. The workspace store uses an `ipcInvoke` helper that unwraps `{ data, error }`.

### Document Intelligence

Document processing system for PDF, Word, and Markdown files. Supports chunking, metadata extraction, and Q&A.

Key files:
- `electron/main/document/parser.ts` — entry point, dispatches to format-specific parsers
- `electron/main/document/pdf-parser.ts` — PDF parsing via `pdfjs-dist`
- `electron/main/document/word-parser.ts` — Word parsing via `mammoth`
- `electron/main/document/markdown-parser.ts` — Markdown parsing via `marked`
- `electron/main/document/chunker.ts` — text chunking for RAG context
- `electron/main/document/qa-engine.ts` — document Q&A with context retrieval
- `src/components/Document/` — DocumentViewer, PdfViewer, MarkdownViewer, DocumentSelector

Data flow: `IPC (DOCUMENT_PARSE) → parser.ts → format parser → chunker → DocumentModel → IPC response`

### Shared Types

`shared/types/` is the contract between main and renderer processes:
- `ipc.ts` — channel constants (`IPC_CHANNELS`)
- `config.ts` — `AppConfig`, `ClaudeProfile`, `DEFAULT_CONFIG`
- `workspace.ts` — `FileNode`, `WorkspaceInfo`
- `agent.ts` — `AgentStatus`, `AgentOutputEvent` (typed as `data: unknown`)
- `document.ts` — `DocumentModel`, `DocumentFormat`, `DocumentChunk` types
- `snapshot.ts` — Snapshot-related types
- `permission.ts` — Permission request/response types
- `setup.ts` — Setup/onboarding types

**Rule from COLLABORATION.md**: Changes to `shared/types/` require PR review from both team members.

### State Management

- **Workspace store** (`src/stores/workspace.ts`): file tree, editor tabs with dirty tracking, language detection
- **Agent store** (`src/stores/agent.ts`): messages, agent status, IPC event routing
- **Permission store** (`src/stores/permission.ts`): permission request queue, approval state
- **Snapshot store** (`src/stores/snapshot.ts`): snapshot list, diff viewing, restore operations
- **Config** via `useConfig` hook (`src/hooks/useConfig.ts`): talks to electron-store through IPC

### UI Component Library

shadcn/ui components live in `src/components/ui/`. Config is in `components.json` (slate base color, CSS variables enabled). Add new components via `npx shadcn-ui@latest add <component>`.

### Layout

Sidebar-based layout (`src/components/layout/`) with pages: Task Center, Workspace (includes embedded Agent chat panel), Knowledge Base, Document Viewer, Settings.

Workspace page structure: left sidebar (FileTree) + center (Editor with tabs) + right panel (ChatPanel/Timeline, toggled). Snapshot panel and permission dialogs overlay as needed.

**Onboarding flow**: `src/components/Onboarding/` handles first-run setup (dependency checks, Claude CLI installation).

### Theming

Light/dark/system themes via CSS variables in `src/index.css` and Tailwind `dark` class strategy (`tailwind.config.js`).

## Collaboration Model

Two-person team defined in `COLLABORATION.md`:
- **Role A (Base Engineer)**: Electron main process, IPC, file system, agent runtime, security sandbox, git snapshot — owns `electron/`, `src/components/Workspace/`, `src/components/layout/`
- **Role B (Intelligence & UX)**: Claude adapter, chat UI, timeline, task center, knowledge layer — owns `src/components/TaskCenter/`, `src/components/KnowledgeBase/`, `src/components/Agent/`, `src/components/Settings/ClaudeSettings.tsx`
- **Shared**: `shared/types/`, `src/components/ui/`, `src/stores/`

Branch convention: `feature/phase<N>-<description>`. Commit format: `type(scope): subject` (Chinese or English).

## Key Technical Decisions

- **Vite + vite-plugin-electron** for unified build (renderer + main + preload in one config)
- **electron-store** for persistent config (not file-based JSON)
- **chokidar** for file system watching in main process
- **Monaco Editor** (`@monaco-editor/react`) for code editing
- **Agent adapter pattern** supporting claude-code (CLI), claude-api (SDK), and openai providers
- **Atomic file writes** in `fs:write` handler (write to `.nocodeflow-tmp`, then rename)
- **Permission sandbox** with path validation (realpath, workspace isolation) and command validation (high-risk command detection)
- **Git snapshot** for modification rollback — detects git repos, falls back to `.nocodeflow` snapshot directory for non-git projects
- **Document parsing** via `pdfjs-dist` (PDF), `mammoth` (Word), `marked` (Markdown)
- **react-markdown + remark-gfm** for Agent message rendering
- **diff** library for file diff computation in snapshot system
- File tree max depth 10, ignores `node_modules`, `.git`, `dist`, `.next`, `__pycache__`, `.DS_Store`, `dist-electron`, `.nocodeflow`
