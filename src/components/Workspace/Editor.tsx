import MonacoEditor, { OnMount } from '@monaco-editor/react';
import { useWorkspaceStore } from '@/stores/workspace';
import { useConfig } from '@/hooks/useConfig';

export function Editor() {
  const { openTabs, activeTabPath, updateTabContent, saveActiveFile } =
    useWorkspaceStore();
  const { config } = useConfig();

  const activeTab = openTabs.find((t) => t.path === activeTabPath);

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Select a file to open</p>
        </div>
      </div>
    );
  }

  const handleEditorMount: OnMount = (editor, monaco) => {
    // Ctrl+S save shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveActiveFile();
    });
  };

  return (
    <MonacoEditor
      height="100%"
      language={activeTab.language}
      value={activeTab.content}
      theme="vs-dark"
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
