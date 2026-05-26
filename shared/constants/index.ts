export const APP_NAME = 'NoCodeFlow';
export const APP_VERSION = '0.1.0';

// File system limits
export const FILE_TREE_MAX_DEPTH = 10;
export const FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const BINARY_CHECK_BUFFER_SIZE = 8192;

// Agent limits
export const AGENT_DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const AGENT_DEFAULT_MAX_TURNS = 100;
export const AGENT_CLI_VERSION_TIMEOUT_MS = 5000;
export const AGENT_SIGKILL_DELAY_MS = 3000;

// Workspace limits
export const MAX_RECENT_WORKSPACES = 10;
export const MAX_RECENT_WORKSPACES_DISPLAY = 8;

// Watcher
export const WATCHER_THROTTLE_MS = 100;
export const WATCHER_STABILITY_THRESHOLD_MS = 300;

// Snapshot
export const MAX_SNAPSHOTS = 50;
export const SNAPSHOT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
