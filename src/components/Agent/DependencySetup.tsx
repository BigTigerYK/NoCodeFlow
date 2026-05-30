import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useSetupStore } from '@/stores/setup';

interface DependencySetupProps {
  onReady: () => void;
}

export function DependencySetup({ onReady }: DependencySetupProps) {
  const { phase, error, checkAndInstall } = useSetupStore();

  useEffect(() => {
    checkAndInstall();
  }, [checkAndInstall]);

  useEffect(() => {
    if (phase === 'success') {
      onReady();
    }
  }, [phase, onReady]);

  if (phase === 'initializing') {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">正在初始化...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-red-500 font-mono">{error}</p>
            <Button className="w-full" onClick={checkAndInstall}>
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
