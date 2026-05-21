export const IPC_CHANNELS = {
  // 文件系统
  FS_READ: 'fs:read',
  FS_WRITE: 'fs:write',
  FS_TREE: 'fs:tree',
  FS_OPEN_DIALOG: 'fs:open-dialog',
  FS_WATCH: 'fs:watch',
  FS_WATCH_EVENT: 'fs:watch-event',
  FS_UNWATCH: 'fs:unwatch',

  // 配置
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  CONFIG_GET_ALL: 'config:get-all',
  CONFIG_DELETE: 'config:delete',

  // 对话框
  DIALOG_MESSAGE: 'dialog:message',

  // Agent（预留）
  AGENT_START: 'agent:start',
  AGENT_SEND: 'agent:send',
  AGENT_OUTPUT: 'agent:output',
  AGENT_STOP: 'agent:stop',
  AGENT_STATUS: 'agent:status',

  // 权限（预留）
  PERMISSION_REQUEST: 'permission:request',
  PERMISSION_RESPONSE: 'permission:response',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
