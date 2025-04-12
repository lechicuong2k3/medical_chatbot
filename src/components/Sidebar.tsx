"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Menu, MessageSquare, BarChart2, Settings, Moon, Sun, Plus, Trash2, Edit, Check, X } from "lucide-react"
import "../styles/Sidebar.css"

interface ChatHistory {
  id: string;
  title: string;
  messages: any[];
  createdAt: string;
}

interface SidebarProps {
  currentMessages: any[];
  onNewChat: () => void;
  onContinueChat: (chatId: string, messages: any[]) => void;
  onDeleteChat: (chatId: string) => void;
  currentChatId?: string | null;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentMessages, 
  onNewChat, 
  onContinueChat, 
  onDeleteChat,
  currentChatId,
  darkMode: propDarkMode,
  onToggleDarkMode
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeItem, setActiveItem] = useState('chats')
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([])
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null)
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState<string>('')
  const [localDarkMode, setLocalDarkMode] = useState<boolean>(false)
  const editInputRef = useRef<HTMLInputElement>(null)
  
  // Use the dark mode from props if provided, otherwise use local state
  const darkMode = propDarkMode !== undefined ? propDarkMode : localDarkMode;

  // Load chat history and dark mode preference from localStorage on component mount
  useEffect(() => {
    const loadChatHistory = () => {
      const savedHistory = localStorage.getItem('chatHistory')
      if (savedHistory) {
        setChatHistory(JSON.parse(savedHistory))
      }
    }
    
    // Load dark mode preference only if not controlled by props
    if (propDarkMode === undefined) {
      const savedDarkMode = localStorage.getItem('darkMode')
      if (savedDarkMode) {
        const isDarkMode = JSON.parse(savedDarkMode)
        setLocalDarkMode(isDarkMode)
        applyDarkMode(isDarkMode)
      }
    }
    
    // Load initially
    loadChatHistory()
    
    // Set up event listener for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chatHistory') {
        loadChatHistory()
      } else if (e.key === 'darkMode' && propDarkMode === undefined) {
        const isDarkMode = e.newValue ? JSON.parse(e.newValue) : false
        setLocalDarkMode(isDarkMode)
        applyDarkMode(isDarkMode)
      }
    }
    
    // Listen for custom event when chat history is updated
    const handleChatHistoryUpdated = () => {
      loadChatHistory()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('chatHistoryUpdated', handleChatHistoryUpdated)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('chatHistoryUpdated', handleChatHistoryUpdated)
    }
  }, [propDarkMode]);

  // Apply dark mode to the document
  const applyDarkMode = (isDarkMode: boolean) => {
    // Only apply document class changes if we're not using the prop's darkMode
    if (propDarkMode === undefined) {
      if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
    }
  }

  // Toggle dark mode
  const toggleDarkMode = () => {
    if (onToggleDarkMode) {
      // Use the parent component's toggleDarkMode function if provided
      onToggleDarkMode();
    } else {
      // Otherwise use the local implementation
      const newDarkMode = !darkMode;
      setLocalDarkMode(newDarkMode);
      localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
      applyDarkMode(newDarkMode);
    }
  }

  // Focus the edit input when editing a chat title
  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingChatId])

  // Save current chat to history when starting a new chat
  const handleNewChat = () => {
    // Only create a new chat history entry if:
    // 1. We have messages
    // 2. We're not currently editing a chat (no currentChatId)
    if (currentMessages.length > 0 && !currentChatId) {
      // Create a new chat history entry
      const newChat: ChatHistory = {
        id: Date.now().toString(),
        title: generateChatTitle(currentMessages),
        messages: [...currentMessages],
        createdAt: new Date().toISOString()
      }
      
      // Update chat history
      const updatedHistory = [newChat, ...chatHistory]
      setChatHistory(updatedHistory)
      
      // Save to localStorage
      localStorage.setItem('chatHistory', JSON.stringify(updatedHistory))
      
      // Dispatch a custom event to notify components about the chat history change
      const event = new CustomEvent('chatHistoryUpdated');
      window.dispatchEvent(event);
    }
    
    // Call the parent component's onNewChat function
    console.log("Sidebar: Calling parent onNewChat function");
    onNewChat();
    
    // Force a small delay to ensure state updates are processed
    setTimeout(() => {
      console.log("Sidebar: New chat initiated");
    }, 100);
  }

  // Generate a title for the chat based on the first user message
  const generateChatTitle = (messages: any[]): string => {
    const firstUserMessage = messages.find(msg => msg.sender === 'user')
    if (firstUserMessage) {
      // Truncate the message if it's too long
      const title = firstUserMessage.text
      return title.length > 20 ? title.substring(0, 20) + '...' : title
    }
    return 'New Chat'
  }

  const handleContinueChat = (chatId: string) => {
    // Don't do anything if we're currently editing a title
    if (editingChatId) return;
    
    console.log("Continuing chat in Sidebar:", {
      chatId,
      currentChatId
    });
    
    const chat = chatHistory.find(c => c.id === chatId)
    if (chat) {
      onContinueChat(chatId, chat.messages)
    }
  }

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation() // Prevent triggering the continue chat action
    
    // Remove the chat from history
    const updatedHistory = chatHistory.filter(chat => chat.id !== chatId)
    setChatHistory(updatedHistory)
    
    // Save to localStorage
    localStorage.setItem('chatHistory', JSON.stringify(updatedHistory))
    
    // Dispatch a custom event to notify components about the chat history change
    const event = new CustomEvent('chatHistoryUpdated');
    window.dispatchEvent(event);
    
    // Call the parent component's onDeleteChat function
    onDeleteChat(chatId)
  }

  const handleEditChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation() // Prevent triggering the continue chat action
    
    const chat = chatHistory.find(c => c.id === chatId)
    if (chat) {
      setEditingChatId(chatId)
      setEditTitle(chat.title)
    }
  }

  const handleSaveTitle = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingChatId && editTitle.trim()) {
      // Truncate the title if it's too long
      const truncatedTitle = editTitle.trim().length > 20 
        ? editTitle.trim().substring(0, 20) + '...' 
        : editTitle.trim();
      
      // Update the chat title
      const updatedHistory = chatHistory.map(chat => {
        if (chat.id === editingChatId) {
          return {
            ...chat,
            title: truncatedTitle
          }
        }
        return chat
      })
      
      setChatHistory(updatedHistory)
      
      // Save to localStorage
      localStorage.setItem('chatHistory', JSON.stringify(updatedHistory))
      
      // Dispatch a custom event to notify components about the chat history change
      const event = new CustomEvent('chatHistoryUpdated');
      window.dispatchEvent(event);
      
      // Exit edit mode
      setEditingChatId(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingChatId(null)
  }

  const handleNavClick = (itemName: string) => {
    setActiveItem(itemName)
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  // Group chats by date categories
  const groupChatsByDate = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterday = today - 86400000 // 24 hours in milliseconds
    const lastWeek = today - 86400000 * 7
    
    const groups = {
      today: [] as ChatHistory[],
      yesterday: [] as ChatHistory[],
      lastWeek: [] as ChatHistory[],
      older: [] as ChatHistory[]
    }
    
    chatHistory.forEach(chat => {
      const chatDate = new Date(chat.createdAt).getTime()
      
      if (chatDate >= today) {
        groups.today.push(chat)
      } else if (chatDate >= yesterday) {
        groups.yesterday.push(chat)
      } else if (chatDate >= lastWeek) {
        groups.lastWeek.push(chat)
      } else {
        groups.older.push(chat)
      }
    })
    
    return groups
  }

  const chatGroups = groupChatsByDate()

  // Add a new function to handle removing all chat history
  const handleRemoveAllChatHistory = () => {
    // Clear chat history from state
    setChatHistory([]);
    
    // Clear chat history from localStorage
    localStorage.removeItem('chatHistory');
    
    // Dispatch a custom event to notify components about the chat history change
    const event = new CustomEvent('chatHistoryUpdated');
    window.dispatchEvent(event);
    
    // If we're currently viewing a chat, clear it
    if (currentChatId) {
      onDeleteChat(currentChatId);
    }
  }

  return (
    <div className={`sidebar ${isExpanded ? "expanded" : ""}`}>
      <div className="sidebar-content">
        {/* Top Section */}
        <div className="top-section">
          {isExpanded ? (
            <div className="user-profile">
              <span className="username">Medical Assistant</span>
              <button className="collapse-button" onClick={() => setIsExpanded(false)}>
                <Menu size={20} />
              </button>
            </div>
          ) : (
            <button className="expand-button" onClick={() => setIsExpanded(true)}>
              <Menu size={20} />
            </button>
          )}
        </div>

        {/* New Chat Button */}
        <button className="new-chat-button" onClick={handleNewChat}>
          {isExpanded ? (
            <>
              <Plus size={20} />
              <span>New chat</span>
            </>
          ) : (
            <Plus size={20} />
          )}
        </button>

        {/* Navigation */}
        <nav className="nav-section">
          <button 
            className={`nav-item ${activeItem === 'chats' ? 'active' : ''}`}
            onClick={() => handleNavClick('chats')}
          >
            <MessageSquare />
            {isExpanded && <span>Chats</span>}
          </button>
          <button 
            className={`nav-item ${activeItem === 'benchmark' ? 'active' : ''}`}
            onClick={() => handleNavClick('benchmark')}
          >
            <BarChart2 />
            {isExpanded && <span>Benchmark</span>}
          </button>
        </nav>

        {/* Chat History */}
        {activeItem === 'chats' && (
          <div className="chat-history">
            {isExpanded && <div className="section-title">CHAT HISTORY</div>}
            
            {isExpanded && chatGroups.today.length > 0 && (
              <>
                <div className="date-divider">Today</div>
                {chatGroups.today.map((chat) => (
                  <div 
                    key={chat.id} 
                    className={`history-item-container ${currentChatId === chat.id ? 'active' : ''}`}
                    onMouseEnter={() => setHoveredChatId(chat.id)}
                    onMouseLeave={() => setHoveredChatId(null)}
                    onClick={() => handleContinueChat(chat.id)}
                  >
                    {editingChatId === chat.id ? (
                      <form onSubmit={handleSaveTitle} className="edit-title-form">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="edit-title-input"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="edit-buttons">
                          <button 
                            type="submit" 
                            className="edit-button save"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            type="button" 
                            className="edit-button cancel"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="history-item">
                          <div className="history-item-title">{chat.title}</div>
                          <div className="history-item-date">{formatDate(chat.createdAt)}</div>
                        </div>
                        {hoveredChatId === chat.id && (
                          <div className="history-item-actions">
                            <button 
                              className="history-action-button edit"
                              onClick={(e) => handleEditChat(e, chat.id)}
                              title="Rename chat"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              className="history-action-button delete"
                              onClick={(e) => handleDeleteChat(e, chat.id)}
                              title="Delete chat"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </>
            )}

            {isExpanded && chatGroups.yesterday.length > 0 && (
              <>
                <div className="date-divider">Yesterday</div>
                {chatGroups.yesterday.map((chat) => (
                  <div 
                    key={chat.id} 
                    className={`history-item-container ${currentChatId === chat.id ? 'active' : ''}`}
                    onMouseEnter={() => setHoveredChatId(chat.id)}
                    onMouseLeave={() => setHoveredChatId(null)}
                    onClick={() => handleContinueChat(chat.id)}
                  >
                    {editingChatId === chat.id ? (
                      <form onSubmit={handleSaveTitle} className="edit-title-form">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="edit-title-input"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="edit-buttons">
                          <button 
                            type="submit" 
                            className="edit-button save"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            type="button" 
                            className="edit-button cancel"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="history-item">
                          <div className="history-item-title">{chat.title}</div>
                          <div className="history-item-date">{formatDate(chat.createdAt)}</div>
                        </div>
                        {hoveredChatId === chat.id && (
                          <div className="history-item-actions">
                            <button 
                              className="history-action-button edit"
                              onClick={(e) => handleEditChat(e, chat.id)}
                              title="Rename chat"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              className="history-action-button delete"
                              onClick={(e) => handleDeleteChat(e, chat.id)}
                              title="Delete chat"
                            >
                              <Trash2 size={16} />
                </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </>
            )}

            {isExpanded && chatGroups.lastWeek.length > 0 && (
              <>
                <div className="date-divider">Previous 7 Days</div>
                {chatGroups.lastWeek.map((chat) => (
                  <div 
                    key={chat.id} 
                    className={`history-item-container ${currentChatId === chat.id ? 'active' : ''}`}
                    onMouseEnter={() => setHoveredChatId(chat.id)}
                    onMouseLeave={() => setHoveredChatId(null)}
                    onClick={() => handleContinueChat(chat.id)}
                  >
                    {editingChatId === chat.id ? (
                      <form onSubmit={handleSaveTitle} className="edit-title-form">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="edit-title-input"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="edit-buttons">
                          <button 
                            type="submit" 
                            className="edit-button save"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            type="button" 
                            className="edit-button cancel"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="history-item">
                          <div className="history-item-title">{chat.title}</div>
                          <div className="history-item-date">{formatDate(chat.createdAt)}</div>
                        </div>
                        {hoveredChatId === chat.id && (
                          <div className="history-item-actions">
                            <button 
                              className="history-action-button edit"
                              onClick={(e) => handleEditChat(e, chat.id)}
                              title="Rename chat"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              className="history-action-button delete"
                              onClick={(e) => handleDeleteChat(e, chat.id)}
                              title="Delete chat"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </>
            )}

            {isExpanded && chatGroups.older.length > 0 && (
              <>
                <div className="date-divider">Older</div>
                {chatGroups.older.map((chat) => (
                  <div 
                    key={chat.id} 
                    className={`history-item-container ${currentChatId === chat.id ? 'active' : ''}`}
                    onMouseEnter={() => setHoveredChatId(chat.id)}
                    onMouseLeave={() => setHoveredChatId(null)}
                    onClick={() => handleContinueChat(chat.id)}
                  >
                    {editingChatId === chat.id ? (
                      <form onSubmit={handleSaveTitle} className="edit-title-form">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="edit-title-input"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="edit-buttons">
                          <button 
                            type="submit" 
                            className="edit-button save"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            type="button" 
                            className="edit-button cancel"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="history-item">
                          <div className="history-item-title">{chat.title}</div>
                          <div className="history-item-date">{formatDate(chat.createdAt)}</div>
                        </div>
                        {hoveredChatId === chat.id && (
                          <div className="history-item-actions">
                            <button 
                              className="history-action-button edit"
                              onClick={(e) => handleEditChat(e, chat.id)}
                              title="Rename chat"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              className="history-action-button delete"
                              onClick={(e) => handleDeleteChat(e, chat.id)}
                              title="Delete chat"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
            </div>
                ))}
              </>
            )}

            {isExpanded && chatHistory.length === 0 && (
              <div className="empty-history">
                <p>No chat history yet</p>
                <p className="empty-history-hint">Start a new chat to begin</p>
              </div>
            )}
          </div>
        )}

        {/* Settings Section */}
        <div className="settings-section">
          <button className="nav-item">
            <Settings />
            {isExpanded && <span>Settings</span>}
          </button>
          <button className="nav-item" onClick={toggleDarkMode}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            {isExpanded && <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>}
          </button>
          <button className="nav-item" onClick={handleRemoveAllChatHistory}>
            <Trash2 size={20} />
            {isExpanded && <span>Remove chat history</span>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar

