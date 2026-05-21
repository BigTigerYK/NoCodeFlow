import { useConfig } from '@/hooks/useConfig';
import { GeneralSettings } from './GeneralSettings';
import { ClaudeSettings } from './ClaudeSettings';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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

        <Tabs defaultValue="general">
          <TabsList className="mb-6">
            <TabsTrigger value="general">通用</TabsTrigger>
            <TabsTrigger value="claude">Agent 配置</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralSettings
              config={config.general}
              onChange={(general) => updateConfig('general', general)}
            />
          </TabsContent>

          <TabsContent value="claude">
            <ClaudeSettings
              config={config.claude}
              onChange={(claude) => updateConfig('claude', claude)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
