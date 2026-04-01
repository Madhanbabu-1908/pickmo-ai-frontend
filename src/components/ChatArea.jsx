import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Paperclip, X, FileText, Sparkles, Copy, Check, Bot, User, BookOpen, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { maskPersonalInfo } from './privacy';

export default function ChatArea({ messages, onSendStream, chatId, updateChatMessages, apiUrl, useRAG, setUseRAG }) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]); // text files for RAG
  const [attachedImages, setAttachedImages] = useState([]); // images for vision
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const editTextareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Handle file upload: text files go to RAG, images go to attachedImages
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadingFiles(true);
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        // Image: read as base64 and store in attachedImages
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
        // Text file: read as text and upload to RAG
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target.result;
          try {
            await axios.post(`${apiUrl}/rag/upload`, {
              text: content,
              name: file.name
            });
            setAttachedFiles(prev => [...prev, {
              id: Date.now(),
              name: file.name,
              size: file.size,
              content: content.substring(0, 500)
            }]);
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

  const removeAttachment = (fileId) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
    if (attachedFiles.length === 1) setUseRAG(false);
  };

  const removeImage = (id) => {
    setAttachedImages(prev => prev.filter(img => img.id !== id));
  };

  // Edit message functions (unchanged)
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
    updateChatMessages(chatId, (prev) => [...prev, { role: 'assistant', content: '', id: Date.now() + 1 }]);
    let fullContent = '';
    await onSendStream(editingContent, 
      (chunk) => {
        fullContent += chunk;
        updateChatMessages(chatId, (prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { 
            role: 'assistant', 
            content: fullContent,
            id: newMessages[newMessages.length - 1].id 
          };
          return newMessages;
        });
      },
      (error) => {
        console.error(error);
        updateChatMessages(chatId, (prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { 
            role: 'assistant', 
            content: 'I apologize, but I encountered an error. Please try again.',
            id: newMessages[newMessages.length - 1].id 
          };
          return newMessages;
        });
      }
    );
    setIsStreaming(false);
  };

  const deleteMessageAndAfter = (messageId) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    const updatedMessages = messages.slice(0, messageIndex);
    updateChatMessages(chatId, () => updatedMessages);
  };

  // Main submit handler: builds multimodal content array if images are present
  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0 && attachedImages.length === 0) || isStreaming) return;
    
    const userMsg = input;
    const sanitizedUserMsg = maskPersonalInfo(userMsg);
    setInput('');
    
    // Build content array for multimodal message
    const contentArray = [];
    if (sanitizedUserMsg.trim()) contentArray.push({ type: 'text', text: sanitizedUserMsg });
    for (const img of attachedImages) {
      contentArray.push({ type: 'image_url', image_url: { url: img.data } });
    }
    
    // If there are RAG text files, we need to incorporate them – but the API expects either plain text or an array.
    // We'll handle two cases:
    // 1. No images: send plain text with RAG context (if any)
    // 2. With images: send the content array; if RAG context exists, we add it as an extra text part.
    let finalUserContent;
    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles.map(f => 
        `[Attached Document: ${f.name}]\nContent Preview: ${f.content}\n`
      ).join('\n');
      const ragText = `${fileContext}\n\n${sanitizedUserMsg || 'Please analyze these documents.'}`;
      if (attachedImages.length > 0) {
        // Prepend RAG context as a text part
        contentArray.unshift({ type: 'text', text: ragText });
        finalUserContent = contentArray;
      } else {
        finalUserContent = ragText;
      }
      if (!useRAG) setUseRAG(true);
    } else {
      finalUserContent = contentArray.length === 1 && contentArray[0].type === 'text'
        ? contentArray[0].text
        : contentArray;
    }
    
    setIsStreaming(true);
    
    // Display message in UI (simple representation)
    const displayText = userMsg || (attachedImages.length ? `📷 Image(s) attached` : '');
    const newUserMessage = { 
      id: Date.now(),
      role: 'user', 
      content: displayText 
    };
    updateChatMessages(chatId, (prev) => [...prev, newUserMessage]);
    updateChatMessages(chatId, (prev) => [...prev, { role: 'assistant', content: '', id: Date.now() + 1 }]);
    
    let fullContent = '';
    await onSendStream(finalUserContent, 
      (chunk) => {
        fullContent += chunk;
        updateChatMessages(chatId, (prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { 
            role: 'assistant', 
            content: fullContent,
            id: newMessages[newMessages.length - 1].id 
          };
          return newMessages;
        });
      },
      (error) => {
        console.error(error);
        updateChatMessages(chatId, (prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { 
            role: 'assistant', 
            content: 'I apologize, but I encountered an error. Please try again.',
            id: newMessages[newMessages.length - 1].id 
          };
          return newMessages;
        });
      }
    );
    
    setAttachedFiles([]);
    setAttachedImages([]);
    setIsStreaming(false);
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
    savedDocs.push({
      id: Date.now(),
      name: filename,
      content: content,
      date: new Date().toISOString(),
      type: 'generated'
    });
    localStorage.setItem('generatedDocuments', JSON.stringify(savedDocs));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* RAG Status Indicator */}
      {useRAG && (
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-blue-500/30 px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <BookOpen size={14} className="text-blue-400" />
              <span className="text-blue-300">Document context active</span>
              <span className="text-xs text-gray-400">- {attachedFiles.length} file(s) attached</span>
            </div>
            <button
              onClick={() => {
                setUseRAG(false);
                setAttachedFiles([]);
              }}
              className="text-xs text-gray-400 hover:text-white transition px-2 py-0.5 rounded hover:bg-gray-700/50"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-r from-blue-500/20 to-purple-600/20 mb-8">
                <Sparkles size={40} className="text-blue-400" />
              </div>
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Pickmo.ai
              </h1>
              <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                Your intelligent AI assistant. Upload documents or images, or start a conversation.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <SuggestionChip onClick={() => setInput("What can you help me with?")} icon="💬" text="What can you help me with?" />
                <SuggestionChip onClick={() => setInput("Write a short story")} icon="📖" text="Write a story" />
                <SuggestionChip onClick={() => setInput("Explain quantum computing")} icon="🔬" text="Explain quantum computing" />
                <SuggestionChip onClick={() => setInput("Create a business plan")} icon="💼" text="Business plan" />
              </div>
              
              {/* Document Upload Prompt */}
              <div className="mt-12 p-4 bg-gray-800/30 rounded-2xl border border-gray-700/50 max-w-md mx-auto">
                <div className="flex items-center gap-3">
                  <Paperclip size={20} className="text-blue-400" />
                  <p className="text-sm text-gray-300">
                    Upload a document or image and I'll analyze it!
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {messages.map((msg, idx) => {
            const isUserMessage = msg.role === 'user';
            const isEditing = editingMessageId === msg.id;
            
            return (
              <div 
                key={msg.id || idx} 
                className={`flex gap-4 mb-6 animate-fadeIn ${isUserMessage ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isUserMessage 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 order-2' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-600'
                }`}>
                  {isUserMessage ? <User size={14} /> : <Bot size={14} />}
                </div>
                
                <div className={`flex-1 max-w-[85%] ${isUserMessage ? 'order-1' : ''}`}>
                  {isEditing ? (
                    // Edit Mode
                    <div className="bg-gray-800 rounded-2xl p-3 border border-blue-500/50">
                      <textarea
                        ref={editTextareaRef}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        className="w-full bg-gray-900 rounded-xl p-3 text-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows={3}
                        placeholder="Edit your message..."
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 text-xs text-gray-400 hover:text-white transition rounded-lg hover:bg-gray-700"
                        >
                          <XCircle size={14} className="inline mr-1" />
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEditAndResend(msg.id, editingContent)}
                          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                        >
                          <CheckCircle size={14} className="inline mr-1" />
                          Send & Get New Response
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`rounded-2xl px-5 py-3 ${
                        isUserMessage 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                          : 'bg-gray-800/50 text-gray-100 border border-gray-700/50'
                      }`}>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-invert prose-sm max-w-none overflow-x-auto">
                            <ReactMarkdown>{msg.content || (isStreaming && idx === messages.length - 1 ? '▌' : '')}</ReactMarkdown>
                            {isStreaming && idx === messages.length - 1 && msg.content && (
                              <span className="inline-block w-1.5 h-4 bg-blue-400 ml-1 animate-pulse"></span>
                            )}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words leading-relaxed">
                            {msg.content}
                            {msg.edited && (
                              <span className="ml-2 text-xs text-gray-400">(edited)</span>
                            )}
                          </p>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isUserMessage && (
                          <>
                            <button
                              onClick={() => startEditMessage(msg.id, msg.content)}
                              className="text-xs text-gray-500 hover:text-blue-400 transition flex items-center gap-1"
                              title="Edit this message"
                            >
                              <Edit2 size={12} />
                              Edit
                            </button>
                            <button
                              onClick={() => deleteMessageAndAfter(msg.id)}
                              className="text-xs text-gray-500 hover:text-red-400 transition flex items-center gap-1"
                              title="Delete this message and all responses"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </>
                        )}
                        {msg.role === 'assistant' && !isStreaming && msg.content && (
                          <>
                            <button
                              onClick={() => copyToClipboard(msg.content, idx)}
                              className="text-xs text-gray-500 hover:text-blue-400 transition flex items-center gap-1"
                            >
                              {copiedIndex === idx ? <Check size={12} /> : <Copy size={12} />}
                              {copiedIndex === idx ? 'Copied' : 'Copy'}
                            </button>
                            {msg.content.length > 100 && (
                              <button
                                onClick={() => {
                                  const filename = `generated-${Date.now()}.txt`;
                                  saveToResources(msg.content, filename);
                                }}
                                className="text-xs text-gray-500 hover:text-blue-400 transition flex items-center gap-1"
                              >
                                <FileText size={12} /> Save
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Attachments Preview: Text Files */}
      {attachedFiles.length > 0 && (
        <div className="border-t border-gray-800 px-4 py-2 bg-gray-900/50">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map(file => (
                <div key={file.id} className="bg-gray-800 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm border border-gray-700">
                  <FileText size={14} className="text-blue-400" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(file.id)}
                    className="text-gray-400 hover:text-red-400 transition"
                  >
            <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {attachedImages.length > 0 && (
        <div className="border-t border-gray-800 px-4 py-2 bg-gray-900/50">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap gap-2">
              {attachedImages.map(img => (
                <div key={img.id} className="relative group">
                  <img src={img.data} alt={img.name} className="h-16 w-16 object-cover rounded-lg border border-gray-700" />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-800 bg-gradient-to-t from-gray-900 to-gray-900/95 p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              ref={textareaRef}
              rows="1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={attachedFiles.length > 0 ? "Ask about your uploaded document..." : (attachedImages.length > 0 ? "Ask about your image(s)..." : "Message Pickmo.ai... (Hover over your messages to Edit or Delete, attach images for vision models)")}
              disabled={isStreaming}
              className="w-full bg-gray-800/50 rounded-2xl px-5 py-4 pr-24 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none text-white placeholder-gray-400 border border-gray-700 focus:border-transparent transition-all duration-200"
              style={{ maxHeight: '120px' }}
            />
            <div className="absolute right-2 bottom-3 flex gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || uploadingFiles}
                className="p-2 text-gray-400 hover:text-blue-400 transition disabled:opacity-50 rounded-lg hover:bg-gray-700/50"
                title="Attach document or image"
              >
                {uploadingFiles ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
              </button>
              <button 
                type="submit" 
                disabled={isStreaming || (!input.trim() && attachedFiles.length === 0 && attachedImages.length === 0)}
                className="p-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200"
              >
                {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.pdf,.doc,.docx,image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isStreaming}
            />
          </form>
          <div className="flex justify-between items-center mt-3 text-xs text-gray-500 px-1">
            <div className="flex items-center gap-2">
              <span>Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">Enter</kbd> to send</span>
              <span className="text-gray-600">•</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">Shift+Enter</kbd> for new line</span>
            </div>
            <div className="flex items-center gap-2 text-yellow-500">
              <span>⚠️</span>
              <span>For privacy, don't share sensitive info. Your chat stays on this device.</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 text-center mt-1">
            📎 Upload .txt, .md, or images for vision models (Gemini 2.0 Flash, etc.)
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionChip({ onClick, icon, text }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-gray-800/50 hover:bg-gray-800 rounded-xl text-sm transition-all duration-200 border border-gray-700 hover:border-gray-600 group"
    >
      <span className="mr-2">{icon}</span>
      <span className="text-gray-300 group-hover:text-white transition">{text}</span>
    </button>
  );
}
