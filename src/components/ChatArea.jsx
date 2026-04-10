import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Send, Loader2, Paperclip, X, FileText, Sparkles, Copy, Check,
  Bot, User, BookOpen, Edit2, Trash2, CheckCircle, XCircle, Trash,
  Mic, Globe, Volume2, Settings, Zap, Search, Code2, Brain
} from 'lucide-react';
import axios from 'axios';
import { maskPersonalInfo } from './privacy';
import PromptLibrary from './PromptLibrary';

// Agent display config
const AGENT_CONFIG = {
  WebSearchAgent:  { label: 'Web Search',  icon: Globe,  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  RAGAgent:        { label: 'Doc Analysis', icon: BookOpen, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30' },
  CodeAgent:       { label: 'Code Expert', icon: Code2,  color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/30' },
  GeneralAgent:    { label: 'Assistant',   icon: Brain,  color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30' },
};

export default function ChatArea({
  messages, onSendStream, chatId, updateChatMessages, apiUrl,
  useRAG, setUseRAG, systemPrompt, onUpdateSystemPrompt, theme, activeAgent
}) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [attachedImages, setAttachedImages] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [contextDocuments, setContextDocuments] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [reactions, setReactions] = useState(() => {
    const saved = localStorage.getItem(`reactions_${chatId}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [showSystemPromptEditor, setShowSystemPromptEditor] = useState(false);
  const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const editTextareaRef = useRef(null);
  const recognitionRef = useRef(null);

  // Voice recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    localStorage.setItem(`reactions_${chatId}`, JSON.stringify(reactions));
  }, [reactions, chatId]);

  const loadContextDocuments = async () => {
    try {
      const res = await axios.get(`${apiUrl}/rag/documents/${chatId}`);
      if (res.data) setContextDocuments(res.data);
    } catch (err) { console.error('Failed to load context docs:', err); }
  };

  useEffect(() => { loadContextDocuments(); }, [chatId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isAiTyping]);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);
  useEffect(() => {
    if (editTextareaRef.current && editingMessageId) {
      editTextareaRef.current.style.height = 'auto';
      editTextareaRef.current.style.height = Math.min(editTextareaRef.current.scrollHeight, 150) + 'px';
      editTextareaRef.current.focus();
    }
  }, [editingMessageId]);

  const copyToClipboard = (text, index, type = 'message') => {
    navigator.clipboard.writeText(text);
    if (type === 'message') { setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 2000); }
    else { setCopiedCode(index); setTimeout(() => setCopiedCode(null), 2000); }
  };

  const saveToResources = (content, filename) => {
    const savedDocs = JSON.parse(localStorage.getItem('generatedDocuments') || '[]');
    savedDocs.push({ id: Date.now(), name: filename, content, date: new Date().toISOString(), type: 'generated' });
    localStorage.setItem('generatedDocuments', JSON.stringify(savedDocs));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingFiles(true);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setAttachedImages(prev => [...prev, { id: Date.now(), name: file.name, data: event.target.result, type: file.type }]);
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target.result;
          try {
            await axios.post(`${apiUrl}/rag/upload`, { text: content, name: file.name, chatId });
            loadContextDocuments();
            if (!useRAG) setUseRAG(true);
          } catch (err) { console.error('Upload failed:', err); }
        };
        reader.readAsText(file);
      }
    }
    setUploadingFiles(false);
    fileInputRef.current.value = '';
  };

  const removeContextDocument = async (docId) => {
    try {
      await axios.delete(`${apiUrl}/rag/document/${chatId}/${docId}`);
      loadContextDocuments();
      if (contextDocuments.length === 1) setUseRAG(false);
    } catch (err) { console.error('Failed to delete document:', err); }
  };

  const clearAllContextDocs = async () => {
    if (window.confirm('Remove all documents from context?')) {
      try {
        await axios.delete(`${apiUrl}/rag/delete/${chatId}`);
        setContextDocuments([]);
        setUseRAG(false);
      } catch (err) { console.error('Failed to clear documents:', err); }
    }
  };

  const removeImage = (id) => setAttachedImages(prev => prev.filter(img => img.id !== id));

  const startEditMessage = (messageId, currentContent) => {
    setEditingMessageId(messageId);
    setEditingContent(currentContent);
  };
  const cancelEdit = () => { setEditingMessageId(null); setEditingContent(''); };

  const saveEditAndResend = async (messageId, originalContent) => {
    if (!editingContent.trim()) return;
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    const updatedMessages = messages.slice(0, messageIndex);
    const editedMessage = { ...messages[messageIndex], id: Date.now(), content: editingContent, edited: true, originalContent };
    updatedMessages.push(editedMessage);
    updateChatMessages(chatId, () => updatedMessages);
    setEditingMessageId(null);
    setEditingContent('');
    setIsStreaming(true);
    setIsAiTyping(true);
    updateChatMessages(chatId, (prev) => [...prev, { role: 'assistant', content: '', id: Date.now() + 1 }]);
    let fullContent = '';
    await onSendStream(editingContent,
      (chunk) => {
        fullContent += chunk;
        updateChatMessages(chatId, (prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { role: 'assistant', content: fullContent, id: newMsgs[newMsgs.length - 1].id };
          return newMsgs;
        });
      },
      (error) => {
        console.error(error);
        updateChatMessages(chatId, (prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { role: 'assistant', content: 'I encountered an error. Please try again.', id: newMsgs[newMsgs.length - 1].id };
          return newMsgs;
        });
      },
      enableWebSearch
    );
    setIsStreaming(false);
    setIsAiTyping(false);
  };

  const deleteMessageAndAfter = (messageId) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    updateChatMessages(chatId, () => messages.slice(0, messageIndex));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!input.trim() && attachedImages.length === 0) || isStreaming) return;

    const userMsg = input;
    const sanitizedUserMsg = maskPersonalInfo(userMsg);
    setInput('');

    const contentArray = [];
    if (sanitizedUserMsg.trim()) contentArray.push({ type: 'text', text: sanitizedUserMsg });
    for (const img of attachedImages) contentArray.push({ type: 'image_url', image_url: { url: img.data } });

    let finalUserContent;
    let ragContext = '';

    if (contextDocuments.length > 0) {
      try {
        const ragRes = await axios.post(`${apiUrl}/rag/search`, { query: sanitizedUserMsg || 'Please analyze these documents.', chatId });
        if (ragRes.data.length) {
          ragContext = "Use the following relevant document excerpts to answer:\n" + ragRes.data.map(d => `[From: ${d.name}]\n${d.text}\n`).join('\n');
        }
      } catch (err) { console.error('RAG search failed:', err); }
    }

    if (ragContext) {
      const fullText = `${ragContext}\n\n${sanitizedUserMsg || 'Please analyze the documents.'}`;
      if (attachedImages.length > 0) {
        contentArray.unshift({ type: 'text', text: fullText });
        finalUserContent = contentArray;
      } else {
        finalUserContent = fullText;
      }
      if (!useRAG) setUseRAG(true);
    } else {
      finalUserContent = contentArray.length === 1 && contentArray[0].type === 'text'
        ? contentArray[0].text
        : contentArray;
    }

    setIsStreaming(true);
    setIsAiTyping(true);

    const displayText = userMsg || (attachedImages.length ? `📷 Image(s) attached` : '');
    const newUserMessage = { id: Date.now(), role: 'user', content: displayText };
    updateChatMessages(chatId, (prev) => [...prev, newUserMessage]);
    updateChatMessages(chatId, (prev) => [...prev, { role: 'assistant', content: '', id: Date.now() + 1 }]);

    let fullContent = '';
    await onSendStream(finalUserContent,
      (chunk) => {
        fullContent += chunk;
        if (isAiTyping) setIsAiTyping(false);
        updateChatMessages(chatId, (prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { role: 'assistant', content: fullContent, id: newMsgs[newMsgs.length - 1].id };
          return newMsgs;
        });
      },
      (error) => {
        console.error(error);
        setIsAiTyping(false);
        updateChatMessages(chatId, (prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { role: 'assistant', content: 'I encountered an error. Please try again.', id: newMsgs[newMsgs.length - 1].id };
          return newMsgs;
        });
      },
      enableWebSearch
    );

    setAttachedImages([]);
    setIsStreaming(false);
    setIsAiTyping(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };
  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEditAndResend(editingMessageId, editingContent); }
    if (e.key === 'Escape') cancelEdit();
  };
  const insertPrompt = (text) => { setInput(prev => prev + (prev ? ' ' : '') + text); };
  const saveSystemPrompt = () => { onUpdateSystemPrompt(chatId, localSystemPrompt); setShowSystemPromptEditor(false); };

  const codeTheme = theme === 'dark' ? vscDarkPlus : vs;

  const MarkdownComponents = {
    h1: ({ children }) => <h1 className="text-xl font-bold mt-5 mb-3 text-pickmo-text">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-semibold mt-4 mb-2 border-l-2 border-violet-500 pl-3 text-pickmo-text">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1 text-pickmo-text">{children}</h3>,
    ul: ({ children }) => <ul className="list-none ml-0 my-2 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal ml-5 my-2 space-y-1">{children}</ol>,
    li: ({ children }) => (
      <li className="text-sm text-pickmo-muted flex gap-2 items-start">
        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
        <span>{children}</span>
      </li>
    ),
    p: ({ children }) => <p className="mb-2 leading-relaxed text-sm text-pickmo-text">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold text-violet-300">{children}</strong>,
    em: ({ children }) => <em className="italic text-pickmo-muted">{children}</em>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors text-sm">
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-violet-400/50 pl-4 my-3 text-pickmo-muted bg-violet-500/5 rounded-r-lg py-2">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-4 border-white/10" />,
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const codeText = String(children).replace(/\n$/, '');
      const codeId = `${chatId}-${Date.now()}-${Math.random()}`;
      if (!inline && match) {
        return (
          <div className="relative group my-3 rounded-xl overflow-hidden border border-white/10">
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
              <span className="text-xs text-pickmo-muted font-mono">{match[1]}</span>
              <button
                onClick={() => copyToClipboard(codeText, codeId, 'code')}
                className="flex items-center gap-1.5 text-xs text-pickmo-muted hover:text-pickmo-text transition-colors"
              >
                {copiedCode === codeId
                  ? <><Check size={12} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                  : <><Copy size={12} /><span>Copy</span></>}
              </button>
            </div>
            <SyntaxHighlighter
              style={codeTheme}
              language={match[1]}
              PreTag="div"
              customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.78rem', background: theme === 'dark' ? '#0d0d14' : '#f8f9fa' }}
            >
              {codeText}
            </SyntaxHighlighter>
          </div>
        );
      }
      return (
        <code className="bg-violet-500/15 border border-violet-500/20 px-1.5 py-0.5 rounded text-violet-300 text-xs font-mono" {...props}>
          {children}
        </code>
      );
    },
    table: ({ children }) => (
      <div className="overflow-x-auto my-4 rounded-xl border border-white/10">
        <table className="min-w-full border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
    tr: ({ children }) => <tr className="hover:bg-white/3 transition-colors">{children}</tr>,
    th: ({ children }) => <th className="px-4 py-2.5 text-left text-xs font-semibold text-pickmo-muted uppercase tracking-wider">{children}</th>,
    td: ({ children }) => <td className="px-4 py-2.5 text-sm text-pickmo-text">{children}</td>,
    img: ({ src, alt }) => (
      <img src={src} alt={alt} className="max-w-full rounded-xl my-3 border border-white/10 shadow-xl" />
    ),
  };

  const agentInfo = activeAgent ? AGENT_CONFIG[activeAgent] : AGENT_CONFIG.GeneralAgent;
  const AgentIcon = agentInfo.icon;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-pickmo-bg">

      {/* ── Top Controls Bar ── */}
      <div className="border-b border-white/8 px-4 py-2 flex items-center justify-between bg-pickmo-surface/30 backdrop-blur-sm gap-3 flex-wrap">
        {/* Agent indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${agentInfo.bg} ${agentInfo.color}`}>
          <AgentIcon size={12} />
          <span>{agentInfo.label}</span>
          {isStreaming && <span className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>}
        </div>

        <div className="flex items-center gap-2">
          {/* Web Search Toggle */}
          <button
            onClick={() => setEnableWebSearch(!enableWebSearch)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              enableWebSearch
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-glow-emerald'
                : 'bg-white/5 text-pickmo-muted border border-white/10 hover:bg-white/10 hover:text-pickmo-text'
            }`}
          >
            <Search size={12} />
            <span>Web Search</span>
            {enableWebSearch && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>

          {/* System Prompt */}
          <button
            onClick={() => setShowSystemPromptEditor(!showSystemPromptEditor)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-pickmo-muted border border-white/10 bg-white/5 hover:bg-white/10 hover:text-pickmo-text transition-all"
          >
            <Settings size={12} />
            <span className="hidden sm:block">Instructions</span>
          </button>
        </div>
      </div>

      {/* ── System Prompt Editor ── */}
      {showSystemPromptEditor && (
        <div className="border-b border-white/8 px-4 py-3 bg-pickmo-surface/20 backdrop-blur-sm animate-fade-down">
          <div className="max-w-3xl mx-auto flex gap-2 items-start">
            <textarea
              value={localSystemPrompt}
              onChange={(e) => setLocalSystemPrompt(e.target.value)}
              placeholder="Custom instructions for this conversation… e.g., 'Reply only in bullet points' or 'Act as a Python tutor'"
              className="flex-1 bg-pickmo-input rounded-xl px-3 py-2 text-xs text-pickmo-text placeholder-pickmo-muted focus:outline-none focus:ring-1 focus:ring-violet-500/50 border border-white/10 resize-none h-16"
            />
            <button onClick={saveSystemPrompt}
              className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-xl transition font-medium shadow-glow-violet">
              Save
            </button>
          </div>
        </div>
      )}

      {/* ── RAG Status Bar ── */}
      {(useRAG || contextDocuments.length > 0) && (
        <div className="border-b border-violet-500/20 px-4 py-2 bg-violet-500/5">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs">
              <BookOpen size={12} className="text-violet-400" />
              <span className="text-violet-300 font-medium">Document context active</span>
              <span className="text-violet-400/60">· {contextDocuments.length} file(s)</span>
            </div>
            <button onClick={clearAllContextDocs}
              className="text-xs text-red-400 hover:text-red-300 transition flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-red-500/10">
              <Trash size={10} /> Clear all
            </button>
          </div>
        </div>
      )}

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">

          {/* Welcome Screen */}
          {messages.length === 0 && (
            <div className="text-center py-12 select-none">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600/30 to-cyan-600/30 border border-white/10 mb-8 shadow-glow-violet">
                <Sparkles size={32} className="text-violet-400" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
                <span className="text-gradient">Pickmo.ai</span>
              </h1>
              <p className="text-pickmo-muted text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                Your intelligent AI assistant with web search, document analysis, and code expertise.
              </p>

              {/* Capability Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto mb-8">
                {[
                  { icon: Globe, label: 'Web Search', desc: 'Real-time info', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                  { icon: BookOpen, label: 'Documents', desc: 'Upload & analyze', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
                  { icon: Code2, label: 'Code', desc: 'Write & debug', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
                  { icon: Brain, label: 'Reasoning', desc: 'Deep thinking', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                ].map(({ icon: Icon, label, desc, color, bg }) => (
                  <div key={label} className={`rounded-xl p-3 border ${bg} flex flex-col items-center gap-1 text-center`}>
                    <Icon size={18} className={color} />
                    <span className={`text-xs font-semibold ${color}`}>{label}</span>
                    <span className="text-[10px] text-pickmo-muted">{desc}</span>
                  </div>
                ))}
              </div>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { icon: '💬', text: 'What can you help me with?' },
                  { icon: '💻', text: 'Write a Python web scraper' },
                  { icon: '🌐', text: 'Latest AI news (web search)' },
                  { icon: '📄', text: 'Upload a document to analyze' },
                ].map(({ icon, text }) => (
                  <button key={text} onClick={() => setInput(text)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-pickmo-muted hover:text-pickmo-text border border-white/10 hover:border-white/20 transition-all">
                    <span>{icon}</span>
                    <span>{text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message List */}
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isEditing = editingMessageId === msg.id;

            return (
              <div key={msg.id || idx}
                className={`flex gap-3 mb-6 animate-fadeIn ${isUser ? 'justify-end' : 'justify-start'} group`}>

                {/* Avatar */}
                {!isUser && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center shadow-glow-violet">
                    <Bot size={14} className="text-white" />
                  </div>
                )}

                <div className={`flex-1 max-w-[88%] sm:max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {isEditing ? (
                    <div className="w-full bg-pickmo-surface rounded-2xl p-3 border border-violet-500/30 shadow-xl">
                      <textarea
                        ref={editTextareaRef}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        className="w-full bg-pickmo-input rounded-xl p-2.5 text-sm text-pickmo-text resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 border border-white/10"
                        rows={3}
                        placeholder="Edit your message…"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={cancelEdit}
                          className="px-3 py-1 text-xs text-pickmo-muted hover:text-pickmo-text rounded-lg hover:bg-white/10 transition flex items-center gap-1">
                          <XCircle size={11} /> Cancel
                        </button>
                        <button onClick={() => saveEditAndResend(msg.id, editingContent)}
                          className="px-3 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition flex items-center gap-1 font-medium">
                          <CheckCircle size={11} /> Resend
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Message Bubble */}
                      {isUser ? (
                        <div className="bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-lg max-w-full">
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {msg.content}
                            {msg.edited && <span className="ml-2 text-[10px] text-violet-300">(edited)</span>}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-pickmo-surface border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg max-w-full">
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown
                              rehypePlugins={[rehypeRaw]}
                              components={MarkdownComponents}
                            >
                              {msg.content || (isStreaming && idx === messages.length - 1 ? '▋' : '')}
                            </ReactMarkdown>
                            {isStreaming && idx === messages.length - 1 && msg.content && (
                              <span className="inline-block w-2 h-4 bg-violet-400 ml-0.5 animate-cursor-blink rounded-sm" />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Row */}
                      <div className={`flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        {isUser && (
                          <>
                            <ActionBtn onClick={() => startEditMessage(msg.id, msg.content)} icon={<Edit2 size={10} />} label="Edit" />
                            <ActionBtn onClick={() => deleteMessageAndAfter(msg.id)} icon={<Trash2 size={10} />} label="Delete" danger />
                          </>
                        )}
                        {msg.role === 'assistant' && !isStreaming && msg.content && (
                          <>
                            <ActionBtn
                              onClick={() => copyToClipboard(msg.content, idx, 'message')}
                              icon={copiedIndex === idx ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                              label={copiedIndex === idx ? 'Copied' : 'Copy'}
                            />
                            {msg.content.length > 100 && (
                              <ActionBtn
                                onClick={() => saveToResources(msg.content, `response-${Date.now()}.txt`)}
                                icon={<FileText size={10} />}
                                label="Save"
                              />
                            )}
                            <ActionBtn onClick={() => speak(msg.content)} icon={<Volume2 size={10} />} label="Speak" />
                            <div className="flex gap-1 ml-1">
                              <button onClick={() => setReactions(prev => ({ ...prev, [msg.id]: '👍' }))}
                                className={`text-sm transition-transform ${reactions[msg.id] === '👍' ? 'scale-125' : 'opacity-60 hover:opacity-100 hover:scale-110'}`}>
                                👍
                              </button>
                              <button onClick={() => setReactions(prev => ({ ...prev, [msg.id]: '👎' }))}
                                className={`text-sm transition-transform ${reactions[msg.id] === '👎' ? 'scale-125' : 'opacity-60 hover:opacity-100 hover:scale-110'}`}>
                                👎
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* User Avatar */}
                {isUser && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center border border-white/10">
                    <User size={14} className="text-white/80" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isAiTyping && (
            <div className="flex justify-start mb-4 gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-pickmo-surface border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(delay => (
                      <span key={delay} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                  <span className="text-xs text-pickmo-muted">Thinking…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Document Chips ── */}
      {contextDocuments.length > 0 && (
        <div className="border-t border-white/8 px-4 py-2 bg-pickmo-surface/20">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-2 items-center">
            <span className="text-xs text-pickmo-muted">Context:</span>
            {contextDocuments.map(doc => (
              <div key={doc.id}
                className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-pickmo-muted hover:border-white/20 transition-all group">
                <FileText size={10} className="text-violet-400" />
                <span className="truncate max-w-[100px]">{doc.name}</span>
                <button onClick={() => removeContextDocument(doc.id)}
                  className="opacity-0 group-hover:opacity-100 text-pickmo-muted hover:text-red-400 transition-all ml-0.5">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Image Previews ── */}
      {attachedImages.length > 0 && (
        <div className="border-t border-white/8 px-4 py-2 bg-pickmo-surface/20">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
            {attachedImages.map(img => (
              <div key={img.id} className="relative group">
                <img src={img.data} alt={img.name} className="h-14 w-14 object-cover rounded-xl border border-white/10 shadow-lg" />
                <button onClick={() => removeImage(img.id)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Input Area ── */}
      <div className="border-t border-white/8 bg-pickmo-surface/50 backdrop-blur-xl p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 bg-pickmo-input rounded-2xl border border-white/10 focus-within:border-violet-500/40 focus-within:shadow-glow-violet transition-all duration-300 px-3 py-3">
            <textarea
              ref={textareaRef}
              rows="1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                contextDocuments.length > 0
                  ? `Ask about your ${contextDocuments.length} document(s)…`
                  : enableWebSearch
                    ? 'Search the web…'
                    : 'Message Pickmo.ai…'
              }
              disabled={isStreaming}
              className="flex-1 bg-transparent focus:outline-none disabled:opacity-50 resize-none text-sm text-pickmo-text placeholder-pickmo-muted leading-relaxed min-h-[24px]"
              style={{ maxHeight: '120px' }}
            />

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <PromptLibrary onInsertPrompt={insertPrompt} />

              {/* Attach */}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || uploadingFiles}
                className="p-1.5 text-pickmo-muted hover:text-pickmo-text hover:bg-white/10 rounded-lg transition disabled:opacity-40"
                title="Attach file or image">
                {uploadingFiles ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
              </button>

              {/* Mic */}
              <button type="button" onClick={startListening} disabled={isStreaming}
                className={`p-1.5 rounded-lg transition ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-pickmo-muted hover:text-pickmo-text hover:bg-white/10'} disabled:opacity-40`}>
                <Mic size={15} />
              </button>

              {/* Send */}
              <button
                onClick={handleSubmit}
                disabled={isStreaming || (!input.trim() && attachedImages.length === 0)}
                className="p-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all shadow-glow-violet disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none ml-0.5"
              >
                {isStreaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>

            <input ref={fileInputRef} type="file" multiple
              accept=".txt,.md,.pdf,.doc,.docx,image/*"
              onChange={handleFileUpload} className="hidden" disabled={isStreaming} />
          </div>

          {/* Footer hint */}
          <div className="flex justify-between items-center mt-2 px-1">
            <p className="text-[10px] text-pickmo-muted">
              <kbd className="px-1.5 py-0.5 bg-white/8 rounded text-[9px] font-mono border border-white/10">Enter</kbd> to send ·{' '}
              <kbd className="px-1.5 py-0.5 bg-white/8 rounded text-[9px] font-mono border border-white/10">Shift+Enter</kbd> for new line
            </p>
            <p className="text-[10px] text-pickmo-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              PII protected · Responsible AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Micro action button
function ActionBtn({ onClick, icon, label, danger = false }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-all ${
        danger
          ? 'text-pickmo-muted hover:text-red-400 hover:bg-red-500/10'
          : 'text-pickmo-muted hover:text-pickmo-text hover:bg-white/8'
      }`}>
      {icon} <span>{label}</span>
    </button>
  );
}
