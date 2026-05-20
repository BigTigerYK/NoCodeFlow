import React, { useState, useEffect } from 'react'

interface FileItem {
  name: string
  isDirectory: boolean
  path: string
}

interface FileTreeProps {
  rootPath: string
  onFileSelect: (filePath: string) => void
}

const FileTree: React.FC<FileTreeProps> = ({ rootPath, onFileSelect }) => {
  const [items, setItems] = useState<FileItem[]>([])
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // 加载目录内容
  const loadDirectory = async (dirPath: string) => {
    try {
      setLoading(true)
      const entries = await window.electronAPI.readDir(dirPath)
      // 排序：文件夹在前，文件在后
      const sorted = entries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })
      setItems(sorted)
    } catch (error) {
      console.error('加载目录失败:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // 初始加载根目录
  useEffect(() => {
    if (rootPath) {
      loadDirectory(rootPath)
      setExpandedDirs(new Set([rootPath]))
    }
  }, [rootPath])

  // 切换目录展开/折叠
  const toggleDirectory = (dirPath: string) => {
    const newExpanded = new Set(expandedDirs)
    if (newExpanded.has(dirPath)) {
      newExpanded.delete(dirPath)
    } else {
      newExpanded.add(dirPath)
    }
    setExpandedDirs(newExpanded)
  }

  // 点击文件或文件夹
  const handleClick = (item: FileItem) => {
    if (item.isDirectory) {
      toggleDirectory(item.path)
    } else {
      onFileSelect(item.path)
    }
  }

  // 递归渲染文件树
  const renderTree = (items: FileItem[], level: number = 0) => {
    return items.map((item) => (
      <React.Fragment key={item.path}>
        <div
          className={`file-tree-item ${item.isDirectory ? 'directory' : 'file'}`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => handleClick(item)}
        >
          <span className="icon">
            {item.isDirectory ? (
              expandedDirs.has(item.path) ? '📂' : '📁'
            ) : (
              '📄'
            )}
          </span>
          <span>{item.name}</span>
        </div>
        
        {/* 如果是展开的文件夹，递归渲染子项 */}
        {item.isDirectory && expandedDirs.has(item.path) && (
          <ChildDirectory 
            path={item.path} 
            level={level + 1} 
            onFileSelect={onFileSelect}
            expandedDirs={expandedDirs}
            toggleDirectory={toggleDirectory}
          />
        )}
      </React.Fragment>
    ))
  }

  if (loading) {
    return <div style={{ padding: '20px', color: '#888' }}>加载中...</div>
  }

  return <div>{renderTree(items)}</div>
}

// 子目录组件（避免无限递归）
interface ChildDirectoryProps {
  path: string
  level: number
  onFileSelect: (filePath: string) => void
  expandedDirs: Set<string>
  toggleDirectory: (dirPath: string) => void
}

const ChildDirectory: React.FC<ChildDirectoryProps> = ({ 
  path, 
  level, 
  onFileSelect, 
  expandedDirs, 
  toggleDirectory 
}) => {
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const entries = await window.electronAPI.readDir(path)
        const sorted = entries.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1
          if (!a.isDirectory && b.isDirectory) return 1
          return a.name.localeCompare(b.name)
        })
        setItems(sorted)
      } catch (error) {
        console.error('加载子目录失败:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [path])

  if (loading) {
    return <div style={{ paddingLeft: `${level * 20 + 12}px`, color: '#888' }}>加载中...</div>
  }

  return (
    <>
      {items.map((item) => (
        <React.Fragment key={item.path}>
          <div
            className={`file-tree-item ${item.isDirectory ? 'directory' : 'file'}`}
            style={{ paddingLeft: `${level * 20 + 12}px` }}
            onClick={() => {
              if (item.isDirectory) {
                toggleDirectory(item.path)
              } else {
                onFileSelect(item.path)
              }
            }}
          >
            <span className="icon">
              {item.isDirectory ? (
                expandedDirs.has(item.path) ? '📂' : '📁'
              ) : (
                '📄'
              )}
            </span>
            <span>{item.name}</span>
          </div>
          
          {item.isDirectory && expandedDirs.has(item.path) && (
            <ChildDirectory 
              path={item.path} 
              level={level + 1} 
              onFileSelect={onFileSelect}
              expandedDirs={expandedDirs}
              toggleDirectory={toggleDirectory}
            />
          )}
        </React.Fragment>
      ))}
    </>
  )
}

export default FileTree
