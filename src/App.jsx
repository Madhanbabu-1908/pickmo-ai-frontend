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
    return [{ id: '1', title: 'New conversation', messages: [] }];
  });
  const [activeChatId, setActiveChatId] = useState('1');
  const [activeView, setActiveView] = useState('chat');
  const [useRAG, setUseRAG] = useState(() => {
    const saved = localStorage.getItem('pickmo_useRAG');
    return saved ? JSON.parse(saved) : false;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('pickmo_sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [loadingModels, setLoadingModels] = useState(true);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('pickmo_useRAG', JSON.stringify(useRAG));
  }, [useRAG]);
  useEffect(() => {
    localStorage.setItem('pickmo_sidebarCollapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    axios.get(`${API_URL}/models`).then(res => {
      setModels(res.data);
      const usableModels = res.data.filter(m => !m.type || m.type === 'vision');
      const savedModel = localStorage.getItem('pickmo_selectedModel');
      if (savedModel && usableModels.some(m => m.id === savedModel)) {
        setSelectedModel(savedModel);
      } else if (usableModels.length) {
        setSelectedModel(usableModels[0].id);
      }
      setLoadingModels(false);
    }).catch(err => {
      console.error('Failed to load models:', err);
      setLoadingModels(false);
    });
  }, []);

  useEffect(() => {
    if (selectedModel) localStorage.setItem('pickmo_selectedModel', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chats));
  }, [chats]);

  const sendMessageStream = async (userContent, onChunk, onError) => {
    const activeChat = chats.find(c => c.id === activeChatId);
    let context = '';
    if (useRAG && typeof userContent === 'string') {
      try {
        const ragRes = await axios.post(`${API_URL}/rag/search`, { query: userContent, chatId: activeChatId });
        if (ragRes.data.length) {
          context = "Use the following documents to answer:\n" + ragRes.data.map(d => d.text).join('\n\n');
        }
      } catch (err) { console.error('RAG search failed', err); }
    }

    const cleanMessages = activeChat.messages
      .filter(msg => msg && msg.content && msg.content.length > 0)
      .map(msg => ({ role: msg.role, content: msg.content }));

    if (context) cleanMessages.push({ role: 'system', content: context });
    cleanMessages.push({ role: 'user', content: userContent });

    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: selectedModel, messages: cleanMessages })
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

  // Fork a conversation from a specific message
  const forkChatFromMessage = (messageId, newContent) => {
    const originalChat = chats.find(c => c.id === activeChatId);
    if (!originalChat) return;
    const messageIndex = originalChat.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    
    const newChatId = Date.now().toString();
    const truncatedMessages = originalChat.messages.slice(0, messageIndex + 1);
    truncatedMessages[messageIndex].content = newContent;
    truncatedMessages[messageIndex].edited = true;
    
    const newChat = {
      id: newChatId,
      title: `${originalChat.title} (fork)`,
      messages: truncatedMessages
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
    setActiveView('chat');
  };

  // Export current chat as Markdown
  const exportChatAsMarkdown = () => {
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat || chat.messages.length === 0) {
      alert('No messages to export.');
      return;
    }
    let markdown = `# ${chat.title}\n\n`;
    markdown += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
    for (const msg of chat.messages) {
      const role = msg.role === 'user' ? '**You**' : '**Pickmo.ai**';
      markdown += `${role}:\n${msg.content}\n\n`;
    }
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate shareable link for current chat
  const getShareableLink = () => {
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat || chat.messages.length === 0) {
      alert('No messages to share.');
      return;
    }
    const data = {
      title: chat.title,
      messages: chat.messages.map(m => ({ role: m.role, content: m.content }))
    };
    const compressed = btoa(encodeURIComponent(JSON.stringify(data)));
    const url = `${window.location.origin}/share#${compressed}`;
    navigator.clipboard.writeText(url);
    alert('Shareable link copied to clipboard!');
  };

  // Load shared chat from URL hash (call this in useEffect on mount)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(hash)));
        const newId = Date.now().toString();
        setChats(prev => [{
          id: newId,
          title: decoded.title + ' (shared)',
          messages: decoded.messages.map(msg => ({ ...msg, id: Date.now() + Math.random() }))
        }, ...prev]);
        setActiveChatId(newId);
        // Remove hash from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error('Failed to load shared chat');
      }
    }
  }, []);

  const clearAllChats = () => {
    if (window.confirm('Delete all chat history? This cannot be undone.')) {
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
  const usableModels = models.filter(m => !m.type || m.type === 'vision');

  if (loadingModels) {
    return <div className="flex h-screen bg-gray-900 items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div><p className="text-gray-400">Loading available models...</p></div>;
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
        onExportChat={exportChatAsMarkdown}
        onShareChat={getShareableLink}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'chat' && (
          <>
            <ModelSelector models={usableModels} selected={selectedModel} onChange={setSelectedModel} />
            <ChatArea
              messages={activeChat.messages}
              onSendStream={sendMessageStream}
              chatId={activeChatId}
              updateChatMessages={updateChatMessages}
              apiUrl={API_URL}
              useRAG={useRAG}
              setUseRAG={setUseRAG}
              onForkMessage={forkChatFromMessage}
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
