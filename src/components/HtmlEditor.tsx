import React, { useRef, useCallback, useState } from 'react';
import { api } from '../lib/api';

interface HtmlEditorProps {
  value: string;
  onChange: (html: string) => void;
}

const P = '#f472b6';

export default function HtmlEditor({ value, onChange }: HtmlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [btnModal, setBtnModal] = useState(false);
  const [btnText, setBtnText] = useState('');
  const [btnUrl, setBtnUrl] = useState('');
  const savedRange = useRef<Range | null>(null);

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    emit();
  };

  const emit = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreRange = () => {
    const sel = window.getSelection();
    if (sel && savedRange.current) { sel.removeAllRanges(); sel.addRange(savedRange.current); }
  };

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    restoreRange();
    document.execCommand('insertHTML', false, html);
    emit();
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await api.uploadFile(file, 'pages');
    setUploading(false);
    if (result.error) { alert('Upload failed: ' + result.error); return; }
    insertHtml(`<img src="${result.publicUrl}" alt="" style="max-width:100%;border-radius:8px;margin:8px 0;" />`);
    e.target.value = '';
  };

  // Link insert
  const openLinkModal = () => {
    saveRange();
    const sel = window.getSelection();
    setLinkText(sel?.toString() || '');
    setLinkUrl('');
    setLinkModal(true);
  };

  const insertLink = () => {
    if (!linkUrl.trim()) return;
    if (linkText.trim()) {
      insertHtml(`<a href="${linkUrl}" target="_blank" rel="noopener">${linkText}</a>`);
    } else {
      restoreRange();
      document.execCommand('createLink', false, linkUrl);
      emit();
    }
    setLinkModal(false);
  };

  // Button insert
  const openBtnModal = () => { saveRange(); setBtnText(''); setBtnUrl(''); setBtnModal(true); };
  const insertButton = () => {
    if (!btnText.trim() || !btnUrl.trim()) return;
    insertHtml(`<a href="${btnUrl}" style="display:inline-block;background:#f472b6;color:white;padding:10px 24px;border-radius:24px;text-decoration:none;font-weight:700;margin:8px 0;">${btnText}</a>`);
    setBtnModal(false);
  };

  const btn = (label: string, action: () => void, active = false, title = '') => (
    <button type="button" onMouseDown={e => { e.preventDefault(); action(); }} title={title || label}
      style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${active ? P : '#e5e7eb'}`, background: active ? P + '15' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: active ? P : '#374151', minWidth: 28 }}>
      {label}
    </button>
  );

  return (
    <div style={{ border: `1.5px solid #e5e7eb`, borderRadius: 12, overflow: 'hidden', background: 'white' }}
      onFocus={e => (e.currentTarget.style.borderColor = P)}
      onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 10px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap' as const, background: '#fafafa' }}>
        {/* Heading */}
        <select onMouseDown={e => e.preventDefault()} onChange={e => { exec('formatBlock', e.target.value); e.target.value = ''; }}
          style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 11, fontFamily: 'inherit', background: 'white', cursor: 'pointer', color: '#374151' }}>
          <option value="">Heading</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="p">Paragraph</option>
        </select>

        <div style={{ width: 1, background: '#e5e7eb', margin: '0 2px' }} />

        {btn('B', () => exec('bold'), false, 'Bold')}
        {btn('I', () => exec('italic'), false, 'Italic')}
        {btn('U', () => exec('underline'), false, 'Underline')}

        <div style={{ width: 1, background: '#e5e7eb', margin: '0 2px' }} />

        {btn('• List', () => exec('insertUnorderedList'))}
        {btn('1. List', () => exec('insertOrderedList'))}

        <div style={{ width: 1, background: '#e5e7eb', margin: '0 2px' }} />

        {btn('🔗 Link', openLinkModal)}
        {btn('🔘 Button', openBtnModal)}

        <div style={{ width: 1, background: '#e5e7eb', margin: '0 2px' }} />

        {/* Image upload */}
        <label style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}>
          {uploading ? '⏳' : '🖼️ Image'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        </label>

        <div style={{ width: 1, background: '#e5e7eb', margin: '0 2px' }} />

        {btn('↩ Undo', () => exec('undo'))}
        {btn('↪ Redo', () => exec('redo'))}
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        dangerouslySetInnerHTML={{ __html: value }}
        style={{ minHeight: 240, padding: '14px 16px', fontSize: 14, lineHeight: 1.8, color: '#374151', outline: 'none', fontFamily: 'inherit' }}
      />

      {/* Link modal */}
      {linkModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLinkModal(false)}>
          <div style={{ background: 'white', borderRadius: 14, padding: 24, width: 340 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800 }}>Insert Link</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Link Text</label>
              <input value={linkText} onChange={e => setLinkText(e.target.value)} placeholder="Click here"
                style={{ width: '100%', padding: '8px 11px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>URL *</label>
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..."
                style={{ width: '100%', padding: '8px 11px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }}
                onKeyDown={e => e.key === 'Enter' && insertLink()} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setLinkModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={insertLink} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: P, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Button modal */}
      {btnModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setBtnModal(false)}>
          <div style={{ background: 'white', borderRadius: 14, padding: 24, width: 340 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800 }}>Insert Button</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Button Text *</label>
              <input value={btnText} onChange={e => setBtnText(e.target.value)} placeholder="Shop Now"
                style={{ width: '100%', padding: '8px 11px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>URL *</label>
              <input value={btnUrl} onChange={e => setBtnUrl(e.target.value)} placeholder="https://..."
                style={{ width: '100%', padding: '8px 11px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }}
                onKeyDown={e => e.key === 'Enter' && insertButton()} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setBtnModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={insertButton} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: P, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Insert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
