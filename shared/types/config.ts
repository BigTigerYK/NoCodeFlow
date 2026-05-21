export interface ClaudeProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model?: string;
}

export interface AppConfig {
  general: {
    language: string;
    theme: 'light' | 'dark' | 'system';
    fontSize: number;
  };
  editor: {
    tabSize: number;
    wordWrap: 'on' | 'off';
    minimap: boolean;
  };
  claude: {
    profiles: ClaudeProfile[];
    activeProfileId: string | null;
  };
  permissions: {
    mode: 'default' | 'auto';
    allowFileWrite: boolean;
    allowCommandExecute: boolean;
    rememberDuration: 'session' | 'always';
  };
  recentWorkspaces: string[];
}

export const DEFAULT_CONFIG: AppConfig = {
  general: {
    language: 'zh-CN',
    theme: 'system',
    fontSize: 14,
  },
  editor: {
    tabSize: 2,
    wordWrap: 'on',
    minimap: true,
  },
  claude: {
    profiles: [],
    activeProfileId: null,
  },
  permissions: {
    mode: 'default',
    allowFileWrite: false,
    allowCommandExecute: false,
    rememberDuration: 'session',
  },
  recentWorkspaces: [],
};
