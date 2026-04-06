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

const loadPreference = (key, defaultValue) => {
  const saved = localStorage.getItem(`pickmo_${key}`);
  return saved !== null ? JSON.parse(saved) : defaultValue;
};
const savePreference = (key, value) => {
  localStorage.setItem(`pickmo_${key}`, JSON.stringify(value));
};

function App() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map(chat => ({
        ...chat,
        messages: chat.messages.map(msg => ({ ...msg, id: msg.id || `msg-${Date.now()}-${Math.random()}` })),
        systemPrompt: chat.systemPrompt || ''
      }));
    }
    return [{ id: '1', title: 'New conversation', messages: [], systemPrompt: '' }];
  });
  const [activeChatId, setActiveChatId] = useState('1');
  const [activeView, setActiveView] = useState('chat');
  const [useRAG, setUseRAG] = useState(() => loadPreference('useRAG', false));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => loadPreference('sidebarCollapsed', false));
  const [loadingModels, setLoadingModels] = useState(true);
  const [theme, setTheme] = useState(() => loadPreference('theme', 'dark'));

  // Apply theme to html element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    savePreference('theme', theme);
  }, [theme]);

  useEffect(() => {
    savePreference('useRAG', useRAG);
  }, [useRAG]);
  useEffect(() => {
    savePreference('sidebarCollapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  useEffect(() => {
    axios.get(`${API_URL}/models`).then(res => {
      setModels(res.data);
      const usableModels = res.data.filter(m => !m.type || m.type === 'vision');
      const savedModel = loadPreference('selectedModel', '');
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
    if (selectedModel) savePreference('selectedModel', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chats));
  }, [chats]);

  // Load shared chat from URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(hash)));
        const newId = Date.now().toString();
        setChats(prev => [{
          id: newId,
          title: decoded.title + ' (shared)',
          messages: decoded.messages.map(msg => ({ ...msg, id: Date.now() + Math.random() })),
          systemPrompt: ''
        }, ...prev]);
        setActiveChatId(newId);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) { console.error('Failed to load shared chat'); }
    }
  }, []);

  const generateChatTitle = async (chatId, userMessage) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat && chat.title !== 'New conversation') return;
    try {
      const response = await axios.post(`${API_URL}/chat/title`, { message: userMessage });
      const title = response.data.title;
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: title.substring(0, 30) } : c));
    } catch (err) { console.error('Title generation failed'); }
  };

  const sendMessageStream = async (userContent, onChunk, onError, enableSearch = false) => {
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

    if (activeChat.systemPrompt) {
      cleanMessages.unshift({ role: 'system', content: activeChat.systemPrompt });
    }
    if (context) cleanMessages.push({ role: 'system', content: context });
    cleanMessages.push({ role: 'user', content: userContent });

    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: selectedModel, messages: cleanMessages, enableSearch })
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        if (firstChunk && activeChat.title === 'New conversation' && typeof userContent === 'string') {
          generateChatTitle(activeChatId, userContent);
          firstChunk = false;
        }
        onChunk(chunk);
      }
    } catch (err) {
      onError(err);
    }
  };

  const newChat = () => {
    const newId = Date.now().toString();
    setChats(prev => [{ id: newId, title: 'New conversation', messages: [], systemPrompt: '' }, ...prev]);
    setActiveChatId(newId);
    setActiveView('chat');
    setUseRAG(false);
  };

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
      messages: truncatedMessages,
      systemPrompt: originalChat.systemPrompt
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
    setActiveView('chat');
  };

  const exportChatAsMarkdown = () => {
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat || chat.messages.length === 0) return alert('No messages to export.');
    let markdown = `# ${chat.title}\n\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
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

  const getShareableLink = () => {
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat || chat.messages.length === 0) return alert('No messages to share.');
    const data = { title: chat.title, messages: chat.messages.map(m => ({ role: m.role, content: m.content })) };
    const compressed = btoa(encodeURIComponent(JSON.stringify(data)));
    const url = `${window.location.origin}/share#${compressed}`;
    navigator.clipboard.writeText(url);
    alert('Shareable link copied to clipboard!');
  };

  const clearAllChats = () => {
    if (window.confirm('Delete all chat history? This cannot be undone.')) {
      setChats([{ id: '1', title: 'New conversation', messages: [], systemPrompt: '' }]);
      setActiveChatId('1');
      setActiveView('chat');
      setUseRAG(false);
      localStorage.removeItem('generatedDocuments');
    }
  };

  const updateSystemPrompt = (chatId, prompt) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, systemPrompt: prompt } : c));
  };

  const updateChatMessages = (chatId, updater) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: updater(c.messages) } : c));
  };

  const activeChat = chats.find(c => c.id === activeChatId) || { messages: [], systemPrompt: '' };
  const usableModels = models.filter(m => !m.type || m.type === 'vision');

  if (loadingModels) {
    return (
      <div className="flex h-screen bg-white dark:bg-gray-900 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading available models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors overflow-hidden">
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
        theme={theme}
        setTheme={setTheme}
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
              systemPrompt={activeChat.systemPrompt}
              onUpdateSystemPrompt={updateSystemPrompt}
              theme={theme}
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
