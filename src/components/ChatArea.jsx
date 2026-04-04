import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Paperclip, X, FileText, Sparkles, Copy, Check, Bot, User, BookOpen, Edit2, Trash2, CheckCircle, XCircle, Trash, Mic } from 'lucide-react';
import axios from 'axios';
import { maskPersonalInfo } from './privacy';

export default function ChatArea({ messages, onSendStream, chatId, updateChatMessages, apiUrl, useRAG, setUseRAG, onForkMessage }) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [attachedImages, setAttachedImages] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [contextDocuments, setContextDocuments] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [reactions, setReactions] = useState(() => {
    const saved = localStorage.getItem(`reactions_${chatId}`);
    return saved ? JSON.parse(saved) : {};
  });
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const editTextareaRef = useRef(null);
  const recognitionRef = useRef(null);

  // Voice recognition setup
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

  // Save reactions
  useEffect(() => {
    localStorage.setItem(`reactions_${chatId}`, JSON.stringify(reactions));
  }, [reactions, chatId]);

  const loadContextDocuments = async () => {
    try {
      const res = await axios.get(`${apiUrl}/rag/documents/${chatId}`);
      if (res.data) setContextDocuments(res.data);
    } catch (err) {
      console.error('Failed to load context docs:', err);
    }
  };

  useEffect(() => {
    loadContextDocuments();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

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

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setAttachedImages(prev => [...prev, {
            id: Date.now(),
            name: file.name,
            data: event.target.result,
            type: file.type
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target.result;
          try {
            await axios.post(`${apiUrl}/rag/upload`, {
              text: content,
              name: file.name,
              chatId: chatId
            });
            loadContextDocuments();
            if (!useRAG) setUseRAG(true);
          } catch (err) {
            console.error('Upload failed:', err);
          }
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
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const clearAllContextDocs = async () => {
    if (window.confirm('Remove all documents from context? They will remain in Resources but will not be used for current conversation.')) {
      try {
        await axios.delete(`${apiUrl}/rag/delete/${chatId}`);
        setContextDocuments([]);
        setUseRAG(false);
      } catch (err) {
        console.error('Failed to clear documents:', err);
      }
    }
  };

  const removeImage = (id) => setAttachedImages(prev => prev.filter(img => img.id !== id));

  const startEditMessage = (messageId, currentContent) => {
    setEditingMessageId(messageId);
    setEditingContent(currentContent);
  };
  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };
  const saveEditAndResend = async (messageId, originalContent) => {
    if (!editingContent.trim()) return;
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    const updatedMessages = messages.slice(0, messageIndex);
    const editedMessage = {
      ...messages[messageIndex],
      id: Date.now(),
      content: editingContent,
      edited: true,
      originalContent: originalContent
    };
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
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'assistant', content: fullContent, id: newMessages[newMessages.length - 1].id };
          return newMessages;
        });
      },
      (error) => {
        console.error(error);
        updateChatMessages(chatId, (prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'assistant', content: 'I apologize, but I encountered an error. Please try again.', id: newMessages[newMessages.length - 1].id };
          return newMessages;
        });
      }
    );
    setIsStreaming(false);
    setIsAiTyping(false);
  };

  const deleteMessageAndAfter = (messageId) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    const updatedMessages = messages.slice(0, messageIndex);
    updateChatMessages(chatId, () => updatedMessages);
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
        const ragRes = await axios.post(`${apiUrl}/rag/search`, {
          query: sanitizedUserMsg || 'Please analyze these documents.',
          chatId: chatId
        });
        if (ragRes.data.length) {
          ragContext = "Use the following relevant document excerpts to answer:\n" +
            ragRes.data.map(d => `[From: ${d.name}]\n${d.text}\n`).join('\n');
        }
      } catch (err) {
        console.error('RAG search failed:', err);
      }
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
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'assistant', content: fullContent, id: newMessages[newMessages.length - 1].id };
          return newMessages;
        });
      },
      (error) => {
        console.error(error);
        setIsAiTyping(false);
        updateChatMessages(chatId, (prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'assistant', content: 'I apologize, but I encountered an error. Please try again.', id: newMessages[newMessages.length - 1].id };
          return newMessages;
        });
      }
    );

    setAttachedImages([]);
    setIsStreaming(false);
    setIsAiTyping(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEditAndResend(editingMessageId, editingContent);
    }
    if (e.key === 'Escape') cancelEdit();
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };
  const saveToResources = (content, filename) => {
    const savedDocs = JSON.parse(localStorage.getItem('generatedDocuments') || '[]');
    savedDocs.push({ id: Date.now(), name: filename, content, date: new Date().toISOString(), type: 'generated' });
    localStorage.setItem('generatedDocuments', JSON.stringify(savedDocs));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {(useRAG || contextDocuments.length > 0) && (
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-blue-500/30 px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <BookOpen size={14} className="text-blue-400" />
              <span className="text-blue-300">Document context active</span>
              <span className="text-xs text-gray-400">- {contextDocuments.length} document(s) in context</span>
            </div>
            {contextDocuments.length > 0 && (
              <button onClick={clearAllContextDocs} className="text-xs text-red-400 hover:text-red-300 transition px-2 py-0.5 rounded hover:bg-red-600/20">
                <Trash size={12} className="inline mr-1" /> Clear all
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-600/20 mb-6"><Sparkles size={32} className="text-blue-400" /></div>
              <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Pickmo.ai</h1>
              <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">Your intelligent AI assistant. Upload documents or images, or start a conversation.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <SuggestionChip onClick={() => setInput("What can you help me with?")} icon="💬" text="What can you help me with?" />
                <SuggestionChip onClick={() => setInput("Write a short story")} icon="📖" text="Write a story" />
                <SuggestionChip onClick={() => setInput("Explain quantum computing")} icon="🔬" text="Explain quantum computing" />
                <SuggestionChip onClick={() => setInput("Create a business plan")} icon="💼" text="Business plan" />
              </div>
              <div className="mt-8 p-3 bg-gray-800/30 rounded-xl border border-gray-700/50 max-w-md mx-auto">
                <div className="flex items-center gap-2"><Paperclip size={16} className="text-blue-400" /><p className="text-xs text-gray-300">Upload a document – it will stay active for the whole conversation</p></div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isEditing = editingMessageId === msg.id;
            return (
              <div key={msg.id || idx} className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'} group`}>
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${isUser ? 'bg-gradient-to-r from-blue-500 to-purple-600 order-2' : 'bg-gradient-to-r from-purple-500 to-pink-600'}`}>
                  {isUser ? <User size={12} /> : <Bot size={12} />}
                </div>
                <div className={`flex-1 max-w-[85%] ${isUser ? 'order-1' : ''}`}>
                  {isEditing ? (
                    <div className="bg-gray-800 rounded-2xl p-3 border border-blue-500/50">
                      <textarea ref={editTextareaRef} value={editingContent} onChange={(e) => setEditingContent(e.target.value)} onKeyDown={handleEditKeyDown} className="w-full bg-gray-900 rounded-xl p-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" rows={3} placeholder="Edit your message..." />
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={cancelEdit} className="px-2 py-1 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"><XCircle size={12} className="inline mr-1" /> Cancel</button>
                        <button onClick={() => saveEditAndResend(msg.id, editingContent)} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded-lg"><CheckCircle size={12} className="inline mr-1" /> Send</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`rounded-2xl px-4 py-2 ${isUser ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' : 'bg-gray-800/50 text-gray-100 border border-gray-700/50'}`}>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-invert prose-sm max-w-none overflow-x-auto">
                            <ReactMarkdown components={{
                              table: ({ children }) => <div className="overflow-x-auto my-2"><table className="min-w-full border-collapse border border-gray-600">{children}</table></div>,
                              th: ({ children }) => <th className="border border-gray-600 px-3 py-1 text-left text-sm">{children}</th>,
                              td: ({ children }) => <td className="border border-gray-600 px-3 py-1 text-sm">{children}</td>,
                              code: ({ node, inline, className, children, ...props }) => <code className={`${className} ${inline ? 'bg-gray-800 px-1 py-0.5 rounded' : 'block bg-gray-900 p-3 rounded-lg overflow-x-auto'}`} {...props}>{children}</code>
                            }}>
                              {msg.content || (isStreaming && idx === messages.length - 1 ? '▌' : '')}
                            </ReactMarkdown>
                            {isStreaming && idx === messages.length - 1 && msg.content && <span className="inline-block w-1 h-3 bg-blue-400 ml-0.5 animate-pulse"></span>}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}{msg.edited && <span className="ml-2 text-xs text-gray-400">(edited)</span>}</p>
                        )}
                      </div>

                      <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isUser && (
                          <>
                            <button onClick={() => startEditMessage(msg.id, msg.content)} className="text-[10px] text-gray-500 hover:text-blue-400 transition flex items-center gap-0.5"><Edit2 size={10} /> Edit</button>
                            <button onClick={() => onForkMessage?.(msg.id, msg.content)} className="text-[10px] text-gray-500 hover:text-purple-400 transition flex items-center gap-0.5">🔀 Fork</button>
                            <button onClick={() => deleteMessageAndAfter(msg.id)} className="text-[10px] text-gray-500 hover:text-red-400 transition flex items-center gap-0.5"><Trash2 size={10} /> Delete</button>
                          </>
                        )}
                        {msg.role === 'assistant' && !isStreaming && msg.content && (
                          <>
                            <button onClick={() => copyToClipboard(msg.content, idx)} className="text-[10px] text-gray-500 hover:text-blue-400 transition flex items-center gap-0.5">{copiedIndex === idx ? <Check size={10} /> : <Copy size={10} />}{copiedIndex === idx ? 'Copied' : 'Copy'}</button>
                            {msg.content.length > 100 && <button onClick={() => { const filename = `generated-${Date.now()}.txt`; saveToResources(msg.content, filename); }} className="text-[10px] text-gray-500 hover:text-blue-400 transition flex items-center gap-0.5"><FileText size={10} /> Save</button>}
                            <div className="flex gap-1">
                              <button onClick={() => setReactions(prev => ({ ...prev, [msg.id]: '👍' }))} className={`text-[10px] ${reactions[msg.id] === '👍' ? 'text-green-400' : 'text-gray-500'}`}>👍</button>
                              <button onClick={() => setReactions(prev => ({ ...prev, [msg.id]: '👎' }))} className={`text-[10px] ${reactions[msg.id] === '👎' ? 'text-red-400' : 'text-gray-500'}`}>👎</button>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {isAiTyping && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-800/50 rounded-2xl px-4 py-2 text-sm text-gray-400">
                <span className="animate-pulse">●</span> AI is thinking
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Active documents preview */}
      {contextDocuments.length > 0 && (
        <div className="border-t border-gray-800 px-4 py-2 bg-gray-900/50">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-400">Active documents:</span>
              {contextDocuments.map(doc => (
                <div key={doc.id} className="bg-gray-800 rounded-lg px-2 py-1 flex items-center gap-1 text-xs border border-gray-700">
                  <FileText size={12} className="text-blue-400" />
                  <span className="truncate max-w-[120px]">{doc.name}</span>
                  <button onClick={() => removeContextDocument(doc.id)} className="text-gray-400 hover:text-red-400"><X size={10} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Temporary image preview */}
      {attachedImages.length > 0 && (
        <div className="border-t border-gray-800 px-4 py-2 bg-gray-900/50">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap gap-2">
              {attachedImages.map(img => (
                <div key={img.id} className="relative group">
                  <img src={img.data} alt={img.name} className="h-12 w-12 object-cover rounded-lg border border-gray-700" />
                  <button onClick={() => removeImage(img.id)} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X size={10} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-800 bg-gradient-to-t from-gray-900 to-gray-900/95 p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <textarea ref={textareaRef} rows="1" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={contextDocuments.length > 0 ? `Ask about your ${contextDocuments.length} document(s)...` : attachedImages.length > 0 ? "Ask about your image(s)..." : "Message Pickmo.ai... (Hover to edit/delete/fork)"} disabled={isStreaming} className="w-full bg-gray-800/50 rounded-2xl px-4 py-3 pr-24 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none text-sm text-white placeholder-gray-400 border border-gray-700 focus:border-transparent transition-all duration-200" style={{ maxHeight: '120px' }} />
            <div className="absolute right-2 bottom-3 flex gap-1">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isStreaming || uploadingFiles} className="p-1.5 text-gray-400 hover:text-blue-400 transition disabled:opacity-50 rounded-lg hover:bg-gray-700/50">{uploadingFiles ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}</button>
              <button type="button" onClick={startListening} disabled={isStreaming} className={`p-1.5 rounded-lg transition ${isListening ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-blue-400'}`}><Mic size={16} /></button>
              <button type="submit" disabled={isStreaming || (!input.trim() && attachedImages.length === 0)} className="p-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200">{isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
            </div>
            <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.pdf,.doc,.docx,image/*" onChange={handleFileUpload} className="hidden" disabled={isStreaming} />
          </form>
          <div className="flex justify-between items-center mt-2 text-[10px] text-gray-500 px-1">
            <div className="flex items-center gap-2"><span>Press <kbd className="px-1 py-0.5 bg-gray-800 rounded text-xs">Enter</kbd> to send</span><span className="text-gray-600">•</span><span><kbd className="px-1 py-0.5 bg-gray-800 rounded text-xs">Shift+Enter</kbd> for new line</span></div>
            <div className="flex items-center gap-1"><span>⚠️</span><span>Privacy: sensitive info redacted</span></div>
          </div>
          <div className="text-[10px] text-gray-500 text-center mt-1">📎 Upload documents – they stay active for the whole conversation. Use 'Clear all' to remove.</div>
        </div>
      </div>
    </div>
  );
}

function SuggestionChip({ onClick, icon, text }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-800 rounded-lg text-xs transition-all duration-200 border border-gray-700 hover:border-gray-600 group">
      <span className="mr-1">{icon}</span>
      <span className="text-gray-300 group-hover:text-white transition">{text}</span>
    </button>
  );
}
