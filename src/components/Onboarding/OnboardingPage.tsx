import { useState } from 'react';
import { useConfig } from '@/hooks/useConfig';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, Sun, Moon, Monitor, Key, ArrowRight, Check } from 'lucide-react';

const steps = ['welcome', 'theme', 'api-key', 'complete'] as const;
type Step = (typeof steps)[number];

export function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const { config, updateConfig } = useConfig();
  const [step, setStep] = useState<Step>('welcome');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(config.general.theme);
  const [apiKey, setApiKey] = useState('');
  const [profileName, setProfileName] = useState('默认配置');

  const handleThemeSelect = (t: typeof theme) => {
    setTheme(t);
    updateConfig('general', { ...config.general, theme: t });
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (t === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(t);
    }
  };

  const handleFinish = () => {
    if (apiKey.trim()) {
      const profile = {
        id: 'default',
        name: profileName,
        baseUrl: '',
        apiKey: apiKey.trim(),
        model: '',
      };
      updateConfig('claude', {
        ...config.claude,
        profiles: [profile],
        activeProfileId: 'default',
      });
    }
    updateConfig('onboardingCompleted', true);
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      <div className="w-full max-w-lg px-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div
              key={s}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                steps.indexOf(step) >= i ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Welcome */}
        {step === 'welcome' && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">欢迎使用 NoCodeFlow</h1>
              <p className="text-muted-foreground">
                AI 认知工作台，通过自然语言完成开发、写作、分析
              </p>
            </div>
            <Button onClick={() => setStep('theme')} size="lg" className="px-8">
              开始配置
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <button
              onClick={handleFinish}
              className="block mx-auto text-xs text-muted-foreground hover:text-foreground mt-4"
            >
              跳过引导
            </button>
          </div>
        )}

        {/* Theme */}
        {step === 'theme' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">选择主题</h2>
              <p className="text-sm text-muted-foreground">你可以随时在设置中更改</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light' as const, label: '浅色', icon: Sun },
                { value: 'dark' as const, label: '深色', icon: Moon },
                { value: 'system' as const, label: '跟随系统', icon: Monitor },
              ].map(opt => {
                const Icon = opt.icon;
                const isSelected = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleThemeSelect(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all',
                      isSelected && 'ring-2 ring-primary border-primary bg-primary/5'
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm">{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep('api-key')}>
                下一步
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* API Key */}
        {step === 'api-key' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">配置 Agent</h2>
              <p className="text-sm text-muted-foreground">
                配置 Claude API Key 以启用 AI 功能
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">配置名称</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="默认配置"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="sk-ant-..."
                />
                <p className="text-xs text-muted-foreground">
                  API Key 会加密存储在本地，不会上传到任何服务器
                </p>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('theme')}>
                上一步
              </Button>
              <Button onClick={() => setStep('complete')}>
                下一步
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Complete */}
        {step === 'complete' && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">配置完成</h2>
              <p className="text-sm text-muted-foreground">
                {apiKey.trim()
                  ? 'Agent 已就绪，你可以开始使用 AI 功能'
                  : '你可以稍后在设置中配置 API Key'}
              </p>
            </div>
            <Button onClick={handleFinish} size="lg" className="px-8">
              开始使用
              <Sparkles className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
