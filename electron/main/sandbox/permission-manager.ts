import { PathValidator } from './path-validator';
import { CommandValidator } from './command-validator';
import type { PermissionAction, RiskLevel, PermissionRequest, PermissionRecord } from '@shared/types/permission';

export class PermissionManager {
  private pathValidator: PathValidator;
  private sessionAllowances = new Map<string, boolean>();
  private records: PermissionRecord[] = [];

  constructor(workspacePath: string) {
    this.pathValidator = new PathValidator(workspacePath);
  }

  /**
   * 校验 tool_use 操作，返回决策
   */
  async evaluate(toolName: string, input: Record<string, unknown>, toolId: string): Promise<{
    riskLevel: RiskLevel;
    request?: PermissionRequest;
  }> {
    switch (toolName) {
      case 'Read':
      case 'Glob':
      case 'Grep':
        return { riskLevel: 'auto_allow' };

      case 'Write':
      case 'Edit': {
        const filePath = input.file_path as string;
        if (!filePath) return { riskLevel: 'auto_allow' };

        const pathResult = await this.pathValidator.validate(filePath);
        if (!pathResult.allowed) {
          return {
            riskLevel: 'deny',
            request: this.buildRequest('file_write', 'deny', `拒绝：${pathResult.reason}`, {
              toolName, toolId, filePath, input,
            }),
          };
        }

        const action: PermissionAction = toolName === 'Write' ? 'file_write' : 'file_edit';
        return {
          riskLevel: 'confirm',
          request: this.buildRequest(action, 'confirm', `${toolName === 'Write' ? '写入' : '编辑'} ${filePath}`, {
            toolName, toolId, filePath, input,
          }),
        };
      }

      case 'Bash': {
        const command = (input.command as string) || '';
        const cmdResult = CommandValidator.validate(command);

        if (cmdResult.risk === 'blocked') {
          return {
            riskLevel: 'deny',
            request: this.buildRequest('command_execute', 'deny', `阻止：${cmdResult.reason} — ${command}`, {
              toolName, toolId, command, input,
            }),
          };
        }

        if (cmdResult.risk === 'dangerous') {
          return {
            riskLevel: 'confirm',
            request: this.buildRequest('command_execute', 'confirm', `危险操作：${cmdResult.reason} — ${command}`, {
              toolName, toolId, command, input,
            }),
          };
        }

        if (cmdResult.risk === 'caution') {
          return {
            riskLevel: 'confirm',
            request: this.buildRequest('command_execute', 'confirm', `执行命令：${command}`, {
              toolName, toolId, command, input,
            }),
          };
        }

        return { riskLevel: 'auto_allow' };
      }

      case 'WebFetch':
      case 'WebSearch':
        return { riskLevel: 'auto_allow' };

      default:
        return {
          riskLevel: 'confirm',
          request: this.buildRequest('network_access', 'confirm', `未知工具：${toolName}`, {
            toolName, toolId, input,
          }),
        };
    }
  }

  record(request: PermissionRequest, decision: 'allow' | 'deny', remember: boolean): void {
    this.records.push({
      requestId: request.id,
      action: request.action,
      riskLevel: request.riskLevel,
      decision,
      remember,
      details: request.details,
      timestamp: Date.now(),
    });

    if (remember) {
      const key = this.sessionKey(request);
      this.sessionAllowances.set(key, decision === 'allow');
    }
  }

  checkSessionMemory(request: PermissionRequest): boolean | null {
    const key = this.sessionKey(request);
    const val = this.sessionAllowances.get(key);
    return val ?? null;
  }

  getRecords(): readonly PermissionRecord[] {
    return this.records;
  }

  updateWorkspace(workspacePath: string): void {
    this.pathValidator = new PathValidator(workspacePath);
    this.sessionAllowances.clear();
  }

  private buildRequest(
    action: PermissionAction,
    riskLevel: RiskLevel,
    description: string,
    details: PermissionRequest['details'],
  ): PermissionRequest {
    return {
      id: crypto.randomUUID(),
      action,
      riskLevel,
      description,
      details,
      timestamp: Date.now(),
    };
  }

  private sessionKey(request: PermissionRequest): string {
    const { toolName, filePath, command } = request.details;
    return `${toolName}:${filePath || command || ''}`;
  }
}
