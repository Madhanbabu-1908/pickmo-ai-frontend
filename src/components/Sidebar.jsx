import {
  PlusCircle, MessageSquare, FolderOpen, HelpCircle, Lightbulb, Download,
  Menu, X, ChevronLeft, ChevronRight, Sparkles, Trash2, FileText,
  Share2, Search, Sun, Moon, ChevronDown, Zap
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

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.messages.some(msg =>
      typeof msg.content === 'string' && msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const menuItems = [
    { icon: FolderOpen,  label: 'Resources',      action: onSelectResources },
    { icon: HelpCircle,  label: 'Help & Support',  action: onSelectHelp },
    { icon: Lightbulb,   label: 'Suggestions',     action: onSelectSuggestion },
    { icon: Download,    label: 'Download App',    action: onSelectDownload },
    { icon: FileText,    label: 'Export Chat',     action: onExportChat },
    { icon: Share2,      label: 'Share Chat',      action: onShareChat },
    { icon: Trash2,      label: 'Clear All Chats', action: onClearHistory, danger: true },
  ];

  const SidebarContent = () => (
    <div className={`h-full flex flex-col bg-pickmo-sidebar border-r border-white/8 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-72'}`}>

      {/* Brand */}
      <div className={`p-4 border-b border-white/8 ${isCollapsed ? 'px-3' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-glow-violet flex-shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gradient leading-tight">Pickmo.ai</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10px] text-pickmo-muted">Free AI · Multi-model</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle (desktop) */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 bg-pickmo-surface border border-white/10 rounded-full p-1 hover:bg-white/10 transition-all duration-200 hidden md:block z-10 shadow-lg"
      >
        {isCollapsed
          ? <ChevronRight size={11} className="text-pickmo-muted" />
          : <ChevronLeft size={11} className="text-pickmo-muted" />}
      </button>

      {/* New Chat Button */}
      <div className={`px-3 mt-4 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={() => { onNewChat(); setIsMobileOpen(false); }}
          className={`flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all shadow-glow-violet font-medium ${
            isCollapsed ? 'p-2.5' : 'px-4 py-2.5 w-full justify-center'
          }`}
        >
          <PlusCircle size={15} />
          {!isCollapsed && <span className="text-sm">New Chat</span>}
        </button>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="px-3 mt-3">
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pickmo-muted" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-3 py-2 text-xs text-pickmo-text placeholder-pickmo-muted focus:outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
            />
          </div>
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 custom-scrollbar">
        {!isCollapsed && (
          <p className="text-[9px] font-semibold text-pickmo-muted uppercase tracking-widest mb-2 px-2">
            Recent
          </p>
        )}
        {filteredChats.length === 0 && !isCollapsed && (
          <p className="text-[10px] text-pickmo-muted text-center py-6">No conversations found</p>
        )}
        {filteredChats.map(chat => (
          <div
            key={chat.id}
            onClick={() => { onSelectChat(chat.id); setIsMobileOpen(false); }}
            className={`group relative px-2.5 py-2 rounded-xl cursor-pointer transition-all duration-150 ${
              activeChatId === chat.id
                ? 'bg-violet-600/20 border border-violet-500/30'
                : 'hover:bg-white/5 border border-transparent'
            } ${isCollapsed ? 'flex justify-center' : ''}`}
          >
            <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
              <MessageSquare size={12} className={`flex-shrink-0 ${activeChatId === chat.id ? 'text-violet-400' : 'text-pickmo-muted'}`} />
              {!isCollapsed && (
                <span className={`text-xs truncate leading-tight ${activeChatId === chat.id ? 'text-pickmo-text font-medium' : 'text-pickmo-muted'}`}>
                  {chat.title}
                </span>
              )}
            </div>
            {/* Tooltip for collapsed */}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-pickmo-surface border border-white/10 rounded-lg text-[11px] text-pickmo-text whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                {chat.title}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Controls */}
      <div className="border-t border-white/8 pt-2 pb-3 px-2 space-y-0.5">
        {/* Theme */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl transition-all text-pickmo-muted hover:text-pickmo-text hover:bg-white/5 ${isCollapsed ? 'justify-center' : ''}`}
        >
          {theme === 'dark'
            ? <Sun size={13} className="text-amber-400" />
            : <Moon size={13} className="text-blue-400" />}
          {!isCollapsed && <span className="text-xs">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        {/* More Options */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl transition-all text-pickmo-muted hover:text-pickmo-text hover:bg-white/5 ${isCollapsed ? 'justify-center' : ''}`}
          >
            <Menu size={13} />
            {!isCollapsed && (
              <>
                <span className="text-xs flex-1 text-left">More</span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

          {isMenuOpen && !isCollapsed && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute bottom-full left-0 mb-1 w-48 bg-pickmo-surface border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                {menuItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => { item.action(); setIsMenuOpen(false); }}
                    className={`flex items-center gap-2.5 w-full px-3.5 py-2 text-xs transition-colors ${
                      item.danger
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-pickmo-muted hover:text-pickmo-text hover:bg-white/5'
                    }`}
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
      {/* Mobile Hamburger */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 bg-pickmo-surface border border-white/10 backdrop-blur-xl p-2 rounded-xl shadow-xl md:hidden"
      >
        {isMobileOpen
          ? <X size={17} className="text-pickmo-text" />
          : <Menu size={17} className="text-pickmo-text" />}
      </button>

      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full relative z-30">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileOpen(false)} />
          <div className="fixed top-0 left-0 h-full w-68 z-50 md:hidden animate-slide-in">
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}
