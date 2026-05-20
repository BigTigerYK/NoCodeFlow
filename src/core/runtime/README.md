# 运行时管理

管理 Claude CLI 等外部运行时的生命周期。

## 职责

- Sidecar Runtime 启动/停止
- 进程健康检查
- 版本管理
- 资源路径解析

## 架构

采用 Sidecar 模式，Runtime 内置于安装包，无需用户单独安装。

```
resources/runtime/
├── claude      # Claude CLI 二进制
├── node        # Node.js 运行时
└── config/     # 默认配置
```
