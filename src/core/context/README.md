# 统一上下文引擎

为 Agent 构建精准的项目上下文。

## 上下文类型

- **CodeContext** - 代码结构、依赖关系、AST
- **DocumentContext** - 文档内容、元数据
- **KnowledgeContext** - 向量检索结果、知识图谱
- **UserContext** - 用户偏好、历史操作

## 核心能力

- 项目结构索引
- 相关文件智能召回
- Token 裁剪（避免超出限制）
- 上下文优先级排序

## 版本

V1-V2 阶段实现。
