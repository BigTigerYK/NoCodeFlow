export interface DepCheckResult {
  nodeAvailable: boolean;
  nodeVersion: string | null;
  cliAvailable: boolean;
  cliVersion: string | null;
}

export interface SetupProgress {
  type: 'stdout' | 'stderr' | 'status';
  line: string;
}

export interface InstallResult {
  success: boolean;
  error?: string;
}
