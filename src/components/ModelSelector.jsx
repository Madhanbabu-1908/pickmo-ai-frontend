import { Cpu, ChevronDown, Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function ModelSelector({ models, selected, onChange }) {
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

  const handleSelect = (modelId) => {
    onChange(modelId);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Format context size for display
  const formatContext = (context) => {
    if (!context) return 'Unknown';
    if (context >= 1000000) return `${(context / 1000000).toFixed(1)}M`;
    if (context >= 1000) return `${(context / 1000).toFixed(0)}K`;
    return context;
  };

  return (
    <div className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-gray-600 transition-all duration-200 group"
            >
              <Cpu size={14} className="text-blue-400" />
              <span className="text-sm font-medium text-gray-200">
                {selectedModel?.name || 'Select model'}
              </span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 mt-2 w-96 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl z-50 overflow-hidden animate-fadeIn"
              >
                {/* Search Bar */}
                <div className="p-3 border-b border-gray-700">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search models..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-gray-600"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Model List */}
                <div className="max-h-80 overflow-y-auto">
                  {filteredModels.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 text-sm">No models found</div>
                  ) : (
                    filteredModels.map(model => (
                      <button
                        key={model.id}
                        onClick={() => handleSelect(model.id)}
                        onMouseEnter={() => setHoveredModel(model.id)}
                        onMouseLeave={() => setHoveredModel(null)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 relative ${
                          selected === model.id
                            ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500'
                            : 'text-gray-300 hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{model.name}</span>
                          <span className="text-xs text-gray-500 font-mono">{model.id.split('/').pop()}</span>
                        </div>
                        {hoveredModel === model.id && (
                          <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 z-50">
                            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-2 w-48 text-xs">
                              <div className="flex items-center gap-1 text-gray-400 mb-1">
                                <Info size={10} />
                                <span className="font-semibold">Model Info</span>
                              </div>
                              <div><span className="text-gray-500">Provider:</span> {model.provider || 'unknown'}</div>
                              <div><span className="text-gray-500">Context:</span> {formatContext(model.context)} tokens</div>
                              {model.type === 'vision' && (
                                <div className="text-green-400 mt-1">✅ Supports images</div>
                              )}
                              {model.free !== false && (
                                <div className="text-blue-400 mt-1">💰 Free</div>
                              )}
                            </div>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="p-2 border-t border-gray-700 text-center">
                  <span className="text-xs text-gray-500">{models.length} models available</span>
                </div>
              </div>
            )}
          </div>

          {/* Model count badge */}
          <div className="text-xs text-gray-500 bg-gray-800/30 px-2 py-1 rounded-full">
            {models.length} models
          </div>
        </div>
      </div>
    </div>
  );
}
