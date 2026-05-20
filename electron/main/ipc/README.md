# IPC 处理模块

处理主进程与渲染进程之间的通信。

## 模块职责

- **filesystem.ts** - 文件读写、目录操作
- **agent.ts** - Agent 生命周期管理、消息收发
- **permission.ts** - 权限请求与确认
- **git.ts** - Git 快照、Diff、回滚
- **knowledge.ts** - 知识层相关操作

## IPC 通道

| 通道 | 说明 |
|------|------|
| fs:readFile | 读取文件 |
| fs:writeFile | 写入文件（需权限确认） |
| fs:readDir | 获取目录结构 |
| claude:start | 启动 Claude Agent |
| claude:send | 发送消息 |
| permission:request | 弹出权限确认框 |
