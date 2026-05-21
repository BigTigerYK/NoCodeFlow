export type FileType =
  | 'typescript'
  | 'javascript'
  | 'json'
  | 'markdown'
  | 'css'
  | 'html'
  | 'python'
  | 'go'
  | 'rust'
  | 'java'
  | 'c'
  | 'cpp'
  | 'shell'
  | 'sql'
  | 'yaml'
  | 'toml'
  | 'xml'
  | 'dockerfile'
  | 'graphql'
  | 'config'
  | 'plaintext';

export type FileIconType = 'code' | 'json' | 'markdown' | 'image' | 'config' | 'text';

const EXTENSION_LANGUAGE_MAP: Record<string, FileType> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.json': 'json',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.css': 'css',
  '.scss': 'css',
  '.less': 'css',
  '.html': 'html',
  '.htm': 'html',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.ini': 'config',
  '.sh': 'shell',
  '.bash': 'shell',
  '.sql': 'sql',
  '.xml': 'xml',
  '.graphql': 'graphql',
  '.vue': 'html',
  '.svelte': 'html',
  '.env': 'shell',
  '.dockerfile': 'dockerfile',
};

const EXTENSION_ICON_MAP: Record<string, FileIconType> = {
  '.ts': 'code',
  '.tsx': 'code',
  '.js': 'code',
  '.jsx': 'code',
  '.json': 'json',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.gif': 'image',
  '.svg': 'image',
  '.webp': 'image',
  '.css': 'code',
  '.scss': 'code',
  '.less': 'code',
  '.html': 'code',
  '.yaml': 'config',
  '.yml': 'config',
  '.toml': 'config',
  '.ini': 'config',
};

export function getLanguageForFile(filePath: string): FileType {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] || 'plaintext';
}

export function getIconTypeForFile(filePath: string): FileIconType {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase();
  return EXTENSION_ICON_MAP[ext] || 'text';
}
