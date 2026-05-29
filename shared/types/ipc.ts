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

  // 文档
  DOCUMENT_IMPORT: 'document:import',
  DOCUMENT_LIST: 'document:list',
  DOCUMENT_GET: 'document:get',
  DOCUMENT_DELETE: 'document:delete',
  DOCUMENT_SEARCH: 'document:search',
  DOCUMENT_PARSE: 'document:parse',
  DOCUMENT_SUMMARIZE: 'document:summarize',
  DOCUMENT_QA: 'document:qa',

  // 依赖安装
  SETUP_CHECK_DEPS: 'setup:check-deps',
  SETUP_INSTALL_CLI: 'setup:install-cli',
  SETUP_INSTALL_SHELL: 'setup:install-shell',
  SETUP_PROGRESS: 'setup:progress',
  SHELL_OPEN_EXTERNAL: 'shell:open-external',

  // 调试
  DEBUG_GET_LOGS: 'debug:get-logs',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
