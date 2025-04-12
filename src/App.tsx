import type React from "react"
import { useState, useRef, useEffect } from "react"
import Sidebar from "./components/Sidebar"
import TypingIndicator from "./components/TypingIndicator"
import { Globe, Image, Send, Settings, Trash2, AlertCircle, RefreshCw, X, CheckCircle } from "lucide-react"
import "./App.css"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import PatientInfo from "./components/PatientInfo"
import Auth from "./components/Auth"

interface Message {
  text: string
  sender: "user" | "bot"
  image?: string  // Add optional image URL
}

// Define the interface for the API request
interface ApiRequest {
  model: string;
  messages: ApiMessage[];
  temperature?: number;
  max_tokens?: number;
  max_new_tokens?: number;
  stream?: boolean;
}

interface ApiMessage {
  role: "user" | "assistant" | "system";
  content: string | ApiContent[];
}

interface ApiContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  image?: string;
}

interface ErrorState {
  message: string;
  retryFn?: () => Promise<void>;
}

interface PatientData {
  age: string | number;
  gender: string;
  height: string | number;
  weight: string | number;
  bloodPressure: string;
  history: string;
  [key: string]: string | number;
}

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<ErrorState | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [isRequestInProgress, setIsRequestInProgress] = useState<boolean>(false)
  const [cancelNotification, setCancelNotification] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

  const sampleQuestions: string[] = [
    "What does this X-ray show?", 
    "What are the symptoms of pneumonia?", 
    "How to interpret this blood test result?", 
    "What's the treatment for hypertension?"
  ]

  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };
  
  // Effect to scroll to bottom when messages change or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    // First check if dark mode preference is stored in localStorage
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      const isDarkMode = JSON.parse(savedDarkMode);
      setDarkMode(isDarkMode);
    } else {
      // If no preference is saved, check system preference
      const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDarkMode);
    }
    
    // Add listener for changes
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if no preference is saved in localStorage
      if (localStorage.getItem('darkMode') === null) {
        setDarkMode(e.matches);
      }
    };
    
    // Add listener
    if (darkModeMediaQuery.addEventListener) {
      darkModeMediaQuery.addEventListener('change', handleChange);
    }
    
    // Add listener for storage changes to sync dark mode across components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'darkMode' && e.newValue !== null) {
        setDarkMode(JSON.parse(e.newValue));
      }
    };
    
    // Add custom event listener for local changes
    const handleDarkModeChange = () => {
      const savedDarkMode = localStorage.getItem('darkMode');
      if (savedDarkMode !== null) {
        setDarkMode(JSON.parse(savedDarkMode));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('darkModeChanged', handleDarkModeChange);
    
    // Cleanup
    return () => {
      if (darkModeMediaQuery.removeEventListener) {
        darkModeMediaQuery.removeEventListener('change', handleChange);
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('darkModeChanged', handleDarkModeChange);
    };
  }, []);

  // Toggle dark mode manually
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
    
    // Dispatch a custom event to notify other components
    const event = new CustomEvent('darkModeChanged');
    window.dispatchEvent(event);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        // Store the current image URL for use with the next text message
        setCurrentImageUrl(imageUrl);
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle paste event to capture pasted images
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setCurrentImageUrl(event.target.result as string);
            }
          };
          reader.readAsDataURL(blob);
          // Prevent the default paste behavior for images
          e.preventDefault();
          break;
        }
      }
    }
  };
  
  // Handle removing the uploaded image
  const handleRemoveImage = () => {
    setCurrentImageUrl(null);
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleSampleQuestionClick = (question: string) => {
    setInputValue(question);
    // Submit the question automatically
    handleSendMessage(question);
  }

  const handleClearConversation = () => {
    console.log("App: Clearing conversation");
    // Clear all state in a specific order to ensure clean slate
    setError(null);
    setCurrentImageUrl(null);
    setInputValue("");
    setMessages([]);
    setConversationHistory([]);
    setCurrentChatId(null);
    
    // Force a small delay to ensure state updates are processed
    setTimeout(() => {
      console.log("App: Conversation cleared, states reset");
      // Double-check that the messages array is empty
      if (messages.length > 0) {
        console.log("App: Warning - messages array not empty after clear, forcing another reset");
        setMessages([]);
      }
    }, 100);
  }

  // Handle starting a new chat from sidebar
  const handleNewChat = () => {
    console.log("App: Starting new chat, clearing current chat ID:", currentChatId);
    
    // If we have a current chat ID and messages, we need to update the chat history
    // before starting a new chat
    if (currentChatId && messages.length > 0) {
      try {
        // Get chat history from localStorage
        const savedHistory = localStorage.getItem('chatHistory');
        const existingHistory = savedHistory ? JSON.parse(savedHistory) : [];
        
        // Find the current chat in the history
        const currentChatIndex = existingHistory.findIndex((chat: any) => chat.id === currentChatId);
        
        if (currentChatIndex !== -1) {
          // Get the current chat
          const currentChat = existingHistory[currentChatIndex];
          
          console.log("App: Updating existing chat before starting new chat:", {
            currentChatId,
            messagesLength: messages.length,
            currentChatMessagesLength: currentChat.messages.length
          });
          
          // Create updated chat object with the current messages
          const updatedChat = {
            ...currentChat,
            messages: [...messages]
          };
          
          // Create a new history array with the updated chat
          const updatedHistory = [...existingHistory];
          updatedHistory[currentChatIndex] = updatedChat;
          
          // Update localStorage
          localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
          
          // Dispatch a custom event to notify components about the chat history change
          const event = new CustomEvent('chatHistoryUpdated');
          window.dispatchEvent(event);
        }
      } catch (error) {
        console.error("Error saving chat history:", error);
      }
    }
    
    // Now clear the conversation to start a new chat
    // Force immediate state updates to ensure clean slate
    console.log("App: Clearing conversation state");
    
    // Clear all state in a specific order to ensure clean slate
    setError(null);
    setCurrentImageUrl(null);
    setInputValue("");
    setMessages([]);
    setConversationHistory([]);
    setCurrentChatId(null);
    
    // Force a small delay to ensure state updates are processed
    setTimeout(() => {
      console.log("App: New chat created, states reset");
      // Double-check that the messages array is empty
      if (messages.length > 0) {
        console.log("App: Warning - messages array not empty after reset, forcing another reset");
        setMessages([]);
      }
    }, 100);
  }

  // Handle continuing a chat from history
  const handleContinueChat = (chatId: string, chatMessages: Message[]) => {
    console.log("Continuing chat:", {
      chatId,
      messagesLength: chatMessages.length,
      currentChatId
    });
    
    // If we're already viewing this chat, don't do anything
    if (chatId === currentChatId) {
      console.log("Already viewing this chat, no need to reload");
      return;
    }
    
    // If we have a current chat ID and messages, we need to update the current chat
    // before switching to a new one
    if (currentChatId && messages.length > 0) {
      // Get chat history from localStorage
      const savedHistory = localStorage.getItem('chatHistory');
      const existingHistory = savedHistory ? JSON.parse(savedHistory) : [];
      
      // Find the current chat in the history
      const currentChatIndex = existingHistory.findIndex((chat: any) => chat.id === currentChatId);
      
      if (currentChatIndex !== -1) {
        // Get the current chat
        const currentChat = existingHistory[currentChatIndex];
        
        console.log("Updating current chat before switching:", {
          currentChatId,
          messagesLength: messages.length,
          currentChatMessagesLength: currentChat.messages.length
        });
        
        // Create updated chat object with the current messages
        const updatedChat = {
          ...currentChat,
          messages: [...messages]
        };
        
        // Create a new history array with the updated chat
        const updatedHistory = [...existingHistory];
        updatedHistory[currentChatIndex] = updatedChat;
        
        // Update localStorage
        localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
        
        // Dispatch a custom event to notify components about the chat history change
        const event = new CustomEvent('chatHistoryUpdated');
        window.dispatchEvent(event);
      }
    }
    
    // Make a deep copy of the messages to avoid reference issues
    const messagesCopy = JSON.parse(JSON.stringify(chatMessages));
    
    // Set the messages from the selected chat
    setMessages(messagesCopy);
    
    // Reconstruct conversation history
    const reconstructedHistory: ConversationMessage[] = [];
    
    messagesCopy.forEach((msg: Message) => {
      const conversationMsg: ConversationMessage = {
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
        ...(msg.image && { image: msg.image })
      };
      reconstructedHistory.push(conversationMsg);
    });
    
    setConversationHistory(reconstructedHistory);
    
    // Set the current chat ID
    setCurrentChatId(chatId);
  }

  // Handle deleting a chat from history
  const handleDeleteChat = (chatId: string) => {
    // If the deleted chat is the current one, clear the conversation
    if (chatId === currentChatId) {
      handleClearConversation();
    }
  }

  // Handle canceling the current request
  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      console.log("Canceling request...");
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsRequestInProgress(false);
      
      // Don't remove the last user message, instead add a cancellation message
      const cancelMessage: Message = { 
        text: "Request cancelled!", 
        sender: "bot" 
      };
      setMessages(prevMessages => [...prevMessages, cancelMessage]);
      
      // Show cancellation notification
      setCancelNotification(true);
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setCancelNotification(false);
      }, 5000);
    }
  };

  const sendToVLLMServer = async (text: string, imageUrl: string | null) => {
    try {
      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      setIsRequestInProgress(true);
      
      // Hide any existing notifications when starting a new request
      setCancelNotification(false);
      
      // Don't add user message here since we already added it in handleSendMessage
      // Just prepare the API messages
      
      // Convert UI messages to API format
      const conversationMessages: ConversationMessage[] = messages.map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text,
        image: msg.image
      }));
      
      // Add the new user message to the conversation
      conversationMessages.push({
        role: "user",
        content: text,
        image: imageUrl || undefined
      });
      
      // Prepare API messages
      const apiMessages: ApiMessage[] = [];
      
      // Add system message to guide the model's behavior
      const patientInfoSection = patientData ? 
        `\n\nPatient Information:
- Age: ${patientData.age || 'Not provided'}
- Gender: ${patientData.gender || 'Not provided'}
- Height: ${patientData.height ? `${patientData.height} cm` : 'Not provided'}
- Weight: ${patientData.weight ? `${patientData.weight} kg` : 'Not provided'}
- Blood Pressure: ${patientData.bloodPressure || 'Not provided'}
- Medical History: ${patientData.history || 'Not provided'}
${Object.entries(patientData)
  .filter(([key]) => !['age', 'gender', 'height', 'weight', 'bloodPressure', 'history'].includes(key))
  .map(([key, value]) => `- ${key}: ${value || 'Not provided'}`)
  .join('\n')}` : "";

      apiMessages.push({
        role: "system",
        content: `You are a medical AI assistant focused on providing clear, concise information. Prioritize brevity and accuracy in your responses. Use markdown formatting sparingly, only when it improves readability. When analyzing images, be direct and focus on key findings.${patientInfoSection}`
      });
      
      // Add conversation messages
      conversationMessages.forEach(msg => {
        if (msg.image) {
          // For messages with images, use the content array format
          apiMessages.push({
            role: msg.role,
            content: [
              {
                type: "text",
                text: msg.content
              },
              {
                type: "image_url",
                image_url: {
                  url: msg.image
                }
              }
            ]
          });
        } else {
          // For text-only messages, use the simple string content
          apiMessages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
      
      // Create the API request payload
      const payload: ApiRequest = {
        model: "Qwen/Qwen2.5-VL-3B-Instruct",
        messages: apiMessages,
        temperature: 0.3,  // Lower temperature for more focused responses
        max_new_tokens: 150  // Limit token length to encourage brevity
      };
      
      console.log("Sending payload:", JSON.stringify(payload, null, 2));
      
      // Send the request to the vLLM server
      const response = await fetch('http://localhost:8000/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal, // Add the abort signal to the fetch request
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("API Response:", data);
      
      // Check if request was aborted
      if (signal.aborted) {
        console.log("Request was aborted, not updating UI");
        return;
      }
      
      // Extract the model's response
      const botResponse = data.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
      
      // Add bot message to the chat
      const botMessage: Message = { text: botResponse, sender: "bot" };
      
      // Update the messages state with the new bot message
      setMessages(prevMessages => [...prevMessages, botMessage]);
      
      // Add to conversation history
      const assistantMsg: ConversationMessage = {
        role: "assistant",
        content: botResponse
      };
      setConversationHistory(prev => [...prev, assistantMsg]);
      
      // Get chat history from localStorage
      const savedHistory = localStorage.getItem('chatHistory');
      const existingHistory = savedHistory ? JSON.parse(savedHistory) : [];
      
      // Create the user message object that was just sent
      const userMessage = { 
        text, 
        sender: "user", 
        ...(imageUrl && { image: imageUrl }) 
      };
      
      if (currentChatId) {
        // Find the current chat in the history
        const currentChatIndex = existingHistory.findIndex((chat: any) => chat.id === currentChatId);
        
        if (currentChatIndex !== -1) {
          // Get the current chat
          const currentChat = existingHistory[currentChatIndex];
          
          // Get all messages for this chat
          // We need to use the current UI messages which include the new bot message
          // This ensures we have the complete conversation
          
          console.log("Updating existing chat:", {
            currentChatId,
            uiMessagesLength: messages.length,
            currentChatMessagesLength: currentChat.messages.length
          });
          
          // Create updated chat object with the complete messages array
          const updatedChat = {
            ...currentChat,
            messages: [...messages]
          };
          
          // Create a new history array with the updated chat
          const updatedHistory = [...existingHistory];
          updatedHistory[currentChatIndex] = updatedChat;
          
          // Update localStorage
          localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
          
          // Dispatch a custom event to notify components about the chat history change
          const event = new CustomEvent('chatHistoryUpdated');
          window.dispatchEvent(event);
        }
      } 
      // If this is a new chat (no currentChatId) and it's the first exchange
      else if (messages.length === 1) {
        const firstUserMessage = messages[0];
        const chatTitle = firstUserMessage.text;
        const formattedTitle = chatTitle.length > 25 ? chatTitle.substring(0, 25) + '...' : chatTitle;
        const chatId = Date.now().toString();
        
        console.log("Creating new chat:", {
          chatId,
          uiMessagesLength: messages.length
        });
        
        // Create new chat history entry with all messages
        const newChat = {
          id: chatId,
          title: formattedTitle,
          messages: messages,
          createdAt: new Date().toISOString()
        };
        
        // Set as current chat
        setCurrentChatId(chatId);
        
        // Update localStorage
        const updatedHistory = [newChat, ...existingHistory];
        localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
        
        // Dispatch a custom event to notify components about the chat history change
        const event = new CustomEvent('chatHistoryUpdated');
        window.dispatchEvent(event);
      }
    } catch (error) {
      // Check if the error was due to the request being aborted
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Request was aborted');
        return; // Don't show error for user-initiated cancellations
      }
      
      console.error('Error calling vLLM server:', error);
      
      // Create retry function
      const retryFn = async () => {
        await sendToVLLMServer(text, imageUrl);
      };
      
      // Set error state
      setError({
        message: error instanceof Error ? error.message : "Unknown error occurred",
        retryFn
      });
      
      // Add error message to the chat
      const errorMessage: Message = { 
        text: "Sorry, there was an error connecting to the model. Please try again.", 
        sender: "bot" 
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsRequestInProgress(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    // Create user message
    const userMessage: Message = {
      text: text,
      sender: "user",
      image: currentImageUrl || undefined
    };
    
    // Update messages state immediately with user message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    
    // Scroll to bottom immediately after updating messages
    setTimeout(scrollToBottom, 100);
    
    // Capture the image URL before clearing it
    const imageUrlToSend = currentImageUrl;
    
    // Clear the uploaded image immediately after sending
    setCurrentImageUrl(null);
    
    try {
      // Set loading state
      setIsLoading(true);
      
      // Send to server with the captured image URL
      await sendToVLLMServer(text, imageUrlToSend);
      
      // Remove the duplicate image clearing from here
    } catch (error) {
      console.error("Error sending message:", error);
      setError({
        message: "Failed to send message. Please try again.",
        retryFn: async () => handleSendMessage(text)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputValue.trim()) {
      const userInput = inputValue.trim();
      await handleSendMessage(userInput);
    } else if (currentImageUrl) {
      // If there's no text but there is an image, send with a default message
      await handleSendMessage("What is this image?");
    }
  };

  // Handle patient info changes
  const handlePatientInfoChange = (info: PatientData) => {
    setPatientData(info);
    
    // If there's a conversation in progress, you might want to notify the AI about the patient info
    if (messages.length > 0) {
      // Optional: Add a system message about updated patient info
      const systemMessage: ConversationMessage = {
        role: "system",
        content: `Patient information has been updated: Age: ${info.age}, Gender: ${info.gender}, other metrics available.`
      };
      
      // You could add this to conversation history if needed
      // setConversationHistory(prev => [...prev, systemMessage]);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  // Apply dark mode class to document when darkMode state changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      <Sidebar 
        currentMessages={messages}
        onNewChat={handleNewChat}
        onContinueChat={handleContinueChat}
        onDeleteChat={handleDeleteChat}
        currentChatId={currentChatId}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />
      <main className="main-content">
        {/* Header - only show if no messages */}
        {messages.length === 0 ? (
          <div className="header">
            <div className="header-content">
              <div>
                <h1 className="title-primary">Hello, Doctor</h1>
                <h2 className="title-secondary">How can I help you today?</h2>
              </div>
              <div className="header-controls">
                <PatientInfo 
                  onPatientInfoChange={handlePatientInfoChange}
                  darkMode={darkMode} 
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="header" style={{ padding: "1.5rem 2rem" }}>
            <div className="header-content">
              <div className="header-controls">
                <PatientInfo 
                  onPatientInfoChange={handlePatientInfoChange}
                  darkMode={darkMode} 
                />
              </div>
              <button 
                className="clear-button" 
                onClick={handleClearConversation}
                title="Clear conversation"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-container">
            <div className="error-content">
              <AlertCircle size={20} />
              <p>{error.message}</p>
            </div>
            {error.retryFn && (
              <button 
                className="retry-button" 
                onClick={error.retryFn}
                disabled={isLoading}
              >
                <RefreshCw size={16} />
                Retry
              </button>
            )}
          </div>
        )}

        {/* Messages container */}
        <div className="messages-container">
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.sender} ${
                  message.sender === "bot" && index === messages.length - 1 && isLoading ? "loading" : ""
                } ${message.text === "Request cancelled!" ? "cancelled" : ""}`}
              >
                {message.image && (
                  <div className="message-image">
                    <img src={message.image} alt="Uploaded" />
                  </div>
                )}
                {message.text && message.sender === "bot" ? (
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p>{message.text}</p>
                )}
              </div>
            ))
          ) : (
            <div className="empty-messages">
              {/* Empty space for when there are no messages */}
            </div>
          )}
          {isLoading && (
            <div className="message bot loading">
              <div className="typing-indicator">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} className="messages-end" />
        </div>

        {/* Question Grid - only show if no messages */}
        {messages.length === 0 && (
          <div className="question-grid">
            {sampleQuestions.map((question, i) => (
              <div 
                key={i} 
                className="question-card"
                onClick={() => handleSampleQuestionClick(question)}
              >
                <p>{question}</p>
                <Globe className="icon" />
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="input-area">
          <div className="input-container">
            {currentImageUrl && (
              <div className="image-preview-container">
                <div className="image-preview">
                  <img src={currentImageUrl} alt="Preview" />
                  <button 
                    type="button" 
                    className="remove-image-button"
                    onClick={handleRemoveImage}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="input-form">
              <input
                type="text"
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                onPaste={handlePaste}
                placeholder={currentImageUrl ? "Ask about this image..." : "Enter a prompt here"}
                className="text-input"
                disabled={isLoading}
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
                disabled={isLoading}
              />
              <div className="input-buttons">
                <button 
                  type="button" 
                  className="icon-button" 
                  onClick={handleImageButtonClick}
                  disabled={isLoading}
                >
                  <Image className="icon" />
                </button>
                {isLoading ? (
                  <button 
                    type="button" 
                    className="cancel-button" 
                    onClick={handleCancelRequest}
                  >
                    <X className="icon" />
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    className="send-button" 
                    disabled={(!inputValue.trim() && !currentImageUrl)}
                  >
                    <Send className="icon" />
                  </button>
                )}
              </div>
            </form>
            <p className="disclaimer">
              Medical AI may display inaccurate info. Always verify with professional medical judgment.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App

