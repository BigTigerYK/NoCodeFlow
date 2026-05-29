import { useState, useRef } from 'react';
import { useConfig } from '@/hooks/useConfig';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, Sun, Moon, Monitor, Key, ArrowRight, Check, Loader2, AlertCircle } from 'lucide-react';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { DepCheckResult, InstallResult } from '@shared/types/setup';

const steps = ['welcome', 'theme', 'api-key', 'env-setup', 'complete'] as const;
type Step = (typeof steps)[number];

export function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const { config, updateConfig } = useConfig();
  const [step, setStep] = useState<Step>('welcome');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(config.general.theme);
  const [apiKey, setApiKey] = useState('');
  const [profileName, setProfileName] = useState('默认配置');

  // Environment setup state
  const [envStatus, setEnvStatus] = useState<'checking' | 'installing' | 'done' | 'error'>('checking');
  const [envError, setEnvError] = useState<string | null>(null);
  const [envLog, setEnvLog] = useState<string[]>([]);
  const envStarted = useRef(false);

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

  const addLog = (line: string) => setEnvLog(prev => [...prev.slice(-20), line]);

  const runEnvSetup = async () => {
    if (envStarted.current) return;
    envStarted.current = true;
    setEnvStatus('checking');
    setEnvError(null);
    setEnvLog([]);

    try {
      // Check current state
      const deps = await window.api.invoke(IPC_CHANNELS.SETUP_CHECK_DEPS) as DepCheckResult;
      addLog(`Node.js: ${deps.nodeAvailable ? 'OK' : '缺失'} (${deps.nodeVersion || 'N/A'})`);
      addLog(`Shell: ${deps.shellAvailable ? 'OK' : '缺失'} (${deps.shellType || 'N/A'})`);
      addLog(`CLI: ${deps.cliAvailable ? 'OK' : '未安装'} (${deps.cliVersion || 'N/A'})`);

      // Install shell if needed
      if (!deps.shellAvailable) {
        setEnvStatus('installing');
        addLog('正在安装 Git for Windows...');
        const unsub = window.api.on(IPC_CHANNELS.SETUP_PROGRESS, (data: any) => {
          if (data?.line) addLog(data.line);
        });
        const shellResult = await window.api.invoke(IPC_CHANNELS.SETUP_INSTALL_SHELL) as InstallResult;
        unsub();
        if (!shellResult.success) {
          setEnvStatus('error');
          setEnvError(`Git 安装失败: ${shellResult.error}`);
          addLog(`Git 安装失败: ${shellResult.error}`);
          return;
        }
        addLog('Git for Windows 安装完成');
      }

      // Install CLI if needed
      if (!deps.cliAvailable) {
        setEnvStatus('installing');
        addLog('正在安装 Claude Code CLI...');
        const unsub = window.api.on(IPC_CHANNELS.SETUP_PROGRESS, (data: any) => {
          if (data?.line) addLog(data.line);
        });
        const installResult = await window.api.invoke(IPC_CHANNELS.SETUP_INSTALL_CLI) as InstallResult;
        unsub();
        if (!installResult.success) {
          setEnvStatus('error');
          setEnvError(`CLI 安装失败: ${installResult.error}`);
          addLog(`CLI 安装失败: ${installResult.error}`);
          return;
        }
        addLog('Claude Code CLI 安装完成');
      }

      setEnvStatus('done');
      addLog('所有依赖就绪！');
    } catch (err: any) {
      setEnvStatus('error');
      setEnvError(err.message || String(err));
      addLog(`错误: ${err.message || err}`);
    }
  };

  const handleEnvNext = () => {
    if (envStatus === 'error') {
      // Allow skipping with error — user can fix later in settings
      setStep('complete');
    } else {
      setStep('complete');
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
                配置 AI 服务以启用智能助手功能
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
              <Button onClick={() => { setStep('env-setup'); runEnvSetup(); }}>
                下一步
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Environment Setup */}
        {step === 'env-setup' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                {envStatus === 'checking' || envStatus === 'installing' ? (
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                ) : envStatus === 'done' ? (
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-destructive" />
                )}
              </div>
              <h2 className="text-xl font-bold mb-2">
                {envStatus === 'checking' ? '检测环境...' :
                 envStatus === 'installing' ? '安装依赖中...' :
                 envStatus === 'done' ? '环境就绪' : '安装遇到问题'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {envStatus === 'checking' ? '正在检查运行环境' :
                 envStatus === 'installing' ? '首次安装可能需要 1-3 分钟，请耐心等待' :
                 envStatus === 'done' ? '所有依赖已安装完成' :
                 envError || '安装失败，你可以稍后在设置中重试'}
              </p>
            </div>

            {/* Log output */}
            {envLog.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                  {envLog.join('\n')}
                </pre>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('api-key')}>
                上一步
              </Button>
              <Button
                onClick={handleEnvNext}
                disabled={envStatus === 'checking' || envStatus === 'installing'}
              >
                {envStatus === 'error' ? '跳过' : '下一步'}
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
