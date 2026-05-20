# 阶段一实施计划：基础运行底座

> 负责人：A（基座工程师）
> 预计工期：2 周（业余时间）
> 前置条件：无（项目起点）
> 最后更新：2026-05-20

---

## 一、阶段目标

完成 NoCodeFlow 的桌面应用基础框架，使应用能够：

- 安装并启动，显示主窗口
- 主进程与渲染进程安全通信
- 读写本地配置文件
- 展示基础 UI 框架（侧边栏 + 主内容区 + 设置页）

**本阶段结束后，B 可以基于此框架开始阶段三的开发。**

---

## 二、技术选型确认

基于 PoC 验证结果，正式开发采用以下技术栈：

| 类别 | 选型 | 版本 | 说明 |
|------|------|------|------|
| 桌面框架 | Electron | >= 28 | PoC 已验证可行 |
| 前端框架 | React | 18 | |
| 语言 | TypeScript | >= 5.x | 全项目统一 |
| 构建工具 | Vite | >= 5 | 配合 vite-plugin-electron |
| UI 组件库 | shadcn/ui | latest | 基于 Radix UI + Tailwind |
| CSS 框架 | Tailwind CSS | >= 3 | shadcn/ui 依赖 |
| 配置存储 | electron-store | >= 8 | 持久化用户设置 |
| 打包工具 | electron-builder | latest | Windows 安装包 |

---

## 三、目录结构设计

```
NoCodeFlow/
├── electron/                      # 主进程代码
│   ├── main/
│   │   ├── index.ts               # 主进程入口
│   │   ├── window.ts              # 窗口管理
│   │   ├── ipc/
│   │   │   ├── index.ts           # IPC handler 注册入口
│   │   │   ├── fs.ts              # 文件系统相关 IPC
│   │   │   ├── config.ts          # 配置存储相关 IPC
│   │   │   └── dialog.ts          # 系统对话框相关 IPC
│   │   └── store/
│   │       └── config.ts          # electron-store 实例
│   └── preload/
│       └── index.ts               # preload 脚本（安全桥接）
│
├── src/                           # 渲染进程代码（React 前端）
│   ├── App.tsx                    # 根组件
│   ├── main.tsx                   # React 入口
│   ├── index.html                 # HTML 模板
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx      # 主布局（侧边栏 + 内容区）
│   │   │   ├── Sidebar.tsx        # 侧边栏
│   │   │   ├── StatusBar.tsx      # 底部状态栏
│   │   │   └── TitleBar.tsx       # 自定义标题栏（可选）
│   │   ├── settings/
│   │   │   ├── SettingsPage.tsx   # 设置页面
│   │   │   └── GeneralSettings.tsx # 通用设置
│   │   └── common/
│   │       ├── Button.tsx         # shadcn/ui 按钮
│   │       └── ...                # 其他通用组件
│   │
│   ├── hooks/
│   │   ├── useConfig.ts           # 配置读写 hook
│   │   └── useIpc.ts              # IPC 通信 hook
│   │
│   ├── stores/
│   │   └── appStore.ts            # 全局状态（Zustand 或 React Context）
│   │
│   └── lib/
│       └── utils.ts               # shadcn/ui 工具函数
│
├── shared/                        # 共享代码（主进程 + 渲染进程共用）
│   ├── types/
│   │   ├── index.ts               # 类型导出入口
│   │   ├── ipc.ts                 # IPC 频道常量
│   │   ├── config.ts              # 配置结构类型
│   │   └── agent.ts               # Agent 相关类型（预留）
│   └── constants/
│       └── index.ts               # 全局常量
│
├── resources/                     # 应用资源
│   └── icon.ico                   # 应用图标
│
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── components.json                # shadcn/ui 配置
├── electron-builder.yml           # 打包配置
└── .gitignore
```

---

## 四、任务分解

### 任务 1：项目初始化与构建配置

**目标**：搭建 Electron + React + TypeScript + Vite 项目，确保 `npm run dev` 能启动窗口。

**步骤**：

1. 在项目根目录初始化 `package.json`：
   ```json
   {
     "name": "nocodeflow",
     "version": "0.1.0",
     "main": "dist-electron/main/index.js",
     "scripts": {
       "dev": "vite",
       "build": "tsc && vite build",
       "preview": "vite preview",
       "electron:dev": "vite --mode electron",
       "electron:build": "vite build && electron-builder"
     }
   }
   ```

2. 安装核心依赖：
   ```bash
   # 运行时依赖
   npm install react react-dom electron-store

   # 开发依赖
   npm install -D electron vite \
     vite-plugin-electron vite-plugin-electron-renderer \
     @types/react @types/react-dom typescript \
     electron-builder
   ```

3. 配置 `vite.config.ts`：
   ```typescript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   import electron from 'vite-plugin-electron';
   import electronRenderer from 'vite-plugin-electron-renderer';
   import path from 'path';

   export default defineConfig({
     plugins: [
       react(),
       electron([
         {
           entry: 'electron/main/index.ts',
           vite: {
             build: {
               outDir: 'dist-electron/main',
               rollupOptions: {
                 external: ['electron'],
               },
             },
           },
         },
         {
           entry: 'electron/preload/index.ts',
           onstart(args) {
             args.reload();
           },
           vite: {
             build: {
               outDir: 'dist-electron/preload',
               rollupOptions: {
                 external: ['electron'],
               },
             },
           },
         },
       ]),
       electronRenderer(),
     ],
     resolve: {
       alias: {
         '@': path.resolve(__dirname, 'src'),
         '@shared': path.resolve(__dirname, 'shared'),
       },
     },
   });
   ```

4. 配置 `tsconfig.json`：
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "jsx": "react-jsx",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "isolatedModules": true,
       "noEmit": true,
       "baseUrl": ".",
       "paths": {
         "@/*": ["src/*"],
         "@shared/*": ["shared/*"]
       }
     },
     "include": ["src/**/*", "shared/**/*"],
     "exclude": ["node_modules", "dist", "dist-electron"]
   }
   ```

5. 创建 `src/index.html`、`src/main.tsx`、`src/App.tsx` 最小文件。

**验证标准**：`npm run dev` 启动后弹出 Electron 窗口，显示 "Hello NoCodeFlow"。

---

### 任务 2：主进程与 preload 安全桥接

**目标**：建立安全的主进程/渲染进程通信基础。

**步骤**：

1. 创建 `electron/main/index.ts` — 主进程入口：
   ```typescript
   import { app, BrowserWindow } from 'electron';
   import { createMainWindow } from './window';

   app.whenReady().then(() => {
     createMainWindow();
   });

   app.on('window-all-closed', () => {
     if (process.platform !== 'darwin') app.quit();
   });
   ```

2. 创建 `electron/main/window.ts` — 窗口管理：
   ```typescript
   import { BrowserWindow, shell } from 'electron';
   import path from 'path';

   let mainWindow: BrowserWindow | null = null;

   export function createMainWindow(): BrowserWindow {
     mainWindow = new BrowserWindow({
       width: 1400,
       height: 900,
       minWidth: 1000,
       minHeight: 700,
       title: 'NoCodeFlow',
       webPreferences: {
         preload: path.join(__dirname, '../preload/index.js'),
         contextIsolation: true,
         nodeIntegration: false,
         sandbox: false,
       },
     });

     // 开发模式加载 Vite dev server，生产模式加载打包文件
     if (process.env.VITE_DEV_SERVER_URL) {
       mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
     } else {
       mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
     }

     // 外部链接用系统浏览器打开
     mainWindow.webContents.setWindowOpenHandler(({ url }) => {
       shell.openExternal(url);
       return { action: 'deny' };
     });

     return mainWindow;
   }

   export function getMainWindow(): BrowserWindow | null {
     return mainWindow;
   }
   ```

3. 创建 `electron/preload/index.ts` — 安全桥接：
   ```typescript
   import { contextBridge, ipcRenderer } from 'electron';
   import { IPC_CHANNELS } from '@shared/types/ipc';

   // 安全地暴露 IPC 方法给渲染进程
   const api = {
     // 通用 invoke（渲染进程调用主进程方法，等待返回）
     invoke: (channel: string, ...args: unknown[]) => {
       const allowedChannels = Object.values(IPC_CHANNELS);
       if (allowedChannels.includes(channel as any)) {
         return ipcRenderer.invoke(channel, ...args);
       }
       return Promise.reject(new Error(`Channel "${channel}" is not allowed`));
     },

     // 通用 on（监听主进程推送的消息）
     on: (channel: string, callback: (...args: unknown[]) => void) => {
       const allowedChannels = [
         IPC_CHANNELS.AGENT_OUTPUT,
         IPC_CHANNELS.FS_WATCH,
         IPC_CHANNELS.PERMISSION_REQUEST,
       ];
       if (allowedChannels.includes(channel as any)) {
         const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
           callback(...args);
         ipcRenderer.on(channel, subscription);
         return () => { ipcRenderer.removeListener(channel, subscription); };
       }
       return () => {};
     },
   };

   contextBridge.exposeInMainWorld('api', api);
   ```

4. 创建 `shared/types/ipc.ts` — IPC 频道常量（供主进程和渲染进程共用）：
   ```typescript
   export const IPC_CHANNELS = {
     // 文件系统
     FS_READ:       'fs:read',
     FS_WRITE:      'fs:write',
     FS_TREE:       'fs:tree',
     FS_OPEN_DIALOG:'fs:open-dialog',
     FS_WATCH:      'fs:watch',
     FS_UNWATCH:    'fs:unwatch',

     // 配置
     CONFIG_GET:    'config:get',
     CONFIG_SET:    'config:set',
     CONFIG_GET_ALL:'config:get-all',
     CONFIG_DELETE: 'config:delete',

     // 对话框
     DIALOG_MESSAGE:'dialog:message',

     // Agent（预留）
     AGENT_START:   'agent:start',
     AGENT_SEND:    'agent:send',
     AGENT_OUTPUT:  'agent:output',
     AGENT_STOP:    'agent:stop',
     AGENT_STATUS:  'agent:status',

     // 权限（预留）
     PERMISSION_REQUEST:  'permission:request',
     PERMISSION_RESPONSE: 'permission:response',
   } as const;

   export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
   ```

5. 创建 `src/types/electron.d.ts` — 全局类型声明：
   ```typescript
   interface ElectronApi {
     invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
     on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
   }

   declare global {
     interface Window {
       api: ElectronApi;
     }
   }

   export {};
   ```

**验证标准**：渲染进程能通过 `window.api.invoke` 调用主进程方法，主进程能正确响应。

---

### 任务 3：IPC 通信封装

**目标**：封装易用的 IPC 工具函数和 React Hook，让后续开发直接调用。

**步骤**：

1. 创建 `electron/main/ipc/index.ts` — IPC handler 注册入口：
   ```typescript
   import { ipcMain } from 'electron';
   import { IPC_CHANNELS } from '@shared/types/ipc';
   import { registerFsHandlers } from './fs';
   import { registerConfigHandlers } from './config';
   import { registerDialogHandlers } from './dialog';

   export function registerAllIpcHandlers(): void {
     registerFsHandlers();
     registerConfigHandlers();
     registerDialogHandlers();
   }
   ```

2. 创建 `electron/main/ipc/config.ts` — 配置相关 IPC：
   ```typescript
   import { ipcMain } from 'electron';
   import { IPC_CHANNELS } from '@shared/types/ipc';
   import { configStore } from '../store/config';

   export function registerConfigHandlers(): void {
     ipcMain.handle(IPC_CHANNELS.CONFIG_GET, (_event, key: string) => {
       return configStore.get(key);
     });

     ipcMain.handle(IPC_CHANNELS.CONFIG_SET, (_event, key: string, value: unknown) => {
       configStore.set(key, value);
     });

     ipcMain.handle(IPC_CHANNELS.CONFIG_GET_ALL, () => {
       return configStore.store;
     });

     ipcMain.handle(IPC_CHANNELS.CONFIG_DELETE, (_event, key: string) => {
       configStore.delete(key);
     });
   }
   ```

3. 创建 `electron/main/ipc/dialog.ts` — 对话框 IPC：
   ```typescript
   import { ipcMain, dialog } from 'electron';
   import { IPC_CHANNELS } from '@shared/types/ipc';
   import { getMainWindow } from '../window';

   export function registerDialogHandlers(): void {
     ipcMain.handle(IPC_CHANNELS.DIALOG_MESSAGE, async (_event, options) => {
       const win = getMainWindow();
       if (!win) return null;
       return dialog.showMessageBox(win, options as Electron.MessageBoxOptions);
     });
   }
   ```

4. 创建 `electron/main/ipc/fs.ts` — 文件系统 IPC（本阶段只需 open-dialog，完整读写在阶段二实现）：
   ```typescript
   import { ipcMain, dialog } from 'electron';
   import { IPC_CHANNELS } from '@shared/types/ipc';
   import { getMainWindow } from '../window';

   export function registerFsHandlers(): void {
     // 打开文件夹选择对话框
     ipcMain.handle(IPC_CHANNELS.FS_OPEN_DIALOG, async () => {
       const win = getMainWindow();
       if (!win) return null;
       const result = await dialog.showOpenDialog(win, {
         properties: ['openDirectory'],
       });
       if (result.canceled) return null;
       return result.filePaths[0];
     });
   }
   ```

5. 创建 `src/hooks/useIpc.ts` — React Hook：
   ```typescript
   import { useCallback } from 'react';
   import { IPC_CHANNELS } from '@shared/types/ipc';

   type Channel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

   export function useIpc() {
     const invoke = useCallback(async <T = unknown>(channel: Channel, ...args: unknown[]): Promise<T> => {
       return window.api.invoke(channel, ...args) as Promise<T>;
     }, []);

     const on = useCallback((channel: Channel, callback: (...args: unknown[]) => void) => {
       return window.api.on(channel, callback);
     }, []);

     return { invoke, on };
   }
   ```

**验证标准**：在 React 组件中调用 `useIpc().invoke(IPC_CHANNELS.CONFIG_GET, 'test')` 能正确返回主进程的值。

---

### 任务 4：electron-store 配置存储

**目标**：实现用户配置的持久化存储。

**步骤**：

1. 创建 `electron/main/store/config.ts`：
   ```typescript
   import Store from 'electron-store';

   interface ConfigSchema {
     general: {
       language: string;
       theme: 'light' | 'dark' | 'system';
       fontSize: number;
     };
     editor: {
       tabSize: number;
       wordWrap: 'on' | 'off';
       minimap: boolean;
     };
     recentWorkspaces: string[];
   }

   const defaults: ConfigSchema = {
     general: {
       language: 'zh-CN',
       theme: 'system',
       fontSize: 14,
     },
     editor: {
       tabSize: 2,
       wordWrap: 'on',
       minimap: true,
     },
     recentWorkspaces: [],
   };

   export const configStore = new Store<ConfigSchema>({
     name: 'nocodeflow-config',
     defaults,
   });
   ```

2. 创建 `shared/types/config.ts` — 配置类型（渲染进程也需要用）：
   ```typescript
   export interface AppConfig {
     general: {
       language: string;
       theme: 'light' | 'dark' | 'system';
       fontSize: number;
     };
     editor: {
       tabSize: number;
       wordWrap: 'on' | 'off';
       minimap: boolean;
     };
     recentWorkspaces: string[];
   }

   export const DEFAULT_CONFIG: AppConfig = {
     general: {
       language: 'zh-CN',
       theme: 'system',
       fontSize: 14,
     },
     editor: {
       tabSize: 2,
       wordWrap: 'on',
       minimap: true,
     },
     recentWorkspaces: [],
   };
   ```

3. 创建 `src/hooks/useConfig.ts` — 配置读写 Hook：
   ```typescript
   import { useState, useEffect, useCallback } from 'react';
   import { IPC_CHANNELS } from '@shared/types/ipc';
   import { AppConfig, DEFAULT_CONFIG } from '@shared/types/config';

   export function useConfig() {
     const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       window.api.invoke(IPC_CHANNELS.CONFIG_GET_ALL)
         .then((data) => {
           setConfig({ ...DEFAULT_CONFIG, ...(data as Partial<AppConfig>) });
         })
         .finally(() => setLoading(false));
     }, []);

     const updateConfig = useCallback(async <K extends keyof AppConfig>(
       key: K,
       value: AppConfig[K]
     ) => {
       setConfig(prev => ({ ...prev, [key]: value }));
       await window.api.invoke(IPC_CHANNELS.CONFIG_SET, key, value);
     }, []);

     return { config, updateConfig, loading };
   }
   ```

**验证标准**：修改设置后重启应用，配置仍然保持。

---

### 任务 5：Tailwind CSS + shadcn/ui 集成

**目标**：搭建 UI 样式基础，安装 shadcn/ui 组件库。

**步骤**：

1. 安装 Tailwind CSS：
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

2. 配置 `tailwind.config.js`：
   ```javascript
   /** @type {import('tailwindcss').Config} */
   module.exports = {
     darkMode: ['class'],
     content: ['./src/**/*.{ts,tsx}', './components.json'],
     theme: {
       extend: {
         colors: {
           border: 'hsl(var(--border))',
           background: 'hsl(var(--background))',
           foreground: 'hsl(var(--foreground))',
           primary: {
             DEFAULT: 'hsl(var(--primary))',
             foreground: 'hsl(var(--primary-foreground))',
           },
           muted: {
             DEFAULT: 'hsl(var(--muted))',
             foreground: 'hsl(var(--muted-foreground))',
           },
           accent: {
             DEFAULT: 'hsl(var(--accent))',
             foreground: 'hsl(var(--accent-foreground))',
           },
           // ... shadcn/ui 需要的其他颜色
         },
         borderRadius: {
           lg: 'var(--radius)',
           md: 'calc(var(--radius) - 2px)',
           sm: 'calc(var(--radius) - 4px)',
         },
       },
     },
   };
   ```

3. 创建 `src/index.css`（Tailwind 入口 + CSS 变量）：
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;

   @layer base {
     :root {
       --background: 0 0% 100%;
       --foreground: 222.2 84% 4.9%;
       --primary: 221.2 83.2% 53.3%;
       --primary-foreground: 210 40% 98%;
       --muted: 210 40% 96.1%;
       --muted-foreground: 215.4 16.3% 46.9%;
       --border: 214.3 31.8% 91.4%;
       --radius: 0.5rem;
     }

     .dark {
       --background: 222.2 84% 4.9%;
       --foreground: 210 40% 98%;
       --primary: 217.2 91.2% 59.8%;
       --primary-foreground: 222.2 47.4% 11.2%;
       --muted: 217.2 32.6% 17.5%;
       --muted-foreground: 215 20.2% 65.1%;
       --border: 217.2 32.6% 17.5%;
     }
   }

   body {
     @apply bg-background text-foreground;
     font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
   }
   ```

4. 初始化 shadcn/ui：
   ```bash
   npx shadcn-ui@latest init
   ```

5. 安装基础组件：
   ```bash
   npx shadcn-ui@latest add button
   npx shadcn-ui@latest add input
   npx shadcn-ui@latest add dialog
   npx shadcn-ui@latest add dropdown-menu
   npx shadcn-ui@latest add tabs
   npx shadcn-ui@latest add scroll-area
   npx shadcn-ui@latest add separator
   ```

**验证标准**：在 App.tsx 中使用 shadcn/ui 的 Button 组件，样式正确渲染。

---

### 任务 6：主布局框架

**目标**：搭建应用的主界面布局。

**步骤**：

1. 创建 `src/components/layout/AppLayout.tsx`：
   ```tsx
   import { Sidebar } from './Sidebar';
   import { StatusBar } from './StatusBar';

   interface AppLayoutProps {
   }

   export function AppLayout({  }: AppLayoutProps) {
     return (
       <div className="h-screen flex flex-col">
         {/* 主内容区 */}
         <div className="flex-1 flex overflow-hidden">
           {/* 侧边栏 */}
           <Sidebar />

           {/* 内容区 */}
           <main className="flex-1 overflow-auto">
             {/* 子路由或内容插槽 */}
           </main>
         </div>

         {/* 状态栏 */}
         <StatusBar />
       </div>
     );
   }
   ```

2. 创建 `src/components/layout/Sidebar.tsx`：
   ```tsx
   import { useState } from 'react';
   import { Button } from '@/components/ui/button';

   type SidebarTab = 'explorer' | 'search' | 'settings';

   export function Sidebar() {
     const [activeTab, setActiveTab] = useState<SidebarTab>('explorer');

     return (
       <aside className="w-60 border-r flex flex-col bg-muted/30">
         {/* 侧边栏图标栏 */}
         <div className="flex flex-col items-center py-2 gap-1 border-b">
           <Button
             variant={activeTab === 'explorer' ? 'secondary' : 'ghost'}
             size="icon"
             onClick={() => setActiveTab('explorer')}
             title="资源管理器"
           >
             {/* 文件夹图标 */}
           </Button>
           <Button
             variant={activeTab === 'search' ? 'secondary' : 'ghost'}
             size="icon"
             onClick={() => setActiveTab('search')}
             title="搜索"
           >
             {/* 搜索图标 */}
           </Button>
           <Button
             variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
             size="icon"
             onClick={() => setActiveTab('settings')}
             title="设置"
           >
             {/* 设置图标 */}
           </Button>
         </div>

         {/* 侧边栏内容 */}
         <div className="flex-1 overflow-auto p-2">
           {activeTab === 'explorer' && <div>资源管理器（阶段二实现）</div>}
           {activeTab === 'search' && <div>搜索（阶段二实现）</div>}
           {activeTab === 'settings' && <div>设置面板</div>}
         </div>
       </aside>
     );
   }
   ```

3. 创建 `src/components/layout/StatusBar.tsx`：
   ```tsx
   export function StatusBar() {
     return (
       <footer className="h-6 border-t flex items-center px-3 text-xs text-muted-foreground bg-muted/30">
         <span>NoCodeFlow v0.1.0</span>
         <span className="ml-auto">就绪</span>
       </footer>
     );
   }
   ```

4. 更新 `src/App.tsx` 使用布局：
   ```tsx
   import { AppLayout } from './components/layout/AppLayout';
   import './index.css';

   function App() {
     return <AppLayout />;
   }

   export default App;
   ```

**验证标准**：应用启动后显示侧边栏 + 主内容区 + 状态栏的布局框架。

---

### 任务 7：基础设置页面

**目标**：实现一个可用的设置页面，验证 electron-store 能正常工作。

**步骤**：

1. 创建 `src/components/settings/SettingsPage.tsx`：
   ```tsx
   import { useConfig } from '@/hooks/useConfig';
   import { GeneralSettings } from './GeneralSettings';

   export function SettingsPage() {
     const { config, updateConfig, loading } = useConfig();

     if (loading) return <div>加载中...</div>;

     return (
       <div className="p-6 max-w-2xl">
         <h1 className="text-2xl font-bold mb-6">设置</h1>
         <GeneralSettings
           config={config.general}
           onChange={(general) => updateConfig('general', general)}
         />
       </div>
     );
   }
   ```

2. 创建 `src/components/settings/GeneralSettings.tsx`：
   ```tsx
   import { AppConfig } from '@shared/types/config';

   interface Props {
     config: AppConfig['general'];
     onChange: (config: AppConfig['general']) => void;
   }

   export function GeneralSettings({ config, onChange }: Props) {
     return (
       <section className="space-y-4">
         <h2 className="text-lg font-semibold">通用</h2>

         {/* 主题 */}
         <div className="flex items-center justify-between">
           <label>主题</label>
           <select
             value={config.theme}
             onChange={(e) => onChange({ ...config, theme: e.target.value as any })}
             className="border rounded px-2 py-1"
           >
             <option value="light">浅色</option>
             <option value="dark">深色</option>
             <option value="system">跟随系统</option>
           </select>
         </div>

         {/* 字体大小 */}
         <div className="flex items-center justify-between">
           <label>字体大小</label>
           <input
             type="number"
             value={config.fontSize}
             onChange={(e) => onChange({ ...config, fontSize: Number(e.target.value) })}
             min={12}
             max={24}
             className="border rounded px-2 py-1 w-20"
           />
         </div>
       </section>
     );
   }
   ```

**验证标准**：打开设置页 → 修改主题 → 关闭应用 → 重新打开 → 设置保持。

---

### 任务 8：electron-builder 打包配置

**目标**：配置 Windows 安装包打包。

**步骤**：

1. 创建 `electron-builder.yml`：
   ```yaml
   appId: com.nocodeflow.app
   productName: NoCodeFlow
   directories:
     buildResources: resources
     output: release
   files:
     - dist/**/*
     - dist-electron/**/*
   win:
     target:
       - target: nsis
         arch: [x64]
     icon: resources/icon.ico
   nsis:
     oneClick: false
     allowToChangeInstallationDirectory: true
     createDesktopShortcut: true
     createStartMenuShortcut: true
   ```

2. 准备应用图标 `resources/icon.ico`（256x256）。

3. 添加打包脚本到 `package.json`：
   ```json
   {
     "scripts": {
       "build:win": "vite build && electron-builder --win"
     }
   }
   ```

**验证标准**：`npm run build:win` 成功生成 `release/` 目录下的 `.exe` 安装包。

---

## 五、shared/types 完整定义（阶段一产出）

阶段一结束后，`shared/types/` 目录应包含以下文件，作为 A 交给 B 的接口契约：

| 文件 | 内容 | 说明 |
|------|------|------|
| `ipc.ts` | IPC_CHANNELS 常量 | 所有前后端通信频道 |
| `config.ts` | AppConfig 接口 + DEFAULT_CONFIG | 配置结构 |
| `agent.ts` | AgentAdapter、AgentEvent、AgentStatus 类型 | 预留，B 阶段三使用 |
| `workspace.ts` | FileNode、WorkspaceInfo 类型 | 预留，B 阶段三使用 |
| `index.ts` | 统一导出 | |

`shared/types/agent.ts` 和 `shared/types/workspace.ts` 在阶段一就创建好类型定义（即使主进程还没实现），这样 B 可以提前基于类型开发 UI。

---

## 六、里程碑与验证清单

| 里程碑 | 完成标志 | 验证方式 |
|--------|----------|----------|
| M1.1 项目能启动 | Electron 窗口弹出 | `npm run dev` 看到窗口 |
| M1.2 IPC 通信正常 | 前端能调用主进程方法 | 控制台打印 IPC 返回值 |
| M1.3 配置可持久化 | 设置重启后保持 | 修改设置 → 重启 → 验证 |
| M1.4 UI 框架就绪 | shadcn/ui 组件可渲染 | 页面上看到正确的按钮样式 |
| M1.5 主布局完成 | 侧边栏 + 内容区 + 状态栏 | 视觉验证 |
| M1.6 设置页可用 | 能修改并保存设置 | 修改主题 → 重启 → 保持 |
| M1.7 打包成功 | 生成 .exe 安装包 | 双击安装 → 启动 → 正常运行 |

---

## 七、文件产出清单

阶段一完成后，应新增以下文件（不含 node_modules）：

```
NoCodeFlow/
├── electron/
│   ├── main/
│   │   ├── index.ts               ✅ 主进程入口
│   │   ├── window.ts              ✅ 窗口管理
│   │   ├── ipc/
│   │   │   ├── index.ts           ✅ IPC 注册入口
│   │   │   ├── fs.ts              ✅ 文件系统 IPC
│   │   │   ├── config.ts          ✅ 配置 IPC
│   │   │   └── dialog.ts          ✅ 对话框 IPC
│   │   └── store/
│   │       └── config.ts          ✅ electron-store 实例
│   └── preload/
│       └── index.ts               ✅ preload 安全桥接
│
├── src/
│   ├── main.tsx                   ✅ React 入口
│   ├── App.tsx                    ✅ 根组件
│   ├── index.html                 ✅ HTML 模板
│   ├── index.css                  ✅ Tailwind + CSS 变量
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx      ✅ 主布局
│   │   │   ├── Sidebar.tsx        ✅ 侧边栏
│   │   │   └── StatusBar.tsx      ✅ 状态栏
│   │   ├── settings/
│   │   │   ├── SettingsPage.tsx   ✅ 设置页
│   │   │   └── GeneralSettings.tsx ✅ 通用设置
│   │   └── ui/                    ✅ shadcn/ui 组件
│   ├── hooks/
│   │   ├── useIpc.ts              ✅ IPC Hook
│   │   └── useConfig.ts           ✅ 配置 Hook
│   └── lib/
│       └── utils.ts               ✅ 工具函数
│
├── shared/
│   ├── types/
│   │   ├── index.ts               ✅ 统一导出
│   │   ├── ipc.ts                 ✅ IPC 频道常量
│   │   ├── config.ts              ✅ 配置类型
│   │   ├── agent.ts               ✅ Agent 类型（预留）
│   │   └── workspace.ts           ✅ 工作区类型（预留）
│   └── constants/
│       └── index.ts               ✅ 全局常量
│
├── resources/
│   └── icon.ico                   ✅ 应用图标
│
├── package.json                   ✅
├── tsconfig.json                  ✅
├── tsconfig.node.json             ✅
├── vite.config.ts                 ✅
├── tailwind.config.js             ✅
├── postcss.config.js              ✅
├── components.json                ✅ shadcn/ui 配置
├── electron-builder.yml           ✅ 打包配置
└── .gitignore                     ✅
```

---

## 八、阶段一结束后移交给 B 的内容

| 移交物 | 说明 |
|--------|------|
| `shared/types/` 目录 | 完整的类型定义，B 直接 import 使用 |
| `src/hooks/useIpc.ts` | B 通过此 Hook 与主进程通信 |
| `src/hooks/useConfig.ts` | B 通过此 Hook 读写配置 |
| `src/components/ui/` | shadcn/ui 组件，B 直接使用 |
| `src/components/layout/` | 主布局，B 在内容区放置自己的页面 |
| `electron/main/ipc/index.ts` | B 后续新增 IPC handler 的注册入口 |
| 可运行的桌面应用 | B clone 后 `npm run dev` 即可开发 |

---

## 九、风险与应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| electron-store 在打包后路径异常 | 中 | 配置丢失 | 使用 `app.getPath('userData')` 显式指定路径 |
| vite-plugin-electron 版本不兼容 | 低 | 构建失败 | 锁定版本，参考 PoC 的 vite.config.ts |
| shadcn/ui 初始化报错 | 低 | UI 无法渲染 | 手动创建组件，不依赖 CLI |
| Windows 打包缺少运行时 | 中 | 安装包无法启动 | 在干净机器上测试安装包 |
| preload 脚本加载顺序问题 | 低 | IPC 不可用 | 确保 preload 在 main.ts 中正确配置路径 |

---

## 十、PoC 代码复用说明

PoC（`poc/` 目录）中已验证的代码可以参考，但**不直接复制到正式项目**：

| PoC 代码 | 复用方式 |
|----------|----------|
| `poc/electron/main/index.ts` | 参考窗口创建逻辑，重写为正式结构 |
| `poc/electron/preload/index.ts` | 参考 contextBridge 用法，增加频道白名单 |
| `poc/vite.config.ts` | 参考插件配置，直接复用 |
| `poc/src/components/FileTree.tsx` | 阶段二再复用 |
| `poc/src/components/Chat.tsx` | 阶段三再复用 |
