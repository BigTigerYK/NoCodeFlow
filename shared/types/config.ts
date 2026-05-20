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
  recentWorkspaces: [],
};
