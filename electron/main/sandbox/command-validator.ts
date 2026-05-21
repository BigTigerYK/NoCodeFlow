export type CommandRisk = 'safe' | 'caution' | 'dangerous' | 'blocked';

interface RiskRule {
  pattern: RegExp;
  risk: CommandRisk;
  reason: string;
}

const RISK_RULES: RiskRule[] = [
  // 直接阻止
  { pattern: /\brm\s+(-[rRf]+\s+|--recursive)/, risk: 'blocked', reason: '递归删除文件' },
  { pattern: /\bmkfs\b/, risk: 'blocked', reason: '格式化磁盘' },
  { pattern: /\bdd\s+/, risk: 'blocked', reason: '磁盘直接写入' },
  { pattern: />\s*\/dev\/[sh]d/, risk: 'blocked', reason: '写入磁盘设备' },

  // 高风险 — 需确认
  { pattern: /\brm\s+/, risk: 'dangerous', reason: '删除文件' },
  { pattern: /\bkill\b/, risk: 'dangerous', reason: '终止进程' },
  { pattern: /\bpkill\b/, risk: 'dangerous', reason: '终止进程' },
  { pattern: /\bsudo\b/, risk: 'dangerous', reason: '提权执行' },
  { pattern: /\bchmod\b/, risk: 'dangerous', reason: '修改权限' },
  { pattern: /\bchown\b/, risk: 'dangerous', reason: '修改所有者' },
  { pattern: /\bcurl\s+.*\|\s*(ba)?sh/, risk: 'dangerous', reason: '远程脚本执行' },
  { pattern: /\bwget\s+.*\|\s*(ba)?sh/, risk: 'dangerous', reason: '远程脚本执行' },
  { pattern: /\bnpm\s+(uninstall|publish)\b/, risk: 'dangerous', reason: '包管理危险操作' },
  { pattern: /\bgit\s+push\s+.*--force/, risk: 'dangerous', reason: '强制推送' },
  { pattern: /\bgit\s+reset\s+.*--hard/, risk: 'dangerous', reason: '硬重置' },
  { pattern: /\bgit\s+clean\s+.*-[fd]/, risk: 'dangerous', reason: '清理未跟踪文件' },

  // 需确认
  { pattern: /\b(npm|yarn|pnpm)\s+(install|add)\b/, risk: 'caution', reason: '安装依赖' },
  { pattern: /\bgit\s+(commit|merge|rebase)\b/, risk: 'caution', reason: 'Git 操作' },
  { pattern: /\bdocker\b/, risk: 'caution', reason: 'Docker 操作' },

  // 安全 — 自动允许
  { pattern: /\b(ls|cat|head|tail|grep|find|echo|pwd|whoami|date)\b/, risk: 'safe', reason: '只读命令' },
  { pattern: /\bgit\s+(status|log|diff|show)\b/, risk: 'safe', reason: 'Git 只读操作' },
  { pattern: /\b(node|python|python3)\s+--version\b/, risk: 'safe', reason: '版本查询' },
];

export class CommandValidator {
  static validate(command: string): { risk: CommandRisk; reason: string } {
    for (const rule of RISK_RULES) {
      if (rule.pattern.test(command)) {
        return { risk: rule.risk, reason: rule.reason };
      }
    }
    // 未匹配任何规则的命令默认为需确认
    return { risk: 'caution', reason: '未知命令' };
  }
}
