import { Cpu, ChevronDown, Info, Zap, Globe, Code2, Brain, BookOpen } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const AGENT_CONFIG = {
  WebSearchAgent:  { label: 'Web Search',  icon: Globe,    color: 'text-emerald-400' },
  RAGAgent:        { label: 'Doc Analysis', icon: BookOpen,  color: 'text-violet-400' },
  CodeAgent:       { label: 'Code Expert', icon: Code2,    color: 'text-cyan-400'    },
  GeneralAgent:    { label: 'Assistant',   icon: Brain,    color: 'text-blue-400'    },
};

export default function ModelSelector({ models, selected, onChange, activeAgent }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredModel, setHoveredModel] = useState(null);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const selectedModel = models.find(m => m.id === selected);
  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groqModels = filteredModels.filter(m => m.provider === 'groq');
  const orModels = filteredModels.filter(m => m.provider !== 'groq');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (modelId) => { onChange(modelId); setIsOpen(false); setSearchTerm(''); };

  const formatContext = (context) => {
    if (!context) return '?';
    if (context >= 1000000) return `${(context / 1000000).toFixed(1)}M`;
    if (context >= 1000) return `${Math.round(context / 1000)}K`;
    return context;
  };

  const agentInfo = activeAgent ? AGENT_CONFIG[activeAgent] : null;
  const AgentIcon = agentInfo?.icon;

  return (
    <div className="border-b border-white/8 bg-pickmo-surface/30 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between gap-3">
      {/* Model Selector */}
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200 group"
        >
          <Cpu size={12} className="text-violet-400" />
          <span className="text-xs font-medium text-pickmo-text max-w-[140px] truncate">
            {selectedModel?.name || 'Select model'}
          </span>
          <ChevronDown size={11} className={`text-pickmo-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-2 w-80 bg-pickmo-surface border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Search */}
            <div className="p-2.5 border-b border-white/8">
              <input
                type="text"
                placeholder="Search models…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-pickmo-text placeholder-pickmo-muted focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                autoFocus
              />
            </div>

            <div className="max-h-72 overflow-y-auto custom-scrollbar">
              {/* Groq group */}
              {groqModels.length > 0 && (
                <ModelGroup label="Groq · Fast inference" models={groqModels} selected={selected}
                  hoveredModel={hoveredModel} setHoveredModel={setHoveredModel}
                  handleSelect={handleSelect} formatContext={formatContext} />
              )}
              {/* OpenRouter group */}
              {orModels.length > 0 && (
                <ModelGroup label="OpenRouter · Extended" models={orModels} selected={selected}
                  hoveredModel={hoveredModel} setHoveredModel={setHoveredModel}
                  handleSelect={handleSelect} formatContext={formatContext} />
              )}
              {filteredModels.length === 0 && (
                <div className="px-4 py-6 text-center text-pickmo-muted text-xs">No models found</div>
              )}
            </div>

            <div className="px-3 py-2 border-t border-white/8 flex items-center justify-between">
              <span className="text-[10px] text-pickmo-muted">{models.length} free models</span>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>All free</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right side: Agent badge + model count */}
      <div className="flex items-center gap-2">
        {agentInfo && (
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-medium bg-white/5 border-white/10 ${agentInfo.color}`}>
            <AgentIcon size={10} />
            <span>{agentInfo.label}</span>
          </div>
        )}
        <span className="text-[10px] text-pickmo-muted bg-white/5 px-2 py-1 rounded-lg border border-white/8 hidden sm:block">
          {models.length} models
        </span>
      </div>
    </div>
  );
}

function ModelGroup({ label, models, selected, hoveredModel, setHoveredModel, handleSelect, formatContext }) {
  return (
    <div>
      <p className="text-[9px] text-pickmo-muted uppercase tracking-widest font-semibold px-3 pt-2.5 pb-1">
        {label}
      </p>
      {models.map(model => (
        <button
          key={model.id}
          onClick={() => handleSelect(model.id)}
          onMouseEnter={() => setHoveredModel(model.id)}
          onMouseLeave={() => setHoveredModel(null)}
          className={`w-full text-left px-3 py-2 text-xs transition-colors relative ${
            selected === model.id
              ? 'bg-violet-600/20 text-violet-300 border-l-2 border-violet-500'
              : 'text-pickmo-muted hover:bg-white/5 hover:text-pickmo-text border-l-2 border-transparent'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium truncate max-w-[200px]">{model.name}</span>
            <span className="text-[9px] text-pickmo-muted font-mono ml-2 flex-shrink-0">
              {formatContext(model.context)}
            </span>
          </div>

          {/* Hover tooltip */}
          {hoveredModel === model.id && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50">
              <div className="bg-pickmo-surface border border-white/10 rounded-xl shadow-2xl p-3 w-48 text-[10px] space-y-1">
                <div className="flex items-center gap-1 text-pickmo-muted mb-1.5">
                  <Info size={8} />
                  <span className="font-semibold">Model Details</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pickmo-muted">Provider</span>
                  <span className="text-pickmo-text capitalize">{model.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pickmo-muted">Context</span>
                  <span className="text-pickmo-text">{formatContext(model.context)} tokens</span>
                </div>
                {model.type === 'vision' && (
                  <div className="text-emerald-400 pt-1">✓ Vision (images)</div>
                )}
                <div className="text-violet-400 pt-1">✓ Free to use</div>
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
