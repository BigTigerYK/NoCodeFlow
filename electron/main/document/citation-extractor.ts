export interface Citation {
  id: string;
  text: string;
  format: 'apa' | 'mla' | 'gb-t-7714' | 'chicago' | 'unknown';
  authors?: string;
  year?: string;
  title?: string;
}

const APA_REGEX = /\(([A-Z][a-z]+(?:\s+(?:et\s+al\.?|&\s+[A-Z][a-z]+))*)\s*,?\s*(\d{4})\)/g;
const MLA_REGEX = /\(([A-Z][a-z]+)\s+(\d+)\)/g;
const GBT_REGEX = /\[(\d+)\]\s+([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*(?:et\s+al\.?)?)\s*[,，]\s*(.+)/g;
const CHICAGO_REGEX = /\^(\d+)/g;

export function extractCitations(text: string): Citation[] {
  const citations: Citation[] = [];
  const seen = new Set<string>();

  // APA: (Author, Year)
  for (const match of text.matchAll(APA_REGEX)) {
    const key = `apa:${match[1]}:${match[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({
      id: `c${citations.length}`,
      text: match[0],
      format: 'apa',
      authors: match[1],
      year: match[2],
    });
  }

  // MLA: (Author Page)
  for (const match of text.matchAll(MLA_REGEX)) {
    const key = `mla:${match[1]}:${match[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({
      id: `c${citations.length}`,
      text: match[0],
      format: 'mla',
      authors: match[1],
    });
  }

  // GB/T 7714: [1] Author, Title...
  for (const match of text.matchAll(GBT_REGEX)) {
    const key = `gbt:${match[1]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({
      id: `c${citations.length}`,
      text: match[0],
      format: 'gb-t-7714',
      authors: match[2],
      title: match[3],
    });
  }

  // Chicago: ^1
  for (const match of text.matchAll(CHICAGO_REGEX)) {
    const key = `chicago:${match[1]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({
      id: `c${citations.length}`,
      text: match[0],
      format: 'chicago',
    });
  }

  return citations;
}
