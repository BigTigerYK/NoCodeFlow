import Store from 'electron-store';
import type { AppConfig } from '@shared/types/config';
import { DEFAULT_CONFIG } from '@shared/types/config';

export const configStore = new Store<AppConfig>({
  name: 'nocodeflow-config',
  defaults: DEFAULT_CONFIG,
});
