import { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar, type SidebarPage } from './Sidebar';
import { StatusBar } from './StatusBar';
import { OnboardingPage } from '@/components/Onboarding/OnboardingPage';
import { ToastContainer } from '@/components/Common/Toast';
import { useConfig } from '@/hooks/useConfig';

const SettingsPage = lazy(() => import('@/components/Settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const WorkspacePage = lazy(() => import('@/components/Workspace/WorkspacePage').then(m => ({ default: m.WorkspacePage })));
const HomePage = lazy(() => import('@/components/TaskCenter/HomePage').then(m => ({ default: m.HomePage })));
const KnowledgePage = lazy(() => import('@/components/Knowledge/KnowledgePage').then(m => ({ default: m.KnowledgePage })));

export function AppLayout() {
  const [activePage, setActivePage] = useState<SidebarPage>('task-center');
  const { config } = useConfig();
  const [showOnboarding, setShowOnboarding] = useState(!config.onboardingCompleted);

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
    const page = (() => {
      switch (activePage) {
        case 'task-center':
          return <HomePage />;
        case 'workspace':
          return <WorkspacePage />;
        case 'knowledge':
          return <KnowledgePage />;
        case 'settings':
          return <SettingsPage />;
      }
    })();

    return <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">加载中...</div>}>{page}</Suspense>;
  };

  if (showOnboarding) {
    return <OnboardingPage onComplete={() => setShowOnboarding(false)} />;
  }

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
