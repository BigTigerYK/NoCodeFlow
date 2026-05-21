import type { AppConfig } from '@shared/types/config';
import { Label } from '@/components/ui/label';

interface Props {
  config: AppConfig['general'];
  onChange: (config: AppConfig['general']) => void;
}

export function GeneralSettings({ config, onChange }: Props) {
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">通用</h2>

      <div className="space-y-2">
        <Label htmlFor="theme">主题</Label>
        <select
          id="theme"
          value={config.theme}
          onChange={(e) => onChange({ ...config, theme: e.target.value as AppConfig['general']['theme'] })}
          className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="light">浅色</option>
          <option value="dark">深色</option>
          <option value="system">跟随系统</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fontSize">字体大小</Label>
        <input
          id="fontSize"
          type="number"
          value={config.fontSize}
          onChange={(e) => onChange({ ...config, fontSize: Number(e.target.value) })}
          min={12}
          max={24}
          className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </section>
  );
}
