import { useState, useEffect } from 'react';
import { Sidebar, type SidebarPage } from './Sidebar';
import { StatusBar } from './StatusBar';
import { SettingsPage } from '@/components/Settings/SettingsPage';
import { WorkspacePage } from '@/components/Workspace/WorkspacePage';
import { HomePage } from '@/components/TaskCenter/HomePage';
import { KnowledgePage } from '@/components/Knowledge/KnowledgePage';
import { OnboardingPage } from '@/components/Onboarding/OnboardingPage';
import { ToastContainer } from '@/components/Common/Toast';
import { useConfig } from '@/hooks/useConfig';

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
