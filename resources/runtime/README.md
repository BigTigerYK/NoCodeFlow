# Claude Runtime

Sidecar 模式内置的运行时资源。

## 目录结构

```
runtime/
├── claude          # Claude CLI 二进制
├── node            # Node.js 运行时
└── config/         # 默认配置
```

## 设计原则

- 安装包内置，无需网络下载
- 不触发安全软件拦截
- 版本可控，用户无感知
