# 知识层

多模态文档解析与知识索引。

## 处理流程

```
输入 → 文档解析 → 分块 → Embedding → 向量索引
         ↓           ↓         ↓
      元数据提取   引用关系   知识图谱
```

## 支持格式

- PDF（pdfjs-dist）
- Word（mammoth.js）
- Markdown（marked）
- Excel（xlsx）
- 代码文件

## 版本

V1-V2 阶段实现。
