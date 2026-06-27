import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';
import { breadcrumbSchema, useSEO } from '../lib/seo';

export default function FreeDownloadsPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw, lang } = useLang();
  const p = theme.primaryColor;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dlLoading, setDlLoading] = useState<Record<string, boolean>>({});
  useSEO({
    title: 'Free Downloads',
    description: 'Free coloring pages, printable downloads, and creative resources from FluffyPub.',
    path: '/free-downloads',
    type: 'website',
    jsonLd: breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Free Downloads', path: '/free-downloads' }]),
  });

  useEffect(() => {
    api.getFreeDownloads().then(d => {
      setItems(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const handleDownload = async (item: any) => {
    setDlLoading(prev => ({ ...prev, [item.id]: true }));
    try {
      const data = await api.downloadFree(item.id);
      if (data.error) { alert(data.error); return; }
      const a = document.createElement('a');
      a.href = data.url;
      a.download = data.fileName || item.title_en;
      a.click();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDlLoading(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const title = (i: any) => (lang === 'th' && i.title_th) ? i.title_th : i.title_en;
  const term = search.trim().toLowerCase();
  const filtered = term
    ? items.filter(i => `${i.title_en||''} ${i.title_th||''} ${i.category||''} ${i.keywords||''}`.toLowerCase().includes(term))
    : items;
  const fileIcon = (t: string) => t === 'pdf' ? '📄' : t === 'zip' ? '🗜️' : t === 'png' ? '🖼️' : '📁';
  const fileBg   = (t: string) => t === 'pdf' ? '#fee2e2' : t === 'png' ? '#f3e8ff' : '#dbeafe';
  const fileColor= (t: string) => t === 'pdf' ? '#dc2626' : t === 'png' ? '#7c3aed' : '#1d4ed8';

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{`@media(max-width:640px){.fd-grid{grid-template-columns:repeat(2,1fr)!important;gap:10px!important;}}`}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 16px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: theme.textColor, margin: '0 0 6px' }}>
            ⬇️ {tRaw('ดาวน์โหลดฟรี', 'Free Downloads')}
          </h1>
          <p style={{ color: theme.textColor + '88', margin: '0 0 16px' }}>
            {tRaw('ดาวน์โหลดไฟล์ฟรี ไม่ต้องสมัครสมาชิก', 'Free files — no sign-up required')}
          </p>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tRaw('ค้นหาไฟล์ฟรี...', 'Search free downloads...')}
            style={{ width:'100%', maxWidth:360, padding:'10px 16px', borderRadius:24, border:`1.5px solid ${p}30`, fontSize:14, outline:'none', fontFamily:theme.fontFamily, boxSizing:'border-box' }}
            onFocus={e => e.target.style.borderColor = p}
            onBlur={e => e.target.style.borderColor = p + '30'}
          />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 32 }}>⏳</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: theme.textColor + '66' }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>📭</div>
            <h3 style={{ fontWeight: 800, color: theme.textColor }}>{term ? tRaw('ไม่พบไฟล์', 'No files found') : tRaw('ยังไม่มีไฟล์', 'No files yet')}</h3>
          </div>
        )}

        <div className="fd-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 20 }}>
          {filtered.map(item => (
            <div key={item.id}
              style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: `1.5px solid ${p}15`, cursor: 'pointer', fontFamily: theme.fontFamily }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${p}20`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; }}>

              {/* Square cover */}
              <div onClick={() => navigate(`/free-downloads/${item.slug}`)}
                style={{ position: 'relative', width: '100%', paddingBottom: '100%', background: `linear-gradient(135deg,${p}12,${p}06)`, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
                  {item.cover_image_url
                    ? <img src={item.cover_image_url} alt={title(item)} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                    : <span>{fileIcon(item.file_type)}</span>
                  }
                </div>
                {/* File type badge */}
                {item.file_type && (
                  <span style={{ position: 'absolute', bottom: 8, left: 8, background: fileBg(item.file_type), color: fileColor(item.file_type), borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700, zIndex: 1 }}>
                    {item.file_type.toUpperCase()}
                  </span>
                )}
                {/* Free badge */}
                <span style={{ position: 'absolute', top: 8, right: 8, background: '#d1fae5', color: '#065f46', borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700, zIndex: 1 }}>
                  🎁 {tRaw('ฟรี', 'FREE')}
                </span>
              </div>

              {/* Card body */}
              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ fontSize: 11, color: p, fontWeight: 700, marginBottom: 3 }}>{item.category || ''}</div>
                <div onClick={() => navigate(`/free-downloads/${item.slug}`)}
                  style={{ fontSize: 14, fontWeight: 800, color: theme.textColor, marginBottom: 8, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                  {title(item)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: '#065f46' }}>
                    🎁 {tRaw('ฟรี', 'FREE')}
                  </span>
                  <button
                    disabled={!!dlLoading[item.id] || !item.r2_file_name}
                    onClick={e => { e.stopPropagation(); handleDownload(item); }}
                    style={{ background: !item.r2_file_name ? '#e5e7eb' : dlLoading[item.id] ? '#9ca3af' : p, color: !item.r2_file_name ? '#9ca3af' : 'white', border: 'none', cursor: (!item.r2_file_name || dlLoading[item.id]) ? 'not-allowed' : 'pointer', padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, fontFamily: theme.fontFamily, flexShrink: 0 }}>
                    {dlLoading[item.id] ? '⏳' : '⬇️'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
