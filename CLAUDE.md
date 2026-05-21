# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NoCodeFlow is an AI-assisted zero-code development platform built as an Electron desktop app. Users interact with an AI Agent via natural language to build applications. The project is in early development — the workspace editor is functional, but the AI agent, task center, knowledge base, and other core features are placeholder stubs (`src/core/` directories contain only README.md files).

## Development Commands

```bash
npm run dev            # Vite dev server (renderer only, no Electron)
npm run electron:dev   # Full Electron app with hot reload (main dev command)
npm run build          # Type-check (tsc --noEmit) + Vite build
npm run electron:build # Build renderer + package with electron-builder
npm run build:win      # Build + package for Windows x64 (NSIS installer)
```

No test framework, linter, or CI/CD pipeline is configured yet.

## Architecture

### Electron Process Split

- **Main process**: `electron/main/index.ts` — creates BrowserWindow, registers IPC handlers
- **Preload**: `electron/preload/index.ts` — exposes `window.api` via contextBridge (invoke/on, channel-whitelisted)
- **Renderer**: `src/` — React SPA

Security model: `contextIsolation: true`, `nodeIntegration: false`. All main↔renderer communication goes through IPC channels defined in `shared/types/ipc.ts`.

### Path Aliases

- `@/` → `src/`
- `@shared/` → `shared/`

Configured in both `tsconfig.json` and `vite.config.ts`.

### IPC Communication

IPC handlers live in `electron/main/ipc/` (one file per domain: `fs.ts`, `config.ts`, `dialog.ts`). Channel constants are in `shared/types/ipc.ts`. The preload script validates channels against this allowlist before forwarding.

Currently implemented: file read/write/tree/watch, config CRUD, native dialogs. Reserved but not implemented: agent, permission, snapshot, event-bus channels.

### Shared Types

`shared/types/` is the contract between main and renderer processes. Key files:
- `ipc.ts` — channel constants
- `config.ts` — `AppConfig` interface and defaults
- `workspace.ts` — `FileNode`, `WorkspaceInfo`
- `agent.ts` — `AgentAdapter`, `AgentEvent` interfaces (future use)

**Rule from COLLABORATION.md**: Changes to `shared/types/` require PR review from both team members.

### State Management

- **Zustand store** (`src/stores/workspace.ts`): workspace state, file tree, editor tabs, all actions
- **Config** via `useConfig` hook (`src/hooks/useConfig.ts`): talks to electron-store through IPC

### UI Component Library

shadcn/ui components live in `src/components/ui/`. Config is in `components.json` (slate base color, CSS variables enabled). New shadcn components are added via `npx shadcn-ui@latest add <component>`.

### Layout

Sidebar-based layout (`src/components/layout/`) with four pages: Task Center (placeholder), Workspace (functional), Knowledge Base (placeholder), Settings (basic).

### Theming

Light/dark/system themes via CSS variables in `src/index.css` and Tailwind `dark` class strategy (`tailwind.config.js`).

## Collaboration Model

Two-person team defined in `COLLABORATION.md`:
- **Role A (Base Engineer)**: Electron main process, IPC, file system, agent runtime, security sandbox, git snapshot — owns `electron/`, `src/components/Workspace/`, `src/components/layout/`
- **Role B (Intelligence & UX)**: Claude adapter, chat UI, timeline, task center, knowledge layer — owns `src/components/TaskCenter/`, `src/components/KnowledgeBase/`, future `chat/`, `timeline/`, `document/`
- **Shared**: `shared/types/`, `src/components/ui/`, `src/stores/`

Branch convention: `feature/phase<N>-<description>`. Commit format: `type(scope): subject` (Chinese or English).

## Key Technical Decisions

- **Vite + vite-plugin-electron** for unified build (renderer + main + preload in one config)
- **electron-store** for persistent config (not file-based JSON)
- **chokidar** for file system watching in main process
- **Monaco Editor** (`@monaco-editor/react`) for code editing
- **Atomic file writes** in `fs:write` handler (write to .tmp, then rename)
- File tree has max depth 10, ignores `node_modules`, `.git`, `dist`, `dist-electron`, `build`
