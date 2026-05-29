export interface DepCheckResult {
  nodeAvailable: boolean;
  nodeVersion: string | null;
  cliAvailable: boolean;
  cliVersion: string | null;
  /** CLI 命令的绝对路径 */
  cliCmd: string;
  shellAvailable: boolean;
  shellType: 'git-bash' | 'powershell-7' | null;
  shellPath: string | null;
  /** CLI 安装目录（userData/cli/） */
  cliDir: string;
}

export interface SetupProgress {
  type: 'stdout' | 'stderr' | 'status';
  line: string;
}

export interface InstallResult {
  success: boolean;
  error?: string;
}
