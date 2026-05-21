import { APP_NAME, APP_VERSION } from '@shared/constants';

export function StatusBar() {
  return (
    <footer className="h-6 border-t flex items-center px-3 text-xs text-muted-foreground bg-muted/30 select-none">
      <span>
        {APP_NAME} v{APP_VERSION}
      </span>
      <span className="ml-auto">就绪</span>
    </footer>
  );
}
