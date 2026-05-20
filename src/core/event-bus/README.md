# 事件总线

Agent 输出解析与事件分发。

## 事件类型

| 类型 | 说明 |
|------|------|
| text | AI 回复文本 |
| tool_use | Agent 调用工具 |
| tool_result | 工具执行结果 |
| thinking | AI 思考过程 |
| error | 错误信息 |

## 模块职责

- **OutputParser** - 解析 Claude CLI 输出（ANSI、JSON 行）
- **EventEmitter** - 标准化事件分发
- **TimelineBuilder** - 构建 Timeline 数据

## 版本

MVP 阶段核心模块。
