import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null
let claudeProcess: ChildProcess | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // 开发环境加载本地服务器，生产环境加载打包文件
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    if (claudeProcess) {
      claudeProcess.kill()
      claudeProcess = null
    }
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC 通信：文件系统操作
ipcMain.handle('fs:readDir', async (event, dirPath: string) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    return entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name)
    }))
  } catch (error) {
    throw new Error(`无法读取目录: ${error}`)
  }
})

ipcMain.handle('fs:readFile', async (event, filePath: string) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return content
  } catch (error) {
    throw new Error(`无法读取文件: ${error}`)
  }
})

ipcMain.handle('fs:writeFile', async (event, filePath: string, content: string) => {
  try {
    // 权限检查：写入文件需要确认
    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'question',
      buttons: ['允许一次', '始终允许', '拒绝'],
      defaultId: 2,
      title: '权限请求',
      message: `Claude 准备修改文件: ${path.basename(filePath)}`,
      detail: `文件路径: ${filePath}`
    })
    
    if (result.response === 2) {
      throw new Error('用户拒绝了文件修改')
    }
    
    // 如果选择"始终允许"，可以记录到配置文件
    if (result.response === 1) {
      // TODO: 记录到权限配置
    }
    
    await fs.promises.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    throw new Error(`无法写入文件: ${error}`)
  }
})

ipcMain.handle('fs:showOpenDialog', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })
  return result.filePaths[0]
})

// IPC 通信：Claude Code CLI 集成
ipcMain.handle('claude:startSession', async (event, workingDirectory: string) => {
  try {
    // 使用 Claude Code 的 -p (print) 模式进行非交互式调用
    // 使用 stream-json 输出格式以便解析流式输出
    claudeProcess = spawn('claude', [
      '-p',
      '--output-format', 'stream-json',
      '--permission-mode', 'default'
    ], {
      cwd: workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    })
    
    let outputBuffer = ''
    
    claudeProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      outputBuffer += text
      
      // 尝试解析 JSON 行
      const lines = outputBuffer.split('\n')
      outputBuffer = lines.pop() || '' // 保留最后一个不完整的行
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const json = JSON.parse(line)
            mainWindow?.webContents.send('claude:output', json)
          } catch {
            // 如果不是 JSON，直接发送文本
            mainWindow?.webContents.send('claude:output', { type: 'text', content: line })
          }
        }
      }
    })
    
    claudeProcess.stderr?.on('data', (data: Buffer) => {
      const error = data.toString()
      mainWindow?.webContents.send('claude:error', error)
    })
    
    claudeProcess.on('close', (code: number | null) => {
      // 处理缓冲区中剩余的数据
      if (outputBuffer.trim()) {
        try {
          const json = JSON.parse(outputBuffer)
          mainWindow?.webContents.send('claude:output', json)
        } catch {
          mainWindow?.webContents.send('claude:output', { type: 'text', content: outputBuffer })
        }
      }
      mainWindow?.webContents.send('claude:closed', code)
      claudeProcess = null
    })
    
    return { success: true, pid: claudeProcess.pid }
  } catch (error) {
    throw new Error(`无法启动 Claude Code: ${error}`)
  }
})

ipcMain.handle('claude:sendMessage', async (event, message: string) => {
  if (!claudeProcess || !claudeProcess.stdin) {
    throw new Error('Claude Code 会话未启动')
  }
  
  // 在 -p 模式下，消息通过命令行参数或 stdin 发送
  // 由于我们使用 -p 模式，需要重新启动进程来发送新消息
  // 或者使用交互式模式（不带 -p 标志）
  
  // 方案1: 使用交互式模式（推荐）
  // 需要修改 startSession 来使用交互式模式
  
  // 方案2: 使用 -p 模式，每次消息都启动新进程
  // 这里我们先尝试发送到 stdin
  claudeProcess.stdin.write(message + '\n')
  
  // 注意：在 -p 模式下，进程可能在处理完消息后自动退出
  // 需要根据实际情况调整
  
  return { success: true }
})

ipcMain.handle('claude:stopSession', async (event) => {
  if (claudeProcess) {
    claudeProcess.kill()
    claudeProcess = null
  }
  return { success: true }
})

// IPC 通信：权限管理
ipcMain.handle('permission:request', async (event, permissionType: string, details: string) => {
  const result = await dialog.showMessageBox(mainWindow!, {
    type: 'question',
    buttons: ['允许一次', '始终允许', '拒绝'],
    defaultId: 2,
    title: '权限请求',
    message: `Claude 请求 ${permissionType} 权限`,
    detail: details
  })
  
  return {
    allowed: result.response !== 2,
    always: result.response === 1
  }
})
