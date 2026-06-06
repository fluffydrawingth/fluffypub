import React, { useRef, useState } from 'react';
import { api } from '../lib/api';

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  hint?: string;
}

export default function ImageUpload({ label, value, onChange, folder = 'uploads', hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const P = '#f472b6';

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('File too large (max 5MB).'); return; }
    setUploading(true); setError('');
    const result = await api.uploadFile(file, folder);
    if (result.error) setError(result.error);
    else onChange(result.publicUrl);
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>{label}</label>
      
      {/* Upload area */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{ border:`2px dashed ${value ? P : '#e5e7eb'}`, borderRadius:12, padding:'16px', cursor:'pointer', background:value?'#fdf2f8':'#fafafa', textAlign:'center', marginBottom:8, position:'relative', transition:'all 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = P)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = value ? P : '#e5e7eb')}
      >
        {value ? (
          <div style={{ position:'relative', display:'inline-block' }}>
            <img src={value} alt="preview" style={{ maxHeight:100, maxWidth:'100%', borderRadius:8, display:'block' }} />
            <button onClick={e=>{e.stopPropagation();onChange('');}} style={{ position:'absolute', top:-6, right:-6, background:'#ef4444', color:'white', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>
        ) : (
          <div style={{ color:'#9ca3af' }}>
            <div style={{ fontSize:28, marginBottom:6 }}>{uploading ? '⏳' : '📷'}</div>
            <div style={{ fontSize:13, fontWeight:600 }}>{uploading ? 'Uploading...' : 'Click or drag image here'}</div>
            {hint && <div style={{ fontSize:11, color:'#d1d5db', marginTop:4 }}>{hint}</div>}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {/* URL input fallback */}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Or paste image URL..."
        style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:12, outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const, color:'#6b7280' }}
        onFocus={e => e.target.style.borderColor = P}
        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
      />
      {error && <div style={{ fontSize:11, color:'#ef4444', marginTop:4 }}>{error}</div>}
    </div>
  );
}
