import { useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';

export default function Resources({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api';

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('document', file);

    try {
      const res = await fetch(`${API_URL}/upload`, { 
        method: 'POST', 
        body: formData 
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      const newDoc = { 
        id: data.documentId || Date.now().toString(), 
        name: file.name, 
        size: file.size 
      };
      
      setUploadedFiles(prev => [...prev, newDoc]);
      onUploadSuccess?.(newDoc);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload document. Please check backend connection.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (id) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-3xl mx-auto w-full">
      {/* PRESERVED: Your exact header styling */}
      <h2 className="text-xl font-bold mb-1">Documents & Resources</h2>
      <p className="text-sm text-pickmo-muted mb-6">
        Upload PDFs or text files to enable RAG-powered answers in chat.
      </p>

      {/* REPLACED: Static placeholder → Functional upload zone (same container classes) */}
      <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-violet-500/50 transition-colors cursor-pointer group">
        <input 
          type="file" 
          accept=".pdf,.txt,.md" 
          className="hidden" 
          id="doc-upload" 
          onChange={handleFileUpload} 
        />
        <label htmlFor="doc-upload" className="cursor-pointer block">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-violet-500/10 transition-colors">
            {uploading ? (
              <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-pickmo-muted group-hover:text-violet-400 transition-colors" />
            )}
          </div>
          <p className="text-sm font-medium text-pickmo-text mb-1">
            {uploading ? 'Uploading...' : 'Click or drag to upload documents'}
          </p>
          <p className="text-xs text-pickmo-muted">PDF, TXT, MD up to 10MB</p>
        </label>
      </div>

      {/* ADDED: Uploaded files list (uses your existing card/badge styling patterns) */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-pickmo-muted">Uploaded Documents</h3>
          {uploadedFiles.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-3 bg-pickmo-surface border border-white/5 rounded-xl group/file">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-[10px] text-pickmo-muted">Ready for RAG context</p>
              </div>
              <button
                onClick={() => removeFile(file.id)}
                className="p-1.5 rounded-lg text-pickmo-muted hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover/file:opacity-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
