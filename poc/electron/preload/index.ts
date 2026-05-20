import { contextBridge, ipcRenderer } from 'electron'

// 暴露 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件系统操作
  readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  showOpenDialog: () => ipcRenderer.invoke('fs:showOpenDialog'),
  
  // Claude Code 会话管理
  startClaudeSession: (workingDirectory: string) => ipcRenderer.invoke('claude:startSession', workingDirectory),
  sendClaudeMessage: (message: string) => ipcRenderer.invoke('claude:sendMessage', message),
  stopClaudeSession: () => ipcRenderer.invoke('claude:stopSession'),
  
  // Claude Code 事件监听
  onClaudeOutput: (callback: (data: string) => void) => {
    ipcRenderer.on('claude:output', (event, data) => callback(data))
  },
  onClaudeError: (callback: (data: string) => void) => {
    ipcRenderer.on('claude:error', (event, data) => callback(data))
  },
  onClaudeClosed: (callback: (code: number | null) => void) => {
    ipcRenderer.on('claude:closed', (event, code) => callback(code))
  },
  
  // 权限请求
  requestPermission: (permissionType: string, details: string) => 
    ipcRenderer.invoke('permission:request', permissionType, details),
  
  // 移除监听器
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
})
