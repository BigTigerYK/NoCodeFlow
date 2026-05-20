# 预加载脚本

在渲染进程中安全暴露主进程 API。

## 职责

- 通过 `contextBridge` 暴露安全的 API 给前端
- 保持 `contextIsolation` 启用
- 不直接暴露 Node.js 或 Electron 原生模块

## 暴露的 API

```typescript
window.electronAPI = {
  // 文件系统
  readDir, readFile, writeFile, showOpenDialog,
  // Agent 交互
  startClaudeSession, sendClaudeMessage, stopClaudeSession,
  onClaudeOutput, onClaudeError, onClaudeClosed,
  // 权限
  requestPermission,
  // 工具
  removeAllListeners
}
```
