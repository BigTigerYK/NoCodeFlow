# NoCodeFlow

> AI 认知工作台 — 通过自然语言交互完成软件开发、论文写作、文献分析等任务。

## 项目简介

NoCodeFlow 是一款 AI 认知工作台，通过自然语言交互帮助用户完成软件开发、论文写作、文献分析、数据分析等任务。基于 Electron 桌面应用，集成 Claude Agent 实现 AI 驱动的文件操作、代码生成和智能对话。

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
| AI Agent | Claude CLI (Child Process) |
| Markdown 渲染 | react-markdown + remark-gfm |
| Diff 计算 | diff |

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

> 需要全局安装 Claude CLI：`npm install -g @anthropic-ai/claude-code`

## 项目结构

```
NoCodeFlow/
├── electron/                # Electron 主进程
│   ├── main/
│   │   ├── index.ts         #   主进程入口
│   │   ├── agent/           #   ClaudeAdapter（spawn claude CLI）
│   │   ├── ipc/             #   IPC handlers（fs/config/dialog/agent/permission/snapshot）
│   │   ├── window.ts        #   窗口管理
│   │   └── snapshot/        #   Git 快照引擎
│   └── preload/             #   contextBridge 暴露 window.api
├── src/                     # 渲染进程（React SPA）
│   ├── components/
│   │   ├── layout/          #   AppLayout、Sidebar、StatusBar
│   │   ├── Workspace/       #   文件树、Monaco 编辑器、标签页管理
│   │   ├── Agent/           #   ChatPanel、Timeline、消息气泡、状态指示
│   │   ├── Permission/      #   权限确认弹窗
│   │   ├── Snapshot/        #   快照面板、Diff 视图
│   │   ├── Common/          #   DiffViewer、Toast、Loading/Error 状态
│   │   ├── Settings/        #   设置页面（Agent 配置、主题）
│   │   ├── TaskCenter/      #   任务中心（阶段八开发中）
│   │   ├── KnowledgeBase/   #   知识库（阶段九规划中）
│   │   └── ui/              #   shadcn/ui 基础组件
│   ├── stores/              #   Zustand（workspace/agent/permission/snapshot）
│   ├── hooks/               #   useConfig、useResizable
│   └── lib/                 #   工具函数
├── shared/                  # 主进程与渲染进程共享代码
│   ├── types/               #   IPC 通道、配置、工作区、Agent、快照、权限类型
│   └── constants/           #   共享常量
└── resources/               # 应用图标等静态资源
```

## 架构概述

```
┌───────────────────────────────────────────────────────┐
│                    Electron App                        │
│                                                        │
│  ┌────────────────┐    IPC     ┌────────────────────┐  │
│  │  Main Process   │◄─────────►│     Renderer        │  │
│  │                │  (whitelist │    (React SPA)      │  │
│  │  - 文件系统     │  channels) │                     │  │
│  │  - 配置存储     │           │  - Workspace        │  │
│  │  - Agent运行时  │           │  - Agent Chat       │  │
│  │  - 权限沙箱     │           │  - Timeline         │  │
│  │  - Git快照      │           │  - Permission UI    │  │
│  └────────────────┘           └────────────────────┘  │
│         ▲                            ▲                 │
│         │      shared/types/         │                 │
│         └──── 类型契约 & 通道常量 ────┘                 │
└───────────────────────────────────────────────────────┘
```

**Agent 数据流**：
```
Renderer (ChatPanel) → IPC (AGENT_START/SEND/STOP) → Main (agent.ts)
  → ClaudeAdapter (spawn claude CLI, parse stream-json)
  → IPC (AGENT_OUTPUT/AGENT_STATUS events) → Renderer (useAgentStore)
```

- **主进程**：文件读写、配置持久化、原生对话框、Agent 运行时、权限校验、Git 快照
- **预加载脚本**：`contextBridge` 安全暴露 `window.api`，白名单校验 IPC 通道
- **渲染进程**：React SPA，Zustand 状态管理，通过 `window.api.invoke()` 与主进程通信
- **共享类型**：IPC 通道常量和数据接口，是主进程与渲染进程的唯一契约

## 已实现功能

| 模块 | 功能 |
|------|------|
| **工作空间** | 文件树浏览、Monaco 编辑器、多标签页、脏标记、语言检测 |
| **Agent** | Claude CLI 集成、流式消息、Markdown 渲染、会话管理 |
| **Timeline** | Agent 执行过程可视化（tool_use/tool_result/text/error 事件） |
| **权限沙箱** | 路径校验、工作区隔离、高危命令识别、权限确认弹窗 |
| **Git 快照** | 修改前 checkpoint、Diff 预览、一键恢复、非 Git 项目支持 |
| **设置** | Agent 配置管理（API Base/Key/Model）、主题切换（亮/暗/跟随系统） |
| **其他** | 最近工作区记录、原子文件写入、文件监听、响应式布局 |

## 开发阶段

| 版本 | 阶段 | 内容 | 状态 |
|:----:|------|------|:----:|
| **MVP** | 1–6 | 基础运行底座、文件系统、Agent、Timeline、权限、快照 | ✅ 已完成 |
| **MVP** | 7 | MVP 发布版（打包、签名、自动更新、稳定性） | 🔄 进行中 |
| **V1** | 8 | Task Center 与 Workspace 入口重构 | ⏳ 待开始 |
| **V1** | 9 | Document Intelligence 文档智能 | ⏳ 待开始 |
| **V2** | 10–12 | Knowledge Layer、Unified Context、Memory Layer | ⏳ 待开始 |
| **V3** | 13–15 | Workflow Engine、多 Agent、Cognitive Workspace | ⏳ 待开始 |

## 相关文档

| 文档 | 说明 |
|------|------|
| [开发大计划](./开发大计划-优化版.md) | 整体开发路线图（阶段一～十五） |
| [协作规范](./COLLABORATION.md) | 两人工位分工与协作流程 |
| [UI 设计计划书](./NOCODEFLOW产品ui设计计划书.html) | 完整 UI 设计规范 |
| [阶段七计划](./计划-阶段七-MVP发布版.md) | MVP 发布版详细计划 |
| [阶段八计划](./计划-阶段八-TaskCenter与Workspace入口重构.md) | Task Center 详细计划 |
| [阶段九计划](./计划-阶段九-DocumentIntelligence文档智能.md) | 文档智能详细计划 |

## 许可证

MIT
