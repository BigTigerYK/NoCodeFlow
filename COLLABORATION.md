# NoCodeFlow 两人合作开发文档

> 最后更新：2026-05-20
> 本文档是两人协作的唯一规范来源，所有协作问题以此为准。

---

## 一、角色分工

### A — 基座工程师

- **核心职责**：Electron 主进程 / IPC / 文件系统 / Agent Runtime 底层 / 安全沙箱 / Git 快照
- **技术栈重点**：Electron、Node.js、进程管理、文件 I/O、安全策略
- **启动时间**：项目第一天

### B — 智能与体验工程师

- **核心职责**：Claude Adapter 上层 / Chat UI / Timeline / Task Center / 文档智能 / 知识层
- **技术栈重点**：Claude API、React UI、PDF.js、向量检索、前端交互
- **启动时间**：A 完成阶段一 + 阶段二后（等 A 交接接口约定文档）

### B 等待期间可做的事

- 学习 Claude API / Anthropic SDK
- 调研 PDF.js、mammoth.js、marked 等库
- 搭 Chat UI / Timeline 的静态原型
- 搭建 mock server 模拟 Agent 输出

---

## 二、阶段分工总览

### A 独立完成（阶段 1-2）

| 阶段 | 内容 | 交付物 |
|---|---|---|
| 1 - 基础运行底座 | Electron + React + TS + Vite + shadcn/ui + IPC + electron-store | 可启动桌面窗口，主进程/渲染进程通信正常 |
| 2 - Workspace 与文件系统 | 打开文件夹、文件树、文件读写、Monaco Editor、Tab 管理 | 类 VS Code 的文件浏览和编辑工作区 |

**阶段 1-2 结束后，A 必须同步完成：**

1. 锁定所有共享接口定义（见第三节）
2. 产出 `INTERFACE-CONTRACT.md` 交给 B
3. 确保 `shared/types/` 目录完整可用

### A 的后续路线（系统层）

| 阶段 | 内容 |
|---|---|
| 3 | AgentAdapter 底层实现 + Sidecar Runtime 进程管理 |
| 5 | Permission Sandbox（PathValidator、CommandValidator、审计日志） |
| 6 | Git Snapshot 与变更回滚（checkpoint、Diff Engine、一键恢复） |
| 7 | MVP 集成联调 + Windows 打包 |
| 11 | Unified Context Engine — Code Context / Token 裁剪 |
| 12 | Memory Layer — 存储层、数据持久化 |
| 13 | Workflow Engine — 任务状态机、重试机制 |
| 14 | 多 LLM Adapter、权限模型 |
| 15 | 打包、性能优化、CI/CD |

### B 的路线（交互与智能层）

| 阶段 | 内容 |
|---|---|
| 3 | ClaudeAdapter 实现（Claude API 调用） + 用户消息发送 UI |
| 4 | Event Bus 实现 + Output Parser + Timeline UI |
| 7 | Chat UI + 权限确认弹窗 + Diff 查看 UI |
| 8 | Task Center（首页任务中心、最近项目、任务卡片） |
| 9 | Document Intelligence（PDF.js / mammoth.js / 文档查看器 / 文档问答） |
| 10 | Knowledge Layer（Embedding、向量检索、跨文档问答） |
| 11 | Unified Context Engine — Document / Knowledge Context |
| 12 | Memory Layer — 用户偏好 UI、记忆编辑 |
| 13 | Workflow Engine — 模板工作流、步骤编排 UI |
| 14 | Skill 管理 UI、插件市场 |
| 15 | 商业化 UI、用户引导、文档 |

### 后期共同推进（阶段 11-15）

| 阶段 | A 负责 | B 负责 |
|---|---|---|
| 11 | Code Context、Prompt Context Builder、Token 裁剪 | Document Context、Knowledge Context |
| 12 | 存储层、数据持久化 | 用户偏好 UI、记忆编辑界面 |
| 13 | 任务状态机、失败重试、人工确认节点 | 模板工作流、步骤编排 UI |
| 14 | 多 LLM Adapter、Capability-based 权限 | Skill 安装/管理 UI、插件市场 |
| 15 | 打包、性能优化、CI/CD | 商业化 UI、用户引导、产品文档 |

---

## 三、接口契约（INTERFACE CONTRACT）

> 以下接口定义在 `src/shared/types/` 中，是前后端通信的唯一真相来源。
> **修改任何接口必须双方 PR review 通过。**

### 3.1 Agent 相关

```typescript
// src/shared/types/agent.ts

export type AgentStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'error';

export interface AgentConfig {
  workspacePath: string;
  apiKey?: string;
  model?: string;
}

export type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; name: string; output: unknown; isError?: boolean }
  | { type: 'error'; message: string; code?: string }
  | { type: 'status'; status: AgentStatus };

export interface AgentAdapter {
  start(config: AgentConfig): Promise<void>;
  send(message: string): void;
  onOutput(callback: (event: AgentEvent) => void): void;
  onError(callback: (error: Error) => void): void;
  stop(): Promise<void>;
  getStatus(): AgentStatus;
}
```

### 3.2 工作区相关

```typescript
// src/shared/types/workspace.ts

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modifiedAt?: string;
}

export interface WorkspaceInfo {
  rootPath: string;
  isGit: boolean;
  fileTree: FileNode[];
  recentFiles?: string[];
}
```

### 3.3 权限相关

```typescript
// src/shared/types/permission.ts

export type PermissionAction = 'read' | 'write' | 'delete' | 'execute';
export type PermissionLevel = 'allow' | 'confirm' | 'deny';

export interface PermissionRequest {
  id: string;
  action: PermissionAction;
  target: string;       // 文件路径或命令
  reason: string;       // Agent 为什么需要这个权限
  agentId: string;
  timestamp: string;
}

export interface PermissionResponse {
  id: string;
  decision: 'allow' | 'deny' | 'always_allow';
  remember?: boolean;   // 是否记住此选择
}
```

### 3.4 快照相关

```typescript
// src/shared/types/snapshot.ts

export interface SnapshotInfo {
  id: string;
  timestamp: string;
  description: string;
  changedFiles: string[];
  agentMessageId?: string;
}

export interface DiffEntry {
  filePath: string;
  type: 'added' | 'modified' | 'deleted';
  oldContent?: string;
  newContent?: string;
  diff?: string;        // unified diff 格式
}
```

### 3.5 IPC 频道常量

```typescript
// src/shared/types/ipc.ts

export const IPC_CHANNELS = {
  // Agent
  AGENT_START:    'agent:start',
  AGENT_SEND:     'agent:send',
  AGENT_OUTPUT:   'agent:output',
  AGENT_STOP:     'agent:stop',
  AGENT_STATUS:   'agent:status',

  // 工作区
  WORKSPACE_OPEN:   'workspace:open',
  WORKSPACE_CLOSE:  'workspace:close',
  WORKSPACE_INFO:   'workspace:info',

  // 文件系统
  FS_READ:      'fs:read',
  FS_WRITE:     'fs:write',
  FS_TREE:      'fs:tree',
  FS_SEARCH:    'fs:search',
  FS_WATCH:     'fs:watch',
  FS_UNWATCH:   'fs:unwatch',

  // 权限
  PERMISSION_REQUEST:  'permission:request',
  PERMISSION_RESPONSE: 'permission:response',

  // 快照
  SNAPSHOT_CREATE:    'snapshot:create',
  SNAPSHOT_LIST:      'snapshot:list',
  SNAPSHOT_RESTORE:   'snapshot:restore',
  SNAPSHOT_DIFF:      'snapshot:diff',

  // 事件总线
  EVENT_BUS_EMIT:  'event-bus:emit',
  EVENT_BUS_ON:    'event-bus:on',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
```

### 3.6 接口变更规则

- 新增字段用 `optional (?)` 保持向后兼容
- 删除或重命名字段必须双方确认 + 全局搜索替换
- 重大变更需要在 PR 描述中写明影响范围和迁移方案
- 接口文件 (`shared/types/`) 的 PR 必须对方 approve 才能合入

---

## 四、项目目录结构

```
NoCodeFlow/
├── src/
│   ├── main/                    # Electron 主进程 [A 独占]
│   │   ├── agent/               #   Agent Runtime、Sidecar 管理
│   │   ├── security/            #   Permission Sandbox、路径校验
│   │   ├── git/                 #   Git Snapshot、Diff Engine
│   │   ├── ipc-handlers/        #   IPC handler 注册
│   │   ├── file-system/         #   文件读写、目录监听
│   │   └── index.ts             #   主进程入口
│   │
│   ├── renderer/                # React 前端
│   │   ├── components/
│   │   │   ├── chat/            #   Chat UI、消息列表        [B 独占]
│   │   │   ├── timeline/        #   Timeline 组件            [B 独占]
│   │   │   ├── editor/          #   Monaco Editor 集成       [A 独占]
│   │   │   ├── file-tree/       #   文件树组件               [A 独占]
│   │   │   ├── task-center/     #   任务中心                 [B 独占]
│   │   │   ├── document/        #   文档查看器               [B 独占]
│   │   │   ├── permission/      #   权限确认弹窗             [B 独占]
│   │   │   ├── diff/            #   Diff 查看器              [B 独占]
│   │   │   └── common/          #   共享 UI 组件             [共同维护，改前沟通]
│   │   ├── hooks/               #   React Hooks（按功能分）
│   │   ├── pages/               #   页面（按功能分）
│   │   ├── stores/              #   状态管理
│   │   └── App.tsx
│   │
│   ├── shared/                  # 共享代码 [共同维护，改前沟通]
│   │   ├── types/               #   TypeScript 类型定义
│   │   ├── constants/           #   常量
│   │   ├── event-bus/           #   事件总线
│   │   └── utils/               #   通用工具函数
│   │
│   ├── preload/                 # preload 脚本 [A 独占]
│   └── assets/                  # 静态资源
│
├── electron/                    # Electron 构建配置 [A 独占]
├── resources/                   # 应用图标等资源
├── package.json
├── tsconfig.json
├── vite.config.ts
├── INTERFACE-CONTRACT.md        # 接口约定文档 [A 产出，双方维护]
└── COLLABORATION.md             # 本文档
```

### 维护权限

| 目录 | 权限 | 规则 |
|---|---|---|
| `src/main/` | A 独占 | B 不直接修改 |
| `src/preload/` | A 独占 | B 不直接修改 |
| `src/renderer/components/editor/` | A 独占 | |
| `src/renderer/components/file-tree/` | A 独占 | |
| `src/renderer/components/chat/` | B 独占 | A 不直接修改 |
| `src/renderer/components/timeline/` | B 独占 | |
| `src/renderer/components/task-center/` | B 独占 | |
| `src/renderer/components/document/` | B 独占 | |
| `src/renderer/components/permission/` | B 独占 | |
| `src/renderer/components/diff/` | B 独占 | |
| `src/renderer/components/common/` | 共同维护 | 改前必须沟通 |
| `src/shared/` | 共同维护 | types 改动需双方 PR review |
| `src/services/agent/` | A 独占 | |
| `src/services/document/` | B 独占 | |
| `src/services/knowledge/` | B 独占 | |

---

## 五、Git 分支管理

### 分支策略

```
master                        ← 保护分支，只接受 PR
  ├── feature/phase1-foundation       A 独立开发
  ├── feature/phase2-workspace        A 独立开发
  ├── feature/phase3-agent-runtime    A 的分支
  ├── feature/phase3-claude-adapter   B 的分支（与 A 并行）
  ├── feature/phase4-timeline         B 的分支
  ├── feature/phase5-sandbox          A 的分支
  ├── feature/phase6-git-snapshot     A 的分支
  ├── feature/phase7-mvp              A+B 共同分支
  ├── feature/phase8-task-center      B 的分支
  ├── feature/phase9-document         B 的分支
  ├── feature/phase10-knowledge       B 的分支
  └── ...
```

### 分支命名规范

- `feature/phase<N>-<简短描述>`
- 例如：`feature/phase3-agent-runtime`、`feature/phase4-timeline`

### 提交规范

```
类型(范围): 简短描述

详细说明（可选）
```

- 类型：`feat` / `fix` / `refactor` / `docs` / `style` / `test` / `chore`
- 范围：`main` / `renderer` / `shared` / `agent` / `security` 等
- 示例：`feat(agent): implement ClaudeAdapter.start()`

### 合并规则

1. **每个阶段完成后**，通过 PR 合入 master
2. **PR 合入前**必须：
   - 代码能正常构建（`npm run build` 通过）
   - 功能可手动验证
   - 如果改了 `shared/types/`，必须对方 review
3. **合入 master 前**先 rebase：
   ```bash
   git fetch origin
   git rebase origin/master
   # 解决冲突后
   git push --force-with-lease
   ```

---

## 六、代码合并与冲突预防

### 6.1 预防策略

| 策略 | 说明 |
|---|---|
| 目录隔离 | A 和 B 在不同目录工作，物理上避免冲突 |
| 接口先行 | `shared/types/` 提前定义，减少后期改动 |
| feature 分支隔离 | 各自分支开发，不会互相影响 |
| 小步提交 | 每个功能点一个 commit，冲突时更容易解决 |

### 6.2 冲突解决流程

```
1. 发现冲突
   ↓
2. 先尝试自动 merge
   ↓
3. 如果冲突在各自独占目录 → 检查是否误改了对方文件
   ↓
4. 如果冲突在 shared/ 或共同目录 → 双方即时沟通
   ↓
5. 解决冲突后重新构建验证
   ↓
6. commit 并更新 PR
```

### 6.3 合并节奏

```
日常开发：
  各自在自己的 feature 分支开发，互不干扰

每周六同步：
  1. 各自 git fetch + git rebase origin/master
  2. 有冲突当场解决
  3. 讨论下周 shared/ 目录可能的改动
  4. 更新 INTERFACE-CONTRACT.md（如有变更）

阶段完成：
  1. 提交 PR
  2. 对方 review（特别是 shared/ 改动）
  3. 合入 master
  4. 各自 rebase 到最新 master
```

---

## 七、关键阻塞点与应对

| 阻塞场景 | 阻塞方 | 被阻塞方 | 应对方案 |
|---|---|---|---|
| AgentAdapter 接口未定义 | A | B | A 在阶段 2 结束前必须锁定接口并产出 INTERFACE-CONTRACT.md |
| IPC 通道未就绪 | A | B | A 在阶段 1 结束前封装好通用 IPC 工具函数 |
| Permission Sandbox 未完成 | A | B 的 Timeline | B 先 mock 权限响应（始终返回 allow），A 完成后替换 |
| Git Snapshot 未完成 | A | B 的 Diff UI | B 先用 mock diff 数据开发 UI，A 完成后对接真实数据 |
| Electron 主进程改动 | A | B 的构建 | A 改完主进程后确保 `npm run dev` 仍正常，B 才能继续开发 |
| shared/types/ 变更 | 任意一方 | 另一方 | 变更方提 PR，对方 review 通过后才合入 |

### Mock 策略

B 在等待 A 接口就绪时，可使用 mock 数据开发：

```typescript
// src/renderer/mocks/agent-mock.ts
export const mockAgentEvents: AgentEvent[] = [
  { type: 'text', content: '正在分析项目结构...' },
  { type: 'tool_use', id: '1', name: 'read_file', input: { path: 'src/index.ts' } },
  { type: 'tool_result', id: '1', name: 'read_file', output: '...' },
  { type: 'text', content: '已完成分析。' },
];

// src/renderer/mocks/diff-mock.ts
export const mockDiffEntries: DiffEntry[] = [
  {
    filePath: 'src/main.ts',
    type: 'modified',
    diff: '@@ -1,3 +1,4 @@\n+import { foo } from "./foo";\n ...',
  },
];
```

---

## 八、开发环境与工具

### 统一开发环境

| 工具 | 版本要求 |
|---|---|
| Node.js | >= 18.x |
| npm / pnpm | 最新稳定版 |
| TypeScript | >= 5.x |
| Git | >= 2.x |

### 共享配置文件（改前沟通）

- `package.json` — 依赖增减需告知对方
- `tsconfig.json` — 编译配置
- `vite.config.ts` — 构建配置
- `.eslintrc` / `.prettierrc` — 代码风格

### 推荐 VS Code 插件

- ESLint
- Prettier
- TypeScript Vue Plugin (Volar) 或相应 TS 插件
- GitLens

---

## 九、沟通机制

### 日常沟通

- **即时问题**：随时消息沟通，不阻塞等
- **接口变更**：先消息通知，再提 PR
- **阻塞问题**：第一时间告知对方，不要默默等待

### 每周同步（建议周六）

1. 各自汇报本周进展
2. 演示已完成的功能
3. 讨论下周计划
4. 同步 master，解决冲突
5. 更新本文档（如有变更）

### 文档维护

| 文档 | 负责人 | 更新时机 |
|---|---|---|
| `COLLABORATION.md`（本文档） | 双方 | 协作规则变更时 |
| `INTERFACE-CONTRACT.md` | A 产出，双方维护 | 接口变更时 |
| `README.md` | 双方 | 项目结构或使用方式变更时 |
| 代码内注释 | 各自负责自己的模块 | 代码变更时 |

---

## 十、里程碑检查点

| 里程碑 | 完成标志 | 验证方式 |
|---|---|---|
| M1 - 底座就绪 | Electron 应用能启动，IPC 通信正常 | `npm run dev` 打开窗口，发送 IPC 消息有响应 |
| M2 - 工作区就绪 | 能打开文件夹，显示文件树，编辑并保存文件 | 打开一个项目文件夹，浏览、编辑、保存文件 |
| M3 - Agent 可对话 | Claude Agent 能启动，用户能发消息，能看到输出 | 在 Chat UI 中发送消息，Agent 有回复 |
| M4 - Timeline 可视化 | 能看到 Agent 的 tool_use / text 等事件流 | Agent 执行任务时 Timeline 实时更新 |
| M5 - 安全沙箱 | Agent 只能操作工作区内文件，越权操作被拒绝 | 尝试让 Agent 访问工作区外文件，被拦截 |
| M6 - 变更可回滚 | 能查看 AI 修改了什么，能一键撤销 | Agent 修改文件后，查看 Diff，点击撤销恢复 |
| M7 - MVP 发布 | 以上所有功能串联，可 Windows 打包 | 完整走一遍：打开项目 → 对话 → Agent 改文件 → 查看 Diff → 撤销 |

---

## 附录：快速参考

### A 每天 first thing

```bash
git checkout master && git pull
git checkout feature/phaseX-xxx
git rebase master
```

### B 每天 first thing

```bash
git checkout master && git pull
git checkout feature/phaseX-xxx
git rebase master
```

### 提 PR 前检查清单

- [ ] `npm run build` 通过
- [ ] 功能可手动验证
- [ ] 如果改了 `shared/types/`，已通知对方
- [ ] commit message 符合规范
- [ ] 已 rebase 到最新 master
