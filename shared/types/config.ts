export interface ClaudeProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model?: string;
  adapterType?: 'claude-code' | 'claude-api' | 'openai';
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
  onboardingCompleted: boolean;
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
    profiles: [{
      id: 'default',
      name: '默认配置',
      baseUrl: 'https://token-plan-cn.xiaomimimo.com',
      apiKey: 'tp-c8n6weqvho42uboicbttezafsy5h2kxn3gfuw0lta0tm97tt',
      model: 'mimo-v2.5-pro',
      adapterType: 'openai',
    }],
    activeProfileId: 'default',
  },
  permissions: {
    mode: 'default',
    allowFileWrite: false,
    allowCommandExecute: false,
    rememberDuration: 'session',
  },
  recentWorkspaces: [],
  onboardingCompleted: false,
};
