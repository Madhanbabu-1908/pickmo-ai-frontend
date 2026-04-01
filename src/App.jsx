import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ModelSelector from './components/ModelSelector';
import Resources from './components/Resources';
import HelpSupport from './components/HelpSupport';
import Suggestion from './components/Suggestion';
import Download from './components/Download';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map(chat => ({
        ...chat,
        messages: chat.messages.map(msg => ({
          ...msg,
          id: msg.id || `msg-${Date.now()}-${Math.random()}`
        }))
      }));
    }
    return [{ 
      id: '1', 
      title: 'New conversation', 
      messages: [] 
    }];
  });
  const [activeChatId, setActiveChatId] = useState('1');
  const [activeView, setActiveView] = useState('chat');
  const [useRAG, setUseRAG] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/models`).then(res => {
      console.log('Dynamic models loaded:', res.data);
      setModels(res.data);
      // Include text models AND vision models
      const usableModels = res.data.filter(m => !m.type || m.type === 'vision');
      if (usableModels.length) setSelectedModel(usableModels[0].id);
      setLoadingModels(false);
    }).catch(err => {
      console.error('Failed to load models:', err);
      setLoadingModels(false);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chats));
  }, [chats]);

  // Updated to accept userContent as string or array (multimodal)
  const sendMessageStream = async (userContent, onChunk, onError) => {
    const activeChat = chats.find(c => c.id === activeChatId);
    let context = '';
    
    // RAG only works with plain text; if userContent is array (has images), skip RAG
    if (useRAG && typeof userContent === 'string') {
      try {
        const ragRes = await axios.post(`${API_URL}/rag/search`, { query: userContent });
        if (ragRes.data.length) {
          context = "Use the following documents to answer:\n" + ragRes.data.map(d => d.text).join('\n\n');
        }
      } catch (err) { 
        console.error('RAG search failed', err); 
      }
    }
    
    // Build messages array from chat history (preserve existing messages)
    const cleanMessages = activeChat.messages
      .filter(msg => msg && msg.content && msg.content.length > 0)
      .map(msg => ({ role: msg.role, content: msg.content }));
    
    if (context) {
      cleanMessages.push({ role: 'system', content: context });
    }
    
    // Add the new user content (can be string or array)
    cleanMessages.push({ role: 'user', content: userContent });
    
    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          modelId: selectedModel, 
          messages: cleanMessages
        })
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        onChunk(decoder.decode(value));
      }
    } catch (err) {
      onError(err);
    }
  };

  const newChat = () => {
    const newId = Date.now().toString();
    setChats(prev => [{ id: newId, title: 'New conversation', messages: [] }, ...prev]);
    setActiveChatId(newId);
    setActiveView('chat');
    setUseRAG(false);
  };

  const clearAllChats = () => {
    if (window.confirm('Are you sure you want to delete all chat history? This cannot be undone.')) {
      setChats([{ id: '1', title: 'New conversation', messages: [] }]);
      setActiveChatId('1');
      setActiveView('chat');
      setUseRAG(false);
      localStorage.removeItem('generatedDocuments');
    }
  };

  const updateChatMessages = (chatId, updater) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: updater(c.messages) } : c));
  };

  const activeChat = chats.find(c => c.id === activeChatId) || { messages: [] };
  // Include both text and vision models
  const usableModels = models.filter(m => !m.type || m.type === 'vision');

  if (loadingModels) {
    return (
      <div className="flex h-screen bg-gray-900 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading available models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white overflow-hidden">
      <Sidebar 
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => { setActiveChatId(id); setActiveView('chat'); setUseRAG(false); }}
        onNewChat={newChat}
        onSelectResources={() => setActiveView('resources')}
        onSelectHelp={() => setActiveView('help')}
        onSelectSuggestion={() => setActiveView('suggestion')}
        onSelectDownload={() => setActiveView('download')}
        onClearHistory={clearAllChats}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'chat' && (
          <>
            <ModelSelector 
              models={usableModels} 
              selected={selectedModel} 
              onChange={setSelectedModel}
            />
            <ChatArea 
              messages={activeChat.messages} 
              onSendStream={sendMessageStream}
              chatId={activeChatId}
              updateChatMessages={updateChatMessages}
              apiUrl={API_URL}
              useRAG={useRAG}
              setUseRAG={setUseRAG}
            />
          </>
        )}
        {activeView === 'resources' && <Resources apiUrl={API_URL} />}
        {activeView === 'help' && <HelpSupport apiUrl={API_URL} />}
        {activeView === 'suggestion' && <Suggestion apiUrl={API_URL} />}
        {activeView === 'download' && <Download />}
      </div>
    </div>
  );
}

export default App;
