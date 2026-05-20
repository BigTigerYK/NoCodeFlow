# NoCodeFlow

> 🚀 一个基于 AI Agent 的零代码开发平台，让非技术人员也能通过自然语言构建完整的应用。

## 项目简介

NoCodeFlow 是一款面向非专业开发者的智能应用构建平台，通过 AI Agent 与用户的自然语言交互，实现需求理解、架构设计、代码生成、实时预览和一键部署的全流程自动化。

## 技术栈

- **前端框架**: React + TypeScript
- **桌面应用**: Electron
- **构建工具**: Vite
- **AI 能力**: Claude API

## 项目结构

```
NoCodeFlow/
├── electron/           # Electron 主进程与预加载脚本
│   ├── main/           # 主进程
│   └── preload/        # 预加载脚本
├── src/                # 前端源码
│   ├── components/     # UI 组件
│   │   ├── Common/         # 通用组件
│   │   ├── KnowledgeBase/  # 知识库模块
│   │   ├── Settings/       # 设置模块
│   │   ├── TaskCenter/     # 任务中心模块
│   │   └── Workspace/      # 工作区模块
│   ├── core/           # 核心业务逻辑
│   │   ├── agent/          # AI Agent 引擎
│   │   ├── context/        # 上下文管理
│   │   ├── event-bus/      # 事件总线
│   │   ├── git/            # Git 集成
│   │   ├── knowledge/      # 知识库引擎
│   │   ├── memory/         # 记忆系统
│   │   ├── runtime/        # 运行时引擎
│   │   └── sandbox/        # 沙箱环境
│   ├── hooks/          # React Hooks
│   ├── stores/         # 状态管理
│   └── utils/          # 工具函数
├── resources/          # 静态资源
├── build/              # 构建输出
└── poc/                # 概念验证原型
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发环境
npm run dev

# 构建应用
npm run build
```

## 核心功能

- **💬 自然语言交互**: 用户通过对话描述需求，AI Agent 自动理解并转化为技术方案
- **🏗️ 智能架构设计**: 根据需求自动设计应用架构和数据模型
- **⚡ 实时代码生成**: 将自然语言需求实时转化为可运行的代码
- **👁️ 即时预览**: 所见即所得的实时预览体验
- **📚 知识库管理**: 支持自定义知识库，增强 AI 的领域理解能力
- **🧠 记忆系统**: 支持长短期记忆，保持上下文连贯性

## 相关文档

- [产品白皮书](./NOCODEFLOW白皮书.html)
- [产品介绍](./NOCODEFLOW产品介绍.html)
- [架构设计](./NOCODEFLOW架构设计.html)
- [开发计划](./开发大计划.md)
- [POC 计划](./poc-plan.md)

## 许可证

MIT
