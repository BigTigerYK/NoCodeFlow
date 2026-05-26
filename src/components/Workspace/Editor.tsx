import { useEffect, useState } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import { useWorkspaceStore } from '@/stores/workspace';
import { useConfig } from '@/hooks/useConfig';

function useMonacoTheme(): string {
  const { config } = useConfig();
  const [theme, setTheme] = useState<'vs-dark' | 'vs-light'>('vs-dark');

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'vs-dark' : 'vs-light');
    };

    updateTheme();

    // Watch for class changes on <html>
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [config.general.theme]);

  return theme;
}

export function Editor() {
  const { openTabs, activeTabPath, updateTabContent, saveActiveFile } =
    useWorkspaceStore();
  const { config } = useConfig();
  const monacoTheme = useMonacoTheme();

  const activeTab = openTabs.find((t) => t.path === activeTabPath);

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">选择一个文件开始编辑</p>
        </div>
      </div>
    );
  }

  const handleEditorMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveActiveFile();
    });
  };

  return (
    <MonacoEditor
      height="100%"
      language={activeTab.language}
      value={activeTab.content}
      theme={monacoTheme}
      onChange={(value) => {
        if (value !== undefined) {
          updateTabContent(activeTab.path, value);
        }
      }}
      onMount={handleEditorMount}
      options={{
        fontSize: config.general.fontSize,
        tabSize: config.editor.tabSize,
        wordWrap: config.editor.wordWrap,
        minimap: { enabled: config.editor.minimap },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        padding: { top: 8 },
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
      }}
    />
  );
}
