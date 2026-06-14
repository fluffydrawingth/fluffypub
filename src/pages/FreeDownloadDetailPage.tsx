import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';
import ProductCard from '../components/ProductCard';

export default function FreeDownloadDetailPage({ slug }: { slug: string }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw, lang } = useLang();
  const p = theme.primaryColor;

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [dlError, setDlError] = useState('');
  const [related, setRelated] = useState<any[]>([]);

  useEffect(() => {
    api.getFreeDownload(slug).then(d => {
      if (d?.error) { setNotFound(true); }
      else { setItem(d); }
      setLoading(false);
    });
    api.getProducts().then(prods => {
      if (Array.isArray(prods)) setRelated(prods.filter((pr: any) => pr.active !== false).slice(0, 4));
    });
  }, [slug]);

  const handleDownload = async () => {
    if (!item) return;
    setDlLoading(true);
    setDlError('');
    try {
      const data = await api.downloadFree(item.id);
      if (data.error) { setDlError(data.error); return; }
      const a = document.createElement('a');
      a.href = data.url;
      a.download = data.fileName || item.title_en;
      a.click();
      // Bump local count display
      setItem((prev: any) => ({ ...prev, download_count: (prev.download_count || 0) + 1 }));
    } catch (e: any) {
      setDlError(e.message);
    } finally {
      setDlLoading(false);
    }
  };

  const title = item ? ((lang === 'th' && item.title_th) ? item.title_th : item.title_en) : '';
  const description = item ? ((lang === 'th' && item.description_th) ? item.description_th : item.description_en) : '';
  const fileIcon = (t: string) => t === 'pdf' ? '📄' : t === 'zip' ? '🗜️' : '📁';

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontFamily: theme.fontFamily }}>⏳</div>
  );

  if (notFound || !item) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: theme.fontFamily }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🔍</div>
        <h2 style={{ color: '#1e293b', fontWeight: 900 }}>{tRaw('ไม่พบไฟล์', 'File not found')}</h2>
        <button onClick={() => navigate('/free-downloads')}
          style={{ marginTop: 16, background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '11px 24px', borderRadius: 20, fontSize: 14, fontWeight: 700, fontFamily: theme.fontFamily }}>
          ← {tRaw('กลับ', 'Back')}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: theme.fontFamily }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>

        {/* Back */}
        <button onClick={() => navigate('/free-downloads')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: p, fontSize: 13, fontWeight: 700, marginBottom: 20, padding: 0, fontFamily: theme.fontFamily }}>
          ← {tRaw('ดาวน์โหลดทั้งหมด', 'All Free Downloads')}
        </button>

        <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {/* Cover */}
          {item.cover_image_url && (
            <img src={item.cover_image_url} alt={title}
              style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }} />
          )}

          <div style={{ padding: '24px 28px 32px' }}>
            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {item.file_type && (
                <span style={{ fontSize: 12, fontWeight: 700, background: item.file_type === 'pdf' ? '#fee2e2' : '#dbeafe', color: item.file_type === 'pdf' ? '#dc2626' : '#1d4ed8', borderRadius: 6, padding: '3px 10px' }}>
                  {fileIcon(item.file_type)} {item.file_type.toUpperCase()}
                </span>
              )}
              {item.category && (
                <span style={{ fontSize: 12, fontWeight: 600, background: '#f3f4f6', color: '#6b7280', borderRadius: 6, padding: '3px 10px' }}>
                  {item.category}
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 600, background: '#d1fae5', color: '#065f46', borderRadius: 6, padding: '3px 10px' }}>
                🎁 {tRaw('ฟรี', 'Free')}
              </span>
            </div>

            {/* Title */}
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1e293b', margin: '0 0 8px', lineHeight: 1.3 }}>{title}</h1>

            {/* Highlight */}
            {item.highlight && (
              <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>{item.highlight}</p>
            )}

            {/* File info row */}
            {(item.file_size || item.r2_file_name) && (
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#6b7280', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {item.r2_file_name && <span>📎 {item.r2_file_name}</span>}
                {item.file_size && <span>💾 {(item.file_size / 1024 / 1024).toFixed(2)} MB</span>}
                {item.download_count > 0 && <span>⬇️ {item.download_count} {tRaw('ดาวน์โหลด', 'downloads')}</span>}
              </div>
            )}

            {/* Download button */}
            {dlError && (
              <div style={{ background: '#fee2e2', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{dlError}</div>
            )}
            <button
              disabled={dlLoading || !item.r2_file_name}
              onClick={handleDownload}
              style={{ width: '100%', padding: '14px', background: !item.r2_file_name ? '#e5e7eb' : dlLoading ? '#9ca3af' : p, color: !item.r2_file_name ? '#9ca3af' : 'white', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: (dlLoading || !item.r2_file_name) ? 'not-allowed' : 'pointer', fontFamily: theme.fontFamily, boxShadow: item.r2_file_name ? `0 6px 16px ${p}44` : 'none', marginBottom: 8 }}>
              {dlLoading ? `⏳ ${tRaw('กำลังเตรียมไฟล์…', 'Preparing file…')}` : `⬇️ ${tRaw('ดาวน์โหลดฟรี', 'Download Free')}`}
            </button>
            {!item.r2_file_name && (
              <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>{tRaw('ไฟล์ยังไม่พร้อม', 'File not yet available')}</div>
            )}

            {/* Description */}
            {description && (
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid #f3f4f6' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#374151', marginBottom: 12 }}>{tRaw('รายละเอียด', 'Description')}</h3>
                <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{description}</div>
              </div>
            )}

            {/* Keywords */}
            {item.keywords?.length > 0 && (
              <div style={{ marginTop: 20, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {item.keywords.map((kw: string) => (
                  <span key={kw} style={{ fontSize: 11, background: `${p}12`, color: p, borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>{kw}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', marginBottom: 20 }}>
              {tRaw('คุณอาจชอบ', 'You may also like')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {related.map(pr => <ProductCard key={pr.id} product={pr} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
