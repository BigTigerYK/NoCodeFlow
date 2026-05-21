/** 操作类型 */
export type PermissionAction =
  | 'file_read'
  | 'file_write'
  | 'file_edit'
  | 'file_delete'
  | 'command_execute'
  | 'network_access';

/** 风险等级 */
export type RiskLevel = 'auto_allow' | 'confirm' | 'deny';

/** 权限请求（主进程 → 渲染进程） */
export interface PermissionRequest {
  id: string;
  action: PermissionAction;
  riskLevel: RiskLevel;
  description: string;
  details: {
    toolName: string;
    toolId: string;
    filePath?: string;
    command?: string;
    input?: Record<string, unknown>;
  };
  timestamp: number;
}

/** 权限响应（渲染进程 → 主进程） */
export interface PermissionResponse {
  requestId: string;
  decision: 'allow' | 'deny';
  remember: boolean;
}

/** 权限决策记录（审计日志） */
export interface PermissionRecord {
  requestId: string;
  action: PermissionAction;
  riskLevel: RiskLevel;
  decision: 'allow' | 'deny' | 'auto';
  remember: boolean;
  details: PermissionRequest['details'];
  timestamp: number;
}
