import React, { useRef, useEffect } from 'react'
import * as monaco from 'monaco-editor'

interface EditorProps {
  content: string
  language: string
  readOnly?: boolean
  onChange?: (value: string) => void
  onSave?: (value: string) => void
}

const Editor: React.FC<EditorProps> = ({ 
  content, 
  language, 
  readOnly = false, 
  onChange, 
  onSave 
}) => {
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  // 初始化编辑器
  useEffect(() => {
    if (editorContainerRef.current) {
      // 创建编辑器实例
      editorRef.current = monaco.editor.create(editorContainerRef.current, {
        value: content,
        language: language,
        readOnly: readOnly,
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: {
          enabled: true
        },
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        wordWrap: 'on'
      })

      // 监听内容变化
      editorRef.current.onDidChangeModelContent(() => {
        if (onChange) {
          onChange(editorRef.current?.getValue() || '')
        }
      })

      // 监听保存快捷键 (Ctrl+S)
      editorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        if (onSave) {
          onSave(editorRef.current?.getValue() || '')
        }
      })
    }

    return () => {
      editorRef.current?.dispose()
    }
  }, [])

  // 内容变化时更新编辑器
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue()
      if (currentValue !== content) {
        editorRef.current.setValue(content)
      }
    }
  }, [content])

  // 语言变化时更新
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel()
      if (model) {
        monaco.editor.setModelLanguage(model, language)
      }
    }
  }, [language])

  // 只读状态变化
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly: readOnly })
    }
  }, [readOnly])

  return (
    <div 
      ref={editorContainerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '300px'
      }}
    />
  )
}

export default Editor
