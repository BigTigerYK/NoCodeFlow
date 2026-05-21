# NoCodeFlow

> 一个基于 AI Agent 的零代码开发平台，让非技术人员也能通过自然语言构建完整的应用。

## 项目简介

NoCodeFlow 是一款面向非专业开发者的智能应用构建平台，通过 AI Agent 与用户的自然语言交互，实现需求理解、架构设计、代码生成、实时预览和一键部署的全流程自动化。

## 技术栈

| 层级 | 技术 |
|---|---|
| 桌面框架 | Electron 28 |
| 前端框架 | React 18 + TypeScript 5 |
| 构建工具 | Vite 5 + vite-plugin-electron |
| UI 组件 | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| 代码编辑器 | Monaco Editor (@monaco-editor/react) |
| 状态管理 | Zustand 5 |
| 持久化存储 | electron-store |
| 文件监听 | chokidar |
| AI 能力 | Claude API（规划中） |

## 快速开始

```bash
# 安装依赖
npm install

# 启动 Electron 开发环境（推荐）
npm run electron:dev

# 仅启动 Vite 开发服务器（无 Electron）
npm run dev

# 构建应用
npm run build

# 打包 Windows 安装程序
npm run build:win
```

## 项目结构

```
NoCodeFlow/
├── electron/                # Electron 主进程
│   ├── main/                #   主进程入口、IPC handlers、配置存储
│   │   └── ipc/             #   fs.ts / config.ts / dialog.ts
│   └── preload/             #   预加载脚本（contextBridge 暴露 window.api）
├── src/                     # 渲染进程（React 前端）
│   ├── components/
│   │   ├── layout/          #   AppLayout、Sidebar、StatusBar
│   │   ├── Workspace/       #   文件树、Monaco 编辑器、标签页管理
│   │   ├── Settings/        #   设置页面（主题、字体大小）
│   │   ├── ui/              #   shadcn/ui 基础组件
│   │   ├── TaskCenter/      #   任务中心（待实现）
│   │   └── KnowledgeBase/   #   知识库（待实现）
│   ├── core/                # 核心业务逻辑（待实现）
│   │   ├── agent/           #   AI Agent 引擎
│   │   ├── context/         #   上下文管理
│   │   ├── event-bus/       #   事件总线
│   │   ├── git/             #   Git 集成
│   │   ├── knowledge/       #   知识库引擎
│   │   ├── memory/          #   记忆系统
│   │   ├── runtime/         #   运行时引擎
│   │   └── sandbox/         #   沙箱环境
│   ├── hooks/               #   useConfig、useIpc
│   ├── stores/              #   Zustand 状态管理
│   └── lib/                 #   工具函数
├── shared/                  # 主进程与渲染进程共享代码
│   ├── types/               #   IPC 通道、配置、工作区、Agent 类型定义
│   └── constants/           #   共享常量
├── resources/               # 应用图标等静态资源
└── poc/                     # 概念验证原型（独立项目）
```

## 架构概述

```
┌─────────────────────────────────────────────────┐
│                  Electron App                    │
│                                                  │
│  ┌──────────────┐    IPC     ┌────────────────┐  │
│  │  Main Process │◄─────────►│    Renderer     │  │
│  │              │  (whitelist │   (React SPA)   │  │
│  │  - 文件系统   │  channels) │                │  │
│  │  - 配置存储   │           │  - Workspace    │  │
│  │  - Agent运行时│           │  - Chat UI      │  │
│  │  - 安全沙箱   │           │  - Task Center  │  │
│  │  - Git快照    │           │  - Settings     │  │
│  └──────────────┘           └────────────────┘  │
│         ▲                          ▲             │
│         │      shared/types/       │             │
│         └──── 类型契约 & 通道常量 ───┘             │
└─────────────────────────────────────────────────┘
```

- **主进程** (`electron/main/`)：负责文件读写、配置持久化、原生对话框、Agent 运行时管理
- **预加载脚本** (`electron/preload/`)：通过 `contextBridge` 安全暴露 `window.api`，白名单校验 IPC 通道
- **渲染进程** (`src/`)：React SPA，通过 `window.api.invoke()` 与主进程通信
- **共享类型** (`shared/types/`)：定义 IPC 通道常量和数据接口，是主进程与渲染进程的唯一契约

## 开发状态

| 阶段 | 内容 | 状态 |
|---|---|---|
| Phase 1 | Electron 基础架构 + IPC 通信 | 已完成 |
| Phase 2 | Workspace 文件浏览 + Monaco 编辑器 | 已完成 |
| Phase 3 | Agent Runtime + Claude Adapter | 待开发 |
| Phase 4 | Event Bus + Timeline UI | 待开发 |
| Phase 5 | Permission Sandbox | 待开发 |
| Phase 6 | Git Snapshot + 变更回滚 | 待开发 |
| Phase 7 | MVP 集成联调 | 待开发 |

## 已实现功能

- Electron 桌面应用壳（1400x900，最小 1000x700）
- IPC 通信框架（文件读写/树形列表/监听、配置 CRUD、原生对话框）
- 文件树浏览器（递归目录、文件类型图标、展开/折叠）
- Monaco 代码编辑器（多标签页、脏标记、Ctrl+S 保存、可配置字体/Tab/换行/缩略图）
- 最近工作区记录（最多 8 个）
- 设置页面（主题切换：亮色/暗色/跟随系统、字体大小）
- shadcn/ui 组件库（Button、Dialog、DropdownMenu、Input、Tabs 等）
- 原子文件写入（先写 .tmp 再 rename）

## 相关文档

- [产品白皮书](./NOCODEFLOW白皮书.html)
- [产品介绍](./NOCODEFLOW产品介绍.html)
- [架构设计](./NOCODEFLOW架构设计.html)
- [开发计划](./开发大计划.md)
- [Phase 1 计划](./PHASE-1-PLAN.md)
- [Phase 2 计划](./计划-阶段二-Workspace与文件系统.md)
- [Phase 3 计划](./计划-阶段三-AgentRuntime与ClaudeAdapter.md)
- [协作规范](./COLLABORATION.md)

## 许可证

MIT
