import { useEffect, useState, useCallback, useRef } from 'react';
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
  const openTabs = useWorkspaceStore((s) => s.openTabs);
  const activeTabPath = useWorkspaceStore((s) => s.activeTabPath);
  const updateTabContent = useWorkspaceStore((s) => s.updateTabContent);
  const saveActiveFile = useWorkspaceStore((s) => s.saveActiveFile);
  const { config } = useConfig();
  const monacoTheme = useMonacoTheme();

  const activeTab = openTabs.find((t) => t.path === activeTabPath);
  const activePathRef = useRef(activeTab?.path);
  activePathRef.current = activeTab?.path;

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveActiveFile();
    });
  }, [saveActiveFile]);

  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined && activePathRef.current) {
      updateTabContent(activePathRef.current, value);
    }
  }, [updateTabContent]);

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">选择一个文件开始编辑</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <MonacoEditor
        height="100%"
        language={activeTab.language}
        value={activeTab.content}
        theme={monacoTheme}
        onChange={handleChange}
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
    </div>
  );
}
