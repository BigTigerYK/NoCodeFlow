import type { DocumentModel, DocumentParagraph } from '@shared/types/document';

export interface OutlineNode {
  id: string;
  title: string;
  level: number;
  pageIndex: number;
  offset: number;
  children: OutlineNode[];
}

export function extractOutline(doc: DocumentModel): OutlineNode[] {
  const flatNodes: OutlineNode[] = [];
  let globalOffset = 0;

  for (const page of doc.pages) {
    let pageOffset = 0;
    for (const para of page.paragraphs) {
      if (para.style?.startsWith('heading')) {
        const level = para.level || parseInt(para.style.replace('heading', '')) || 1;
        flatNodes.push({
          id: `h-${flatNodes.length}`,
          title: para.text,
          level,
          pageIndex: page.index,
          offset: globalOffset + pageOffset,
          children: [],
        });
      }
      pageOffset += para.text.length + 1;
    }
    globalOffset += page.content.length + 1;
  }

  return buildTree(flatNodes);
}

function buildTree(flatNodes: OutlineNode[]): OutlineNode[] {
  const root: OutlineNode[] = [];
  const stack: OutlineNode[] = [];

  for (const node of flatNodes) {
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return root;
}
