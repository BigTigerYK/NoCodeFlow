import Store from 'electron-store';
import { safeStorage } from 'electron';
import type { AppConfig } from '@shared/types/config';
import { DEFAULT_CONFIG } from '@shared/types/config';

export const configStore = new Store<AppConfig>({
  projectName: 'nocodeflow',
  name: 'nocodeflow-config',
  defaults: DEFAULT_CONFIG,
});

function encryptValue(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) return plaintext;
  const encrypted = safeStorage.encryptString(plaintext);
  return encrypted.toString('base64');
}

function decryptValue(encryptedBase64: string): string {
  if (!safeStorage.isEncryptionAvailable()) return encryptedBase64;
  try {
    const buffer = Buffer.from(encryptedBase64, 'base64');
    return safeStorage.decryptString(buffer);
  } catch {
    // Not encrypted (legacy plaintext), return as-is
    return encryptedBase64;
  }
}

export function encryptApiKeys(config: AppConfig): AppConfig {
  const profiles = config.claude.profiles.map(p => ({
    ...p,
    apiKey: encryptValue(p.apiKey),
  }));
  return { ...config, claude: { ...config.claude, profiles } };
}

export function decryptApiKeys(config: AppConfig): AppConfig {
  const profiles = config.claude.profiles.map(p => ({
    ...p,
    apiKey: decryptValue(p.apiKey),
  }));
  return { ...config, claude: { ...config.claude, profiles } };
}
