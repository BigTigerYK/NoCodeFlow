import React, { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
}

const Chat: React.FC<ChatProps> = ({ onSendMessage, disabled = false }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 监听 Claude 输出
  useEffect(() => {
    const handleOutput = (data: string) => {
      // 将输出添加到最后一个助手消息，或创建新消息
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          // 更新最后一条消息
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: lastMessage.content + data
            }
          ]
        } else {
          // 创建新的助手消息
          return [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: data,
              timestamp: new Date()
            }
          ]
        }
      })
    }

    const handleError = (data: string) => {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `错误: ${data}`,
          timestamp: new Date()
        }
      ])
    }

    window.electronAPI.onClaudeOutput(handleOutput)
    window.electronAPI.onClaudeError(handleError)

    return () => {
      window.electronAPI.removeAllListeners('claude:output')
      window.electronAPI.removeAllListeners('claude:error')
    }
  }, [])

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || disabled) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')

    try {
      await onSendMessage(inputValue.trim())
    } catch (error) {
      console.error('发送消息失败:', error)
    }
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 清空聊天记录
  const handleClear = () => {
    setMessages([])
  }

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: '#888'
          }}>
            开始与 Claude Code 对话
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`chat-message ${message.role}`}>
              <div className="role">
                {message.role === 'user' ? '你' : 'Claude'}
              </div>
              <div className="content">
                {message.content.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < message.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        <textarea
          className="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
          disabled={disabled}
          rows={2}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <button 
            className="chat-send-button"
            onClick={handleSend}
            disabled={!inputValue.trim() || disabled}
          >
            发送
          </button>
          <button 
            className="chat-send-button"
            onClick={handleClear}
            style={{ backgroundColor: '#555' }}
          >
            清空
          </button>
        </div>
      </div>
    </div>
  )
}

export default Chat
