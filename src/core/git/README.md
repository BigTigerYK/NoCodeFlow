# Git 快照

基于 Git 的变更管理，用户无需理解 Git 概念。

## 功能

- 检测 Git 仓库状态
- 非 Git 项目创建 .nocodeflow 快照目录
- 修改前 checkpoint
- Diff 查看（用户友好格式）
- AI 修改历史
- 一键恢复/撤销

## 设计原则

用户永远不需要知道底层是 Git，UI 层面隐藏所有 Git 概念。

## 版本

MVP 阶段实现简单文件快照，V1 集成完整 Git。
