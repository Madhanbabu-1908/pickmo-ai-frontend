import { 
  PlusCircle, MessageSquare, FolderOpen, HelpCircle, Lightbulb, Download,
  Menu, X, ChevronLeft, ChevronRight, Sparkles, Trash2, FileText, Share2, Search, Sun, Moon, ChevronDown
} from 'lucide-react';
import { useState } from 'react';

export default function Sidebar({ 
  chats, activeChatId, onSelectChat, onNewChat, onSelectResources, onSelectHelp,
  onSelectSuggestion, onSelectDownload, onClearHistory, onExportChat, onShareChat,
  isCollapsed, onToggleCollapse, theme, setTheme
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.messages.some(msg => msg.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const menuItems = [
    { icon: FolderOpen, label: "Resources", action: onSelectResources },
    { icon: HelpCircle, label: "Help & Support", action: onSelectHelp },
    { icon: Lightbulb, label: "Suggestions", action: onSelectSuggestion },
    { icon: Download, label: "Download App", action: onSelectDownload },
    { icon: FileText, label: "Export Chat", action: onExportChat },
    { icon: Share2, label: "Share Chat", action: onShareChat },
    { icon: Trash2, label: "Clear All Chats", action: onClearHistory, danger: true },
  ];

  const SidebarContent = () => (
    <div className={`h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-72'}`}>
      {/* Brand Header */}
      <div className={`p-4 border-b border-gray-200 dark:border-gray-800 ${isCollapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkles size={16} className="text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Pickmo.ai
              </h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-500">Free AI Chatbot</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button 
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hidden md:block z-10"
      >
        {isCollapsed ? <ChevronRight size={12} className="text-gray-600 dark:text-gray-400" /> : <ChevronLeft size={12} className="text-gray-600 dark:text-gray-400" />}
      </button>

      {/* New Chat Button */}
      <button 
        onClick={() => { onNewChat(); setIsMobileOpen(false); }} 
        className={`mx-2 mt-4 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-2 rounded-xl transition-all duration-200 shadow-lg ${isCollapsed ? 'justify-center' : 'w-auto'}`}
      >
        <PlusCircle size={16} />
        {!isCollapsed && <span className="text-sm font-medium">New Chat</span>}
      </button>

      {/* Search Bar */}
      {!isCollapsed && (
        <div className="px-2 mt-3">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-lg pl-7 pr-2 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {!isCollapsed && (
          <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            Recent Chats
          </div>
        )}
        {filteredChats.length === 0 ? (
          <div className={`text-[10px] text-gray-400 dark:text-gray-500 text-center py-4 ${isCollapsed ? 'hidden' : ''}`}>
            No conversations found
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredChats.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => { onSelectChat(chat.id); setIsMobileOpen(false); }} 
                className={`group relative px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
                  activeChatId === chat.id 
                    ? 'bg-blue-50 dark:bg-blue-600/20 border-l-2 border-blue-500' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                } ${isCollapsed ? 'flex justify-center' : ''}`}
              >
                <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
                  <MessageSquare size={12} className={`flex-shrink-0 ${activeChatId === chat.id ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  {!isCollapsed && (
                    <span className="text-xs truncate font-medium text-gray-700 dark:text-gray-300">{chat.title}</span>
                  )}
                </div>
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg border border-gray-200 dark:border-gray-700">
                    {chat.title}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Menu */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-2 pb-3 px-2">
        {/* Theme Toggle */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg transition-all duration-200 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 ${isCollapsed ? 'justify-center' : ''}`}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {!isCollapsed && <span className="text-xs">Theme</span>}
        </button>

        {/* More Options Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg transition-all duration-200 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 ${isCollapsed ? 'justify-center' : ''}`}
          >
            <Menu size={14} />
            {!isCollapsed && <span className="text-xs flex-1 text-left">More Options</span>}
            {!isCollapsed && <ChevronDown size={12} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />}
          </button>
          
          {isMenuOpen && !isCollapsed && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute bottom-full left-0 mb-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                {menuItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      item.action();
                      setIsMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${item.danger ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    <item.icon size={12} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={toggleMobile}
        className="fixed top-3 left-3 z-50 bg-white dark:bg-gray-800/80 backdrop-blur-xl p-2 rounded-xl shadow-lg md:hidden border border-gray-200 dark:border-gray-700"
      >
        {isMobileOpen ? <X size={18} className="text-gray-700 dark:text-gray-300" /> : <Menu size={18} className="text-gray-700 dark:text-gray-300" />}
      </button>

      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full relative z-30">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={toggleMobile} />
          <div className="fixed top-0 left-0 h-full w-64 z-50 md:hidden animate-slide-in">
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}
