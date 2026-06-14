import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';

export default function FreeDownloadsPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw, lang } = useLang();
  const p = theme.primaryColor;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dlLoading, setDlLoading] = useState<Record<string, boolean>>({});

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
  const fileIcon = (t: string) => t === 'pdf' ? '📄' : t === 'zip' ? '🗜️' : t === 'png' ? '🖼️' : '📁';
  const fileBg   = (t: string) => t === 'pdf' ? '#fee2e2' : t === 'png' ? '#f3e8ff' : '#dbeafe';
  const fileColor= (t: string) => t === 'pdf' ? '#dc2626' : t === 'png' ? '#7c3aed' : '#1d4ed8';
  const fileLabel = (t: string) => t?.toUpperCase() || 'FILE';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: theme.fontFamily }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: theme.textColor, margin: '0 0 8px' }}>
            ⬇️ {tRaw('ดาวน์โหลดฟรี', 'Free Downloads')}
          </h1>
          <p style={{ fontSize: 15, color: '#64748b', margin: 0 }}>
            {tRaw('ดาวน์โหลดไฟล์ฟรี ไม่ต้องสมัครสมาชิก', 'Free files — no sign-up required')}
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 32 }}>⏳</div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'white', borderRadius: 20 }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>📭</div>
            <h3 style={{ color: '#1e293b', fontWeight: 800 }}>{tRaw('ยังไม่มีไฟล์', 'No files yet')}</h3>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {items.map(item => (
            <div key={item.id}
              style={{ background: 'white', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1.5px solid #f3f4f6', display: 'flex', flexDirection: 'column' }}>

              {/* Cover */}
              {item.cover_image_url
                ? <img src={item.cover_image_url} alt={title(item)}
                    onClick={() => navigate(`/free-downloads/${item.slug}`)}
                    style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', cursor: 'pointer', display: 'block' }} />
                : <div onClick={() => navigate(`/free-downloads/${item.slug}`)}
                    style={{ width: '100%', aspectRatio: '4/3', background: `${p}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, cursor: 'pointer' }}>
                    {fileIcon(item.file_type)}
                  </div>
              }

              <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* File type badge */}
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: fileBg(item.file_type), color: fileColor(item.file_type), borderRadius: 6, padding: '2px 8px' }}>
                    {fileIcon(item.file_type)} {fileLabel(item.file_type)}
                  </span>
                  {item.category && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{item.category}</span>
                  )}
                </div>

                {/* Title */}
                <div onClick={() => navigate(`/free-downloads/${item.slug}`)}
                  style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 6, cursor: 'pointer', lineHeight: 1.35 }}>
                  {title(item)}
                </div>

                {/* Highlight */}
                {item.highlight && (
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10, lineHeight: 1.5, flex: 1 }}>
                    {item.highlight}
                  </div>
                )}

                {/* File size */}
                {item.file_size && (
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
                    {(item.file_size / 1024 / 1024).toFixed(2)} MB
                  </div>
                )}

                {/* Download button */}
                <button
                  disabled={!!dlLoading[item.id] || !item.r2_file_name}
                  onClick={() => handleDownload(item)}
                  style={{ width: '100%', padding: '10px', background: (!item.r2_file_name) ? '#e5e7eb' : dlLoading[item.id] ? '#9ca3af' : p, color: (!item.r2_file_name) ? '#9ca3af' : 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: (!item.r2_file_name || dlLoading[item.id]) ? 'not-allowed' : 'pointer', fontFamily: theme.fontFamily, boxShadow: item.r2_file_name ? `0 4px 12px ${p}40` : 'none' }}>
                  {dlLoading[item.id] ? '⏳ ' + tRaw('กำลังเตรียม…', 'Preparing…') : `⬇️ ${tRaw('ดาวน์โหลดฟรี', 'Download Free')}`}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
