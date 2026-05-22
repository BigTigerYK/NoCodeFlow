import { useState, useEffect } from 'react';
import { Sidebar, type SidebarPage } from './Sidebar';
import { StatusBar } from './StatusBar';
import { SettingsPage } from '@/components/Settings/SettingsPage';
import { WorkspacePage } from '@/components/Workspace/WorkspacePage';
import { HomePage } from '@/components/TaskCenter/HomePage';
import { ToastContainer } from '@/components/Common/Toast';
import { useConfig } from '@/hooks/useConfig';

function KnowledgePlaceholder() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">知识库</h1>
        <p className="text-muted-foreground text-sm">阶段二实现</p>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [activePage, setActivePage] = useState<SidebarPage>('task-center');
  const { config } = useConfig();

  // Apply theme at runtime
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (config.general.theme === 'system') {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(config.general.theme);
    }
  }, [config.general.theme]);

  // Listen for navigation events from child components (e.g., HomePage task submit)
  useEffect(() => {
    const handler = (e: Event) => {
      const page = (e as CustomEvent).detail as SidebarPage;
      if (page) setActivePage(page);
    };
    window.addEventListener('nocodeflow:navigate', handler);
    return () => window.removeEventListener('nocodeflow:navigate', handler);
  }, []);

  const renderContent = () => {
    switch (activePage) {
      case 'task-center':
        return <HomePage />;
      case 'workspace':
        return <WorkspacePage />;
      case 'knowledge':
        return <KnowledgePlaceholder />;
      case 'settings':
        return <SettingsPage />;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <main className="flex-1 overflow-hidden">{renderContent()}</main>
      </div>
      <StatusBar />
      <ToastContainer />
    </div>
  );
}
