import React, { useState, useEffect } from 'react'
import FileTree from './components/FileTree'
import Editor from './components/Editor'
import Chat from './components/Chat'

// 声明 electronAPI 类型
declare global {
  interface Window {
    electronAPI: {
      readDir: (dirPath: string) => Promise<any[]>
      readFile: (filePath: string) => Promise<string>
      writeFile: (filePath: string, content: string) => Promise<any>
      showOpenDialog: () => Promise<string | undefined>
      startClaudeSession: (workingDirectory: string) => Promise<any>
      sendClaudeMessage: (message: string) => Promise<any>
      stopClaudeSession: () => Promise<any>
      onClaudeOutput: (callback: (data: string) => void) => void
      onClaudeError: (callback: (data: string) => void) => void
      onClaudeClosed: (callback: (code: number | null) => void) => void
      requestPermission: (permissionType: string, details: string) => Promise<any>
      removeAllListeners: (channel: string) => void
    }
  }
}

interface FileItem {
  name: string
  isDirectory: boolean
  path: string
}

function App() {
  const [currentDirectory, setCurrentDirectory] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [claudeStatus, setClaudeStatus] = useState<'idle' | 'running' | 'error'>('idle')

  // 打开文件夹
  const handleOpenFolder = async () => {
    try {
      const folderPath = await window.electronAPI.showOpenDialog()
      if (folderPath) {
        setCurrentDirectory(folderPath)
        setSelectedFile(null)
        setFileContent('')
        // 启动 Claude Code 会话
        await window.electronAPI.startClaudeSession(folderPath)
        setClaudeStatus('running')
      }
    } catch (error) {
      console.error('打开文件夹失败:', error)
    }
  }

  // 选择文件
  const handleFileSelect = async (filePath: string) => {
    try {
      setIsLoading(true)
      setSelectedFile(filePath)
      const content = await window.electronAPI.readFile(filePath)
      setFileContent(content)
    } catch (error) {
      console.error('读取文件失败:', error)
      setFileContent(`无法读取文件: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 保存文件
  const handleFileSave = async (content: string) => {
    if (!selectedFile) return
    
    try {
      await window.electronAPI.writeFile(selectedFile, content)
      setFileContent(content)
    } catch (error) {
      console.error('保存文件失败:', error)
      alert(`保存失败: ${error}`)
    }
  }

  // 发送消息给 Claude
  const handleSendMessage = async (message: string) => {
    try {
      await window.electronAPI.sendClaudeMessage(message)
    } catch (error) {
      console.error('发送消息失败:', error)
    }
  }

  // 监听 Claude 输出
  useEffect(() => {
    const handleOutput = (data: string) => {
      // 这里可以更新聊天界面
      console.log('Claude 输出:', data)
    }

    const handleError = (data: string) => {
      console.error('Claude 错误:', data)
      setClaudeStatus('error')
    }

    const handleClosed = (code: number | null) => {
      console.log('Claude 会话结束，退出码:', code)
      setClaudeStatus('idle')
    }

    window.electronAPI.onClaudeOutput(handleOutput)
    window.electronAPI.onClaudeError(handleError)
    window.electronAPI.onClaudeClosed(handleClosed)

    return () => {
      window.electronAPI.removeAllListeners('claude:output')
      window.electronAPI.removeAllListeners('claude:error')
      window.electronAPI.removeAllListeners('claude:closed')
    }
  }, [])

  // 停止 Claude 会话
  useEffect(() => {
    return () => {
      window.electronAPI.stopClaudeSession()
    }
  }, [])

  return (
    <div className="app-container">
      {/* 侧边栏：文件树 */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>文件资源管理器</h2>
          <button className="open-folder-button" onClick={handleOpenFolder}>
            打开文件夹
          </button>
        </div>
        <div className="file-tree">
          {currentDirectory ? (
            <FileTree 
              rootPath={currentDirectory} 
              onFileSelect={handleFileSelect}
            />
          ) : (
            <div style={{ padding: '20px', color: '#888' }}>
              请先打开一个文件夹
            </div>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="main-content">
        {/* 编辑器区域 */}
        <div className="editor-container">
          <div className="editor-header">
            <h3>
              {selectedFile ? (
                <>
                  <span>{selectedFile.split('/').pop() || selectedFile.split('\\').pop()}</span>
                  <span className="file-path">{selectedFile}</span>
                </>
              ) : (
                '未选择文件'
              )}
            </h3>
            {isLoading && <span>加载中...</span>}
          </div>
          <div className="monaco-container">
            <Editor 
              content={fileContent} 
              language={selectedFile?.endsWith('.ts') ? 'typescript' : 
                       selectedFile?.endsWith('.tsx') ? 'typescript' :
                       selectedFile?.endsWith('.js') ? 'javascript' :
                       selectedFile?.endsWith('.json') ? 'json' :
                       selectedFile?.endsWith('.md') ? 'markdown' : 'plaintext'}
              readOnly={!selectedFile}
              onChange={setFileContent}
              onSave={handleFileSave}
            />
          </div>
        </div>

        {/* 聊天区域 */}
        <div className="chat-container">
          <div className="chat-header">
            <h3>Claude Code 对话</h3>
            <span>状态: {claudeStatus === 'running' ? '运行中' : 
                        claudeStatus === 'error' ? '错误' : '未连接'}</span>
          </div>
          <Chat 
            onSendMessage={handleSendMessage}
            disabled={claudeStatus !== 'running'}
          />
        </div>
      </div>

      {/* 状态栏 */}
      <div className="status-bar">
        <span>NoCodeFlow PoC</span>
        <span>
          {currentDirectory ? `工作目录: ${currentDirectory}` : '未打开文件夹'}
        </span>
      </div>
    </div>
  )
}

export default App
