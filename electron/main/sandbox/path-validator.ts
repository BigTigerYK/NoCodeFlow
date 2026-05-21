import { realpath } from 'fs/promises';
import { resolve, relative, isAbsolute } from 'path';

export class PathValidator {
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = resolve(workspacePath);
  }

  /**
   * 校验路径是否在工作区内
   * 使用 realpath 解析 symlink，防止 symlink 绕过攻击
   */
  async validate(filePath: string): Promise<{
    allowed: boolean;
    reason?: string;
    resolvedPath?: string;
  }> {
    const absPath = isAbsolute(filePath)
      ? filePath
      : resolve(this.workspacePath, filePath);

    const rel = relative(this.workspacePath, absPath);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      return { allowed: false, reason: '路径在工作区外' };
    }

    try {
      const real = await realpath(absPath);
      const realRel = relative(this.workspacePath, real);
      if (realRel.startsWith('..') || isAbsolute(realRel)) {
        return { allowed: false, reason: '符号链接指向工作区外' };
      }
      return { allowed: true, resolvedPath: real };
    } catch {
      // 文件不存在时，检查父目录
      const parent = resolve(absPath, '..');
      try {
        const realParent = await realpath(parent);
        const realRel = relative(this.workspacePath, realParent);
        if (realRel.startsWith('..') || isAbsolute(realRel)) {
          return { allowed: false, reason: '父目录在工作区外' };
        }
        return { allowed: true, resolvedPath: absPath };
      } catch {
        return { allowed: false, reason: '无法解析路径' };
      }
    }
  }
}
