export const IPC_CHANNELS = {
  // 文件系统
  FS_READ: 'fs:read',
  FS_WRITE: 'fs:write',
  FS_TREE: 'fs:tree',
  FS_OPEN_DIALOG: 'fs:open-dialog',
  FS_WATCH: 'fs:watch',
  FS_WATCH_EVENT: 'fs:watch-event',
  FS_UNWATCH: 'fs:unwatch',
  FS_CREATE_FILE: 'fs:create-file',
  FS_CREATE_DIR: 'fs:create-dir',
  FS_DELETE: 'fs:delete',
  FS_RENAME: 'fs:rename',

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

  // 权限
  PERMISSION_REQUEST: 'permission:request',
  PERMISSION_RESPONSE: 'permission:response',
  PERMISSION_INIT: 'permission:init',
  PERMISSION_UPDATE_WORKSPACE: 'permission:updateWorkspace',
  PERMISSION_GET_RECORDS: 'permission:getRecords',
  PERMISSION_RESPOND: 'permission:respond',

  // 快照
  SNAPSHOT_LIST: 'snapshot:list',
  SNAPSHOT_GET: 'snapshot:get',
  SNAPSHOT_RESTORE: 'snapshot:restore',
  SNAPSHOT_DELETE: 'snapshot:delete',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
