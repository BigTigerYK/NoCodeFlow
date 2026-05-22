import { useState } from 'react';
import type { AppConfig, ClaudeProfile } from '@shared/types/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  config: AppConfig['claude'];
  onChange: (config: AppConfig['claude']) => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function maskKey(key: string) {
  if (!key) return '';
  if (key.length <= 8) return '***';
  return key.slice(0, 6) + '***' + key.slice(-4);
}

export function ClaudeSettings({ config, onChange }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ClaudeProfile | null>(null);
  const [form, setForm] = useState({ name: '', baseUrl: '', apiKey: '', model: '', adapterType: 'claude-code' as 'claude-code' | 'claude-api' | 'openai' });

  const { profiles, activeProfileId } = config;

  const openAddDialog = () => {
    setEditingProfile(null);
    setForm({ name: '', baseUrl: '', apiKey: '', model: '', adapterType: 'claude-code' });
    setDialogOpen(true);
  };

  const openEditDialog = (profile: ClaudeProfile) => {
    setEditingProfile(profile);
    setForm({
      name: profile.name,
      baseUrl: profile.baseUrl,
      apiKey: profile.apiKey,
      model: profile.model ?? '',
      adapterType: profile.adapterType ?? 'claude-code',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.baseUrl.trim() || !form.apiKey.trim()) return;

    if (editingProfile) {
      const updated = profiles.map(p =>
        p.id === editingProfile.id
          ? { ...p, name: form.name, baseUrl: form.baseUrl, apiKey: form.apiKey, model: form.model || undefined, adapterType: form.adapterType }
          : p
      );
      onChange({ ...config, profiles: updated });
    } else {
      const newProfile: ClaudeProfile = {
        id: generateId(),
        name: form.name,
        baseUrl: form.baseUrl,
        apiKey: form.apiKey,
        model: form.model || undefined,
        adapterType: form.adapterType,
      };
      onChange({ ...config, profiles: [...profiles, newProfile] });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const updated = profiles.filter(p => p.id !== id);
    onChange({
      profiles: updated,
      activeProfileId: activeProfileId === id ? null : activeProfileId,
    });
  };

  const handleActivate = (id: string) => {
    onChange({ ...config, activeProfileId: id });
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI 服务配置</h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理多个 API 端点配置，快速切换不同的 AI 服务
          </p>
        </div>
        <Button size="sm" onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-1.5" />
          添加方案
        </Button>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            还没有配置方案。点击「添加方案」创建第一个 AI 服务配置。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {profiles.map(profile => {
            const isActive = profile.id === activeProfileId;
            return (
              <Card
                key={profile.id}
                className={cn(
                  'transition-colors',
                  isActive && 'border-primary'
                )}
              >
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{profile.name}</span>
                      {isActive && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          当前使用
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{profile.adapterType ?? 'claude-code'}</span>
                        <span className="truncate">{profile.baseUrl}</span>
                      </div>
                      <div>Key: {maskKey(profile.apiKey)}</div>
                      {profile.model && <div>Model: {profile.model}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivate(profile.id)}
                        className="h-8 text-xs"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        激活
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(profile)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(profile.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProfile ? '编辑方案' : '添加方案'}</DialogTitle>
            <DialogDescription>
              配置 AI 服务的 API 端点和密钥。切换方案后需要重启 Agent 生效。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">方案名称</Label>
              <Input
                id="profile-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="如：官方API、代理服务"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-url">API 端点 (Base URL)</Label>
              <Input
                id="profile-url"
                value={form.baseUrl}
                onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
                placeholder="https://api.anthropic.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-key">API Key</Label>
              <Input
                id="profile-key"
                type="password"
                value={form.apiKey}
                onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                placeholder="sk-ant-..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-model">模型 (可选)</Label>
              <Input
                id="profile-model"
                value={form.model}
                onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                placeholder="留空使用默认模型"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-adapter">适配器类型</Label>
              <select
                id="profile-adapter"
                value={form.adapterType}
                onChange={e => setForm(f => ({ ...f, adapterType: e.target.value as typeof f.adapterType }))}
                className="w-full h-9 px-3 text-sm bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="claude-code">本地 CLI 模式</option>
                <option value="claude-api">云端 API 直连</option>
                <option value="openai">OpenAI 兼容</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {form.adapterType === 'claude-code' && '需要本地安装 AI CLI 工具'}
                {form.adapterType === 'claude-api' && '直接调用 Anthropic Messages API'}
                {form.adapterType === 'openai' && '兼容 OpenAI Chat Completions 接口'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.baseUrl.trim() || !form.apiKey.trim()}
            >
              {editingProfile ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
