import { useConfig } from '@/hooks/useConfig';
import { GeneralSettings } from './GeneralSettings';
import { ScrollArea } from '@/components/ui/scroll-area';

export function SettingsPage() {
  const { config, updateConfig, loading } = useConfig();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">设置</h1>
        <GeneralSettings
          config={config.general}
          onChange={(general) => updateConfig('general', general)}
        />
      </div>
    </ScrollArea>
  );
}
