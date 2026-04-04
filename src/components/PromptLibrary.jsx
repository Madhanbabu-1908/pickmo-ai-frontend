import { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2 } from 'lucide-react';

export default function PromptLibrary({ onInsertPrompt }) {
  const [prompts, setPrompts] = useState(() => {
    const saved = localStorage.getItem('promptLibrary');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptText, setNewPromptText] = useState('');

  useEffect(() => {
    localStorage.setItem('promptLibrary', JSON.stringify(prompts));
  }, [prompts]);

  const addPrompt = () => {
    if (newPromptName.trim() && newPromptText.trim()) {
      setPrompts([...prompts, { id: Date.now(), name: newPromptName, text: newPromptText }]);
      setNewPromptName('');
      setNewPromptText('');
      setShowAdd(false);
    }
  };

  const deletePrompt = (id) => {
    setPrompts(prompts.filter(p => p.id !== id));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowAdd(!showAdd)}
        className="p-1 text-gray-400 hover:text-blue-400 transition"
        title="Prompt Library"
      >
        <BookOpen size={16} />
      </button>
      {showAdd && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-gray-800 rounded-xl p-3 shadow-xl border border-gray-700 z-50">
          <input
            type="text"
            placeholder="Name (e.g., Summarize)"
            value={newPromptName}
            onChange={(e) => setNewPromptName(e.target.value)}
            className="w-full bg-gray-700 rounded px-2 py-1 text-sm mb-2 text-white"
          />
          <textarea
            placeholder="Prompt text"
            value={newPromptText}
            onChange={(e) => setNewPromptText(e.target.value)}
            rows="2"
            className="w-full bg-gray-700 rounded px-2 py-1 text-sm mb-2 text-white"
          />
          <button onClick={addPrompt} className="bg-blue-600 text-xs px-2 py-1 rounded">Save</button>
        </div>
      )}
      <div className="flex flex-wrap gap-1 mt-1">
        {prompts.map(p => (
          <button
            key={p.id}
            onClick={() => onInsertPrompt(p.text)}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-0.5 rounded flex items-center gap-1 text-white"
          >
            {p.name}
            <Trash2 size={10} onClick={(e) => { e.stopPropagation(); deletePrompt(p.id); }} className="text-red-400" />
          </button>
        ))}
      </div>
    </div>
  );
}
