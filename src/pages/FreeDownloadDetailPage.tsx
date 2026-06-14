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
  const [artistProfile, setArtistProfile] = useState<any>(null);
  const [moreFromArtist, setMoreFromArtist] = useState<any[]>([]);

  useEffect(() => {
    api.getFreeDownload(slug).then(d => {
      if (d?.error) { setNotFound(true); setLoading(false); return; }
      setItem(d);
      setLoading(false);
      if (d.artist_id) {
        api.getArtist(d.artist_id).then((a: any) => { if (a && !a.error) setArtistProfile(a); }).catch(() => {});
        api.getFreeDownloads().then((all: any[]) => {
          if (!Array.isArray(all)) return;
          setMoreFromArtist(all.filter(x => x.artist_id === d.artist_id && x.id !== d.id).slice(0, 4));
        }).catch(() => {});
      }
      api.getProducts().then((prods: any[]) => {
        if (!Array.isArray(prods)) return;
        setRelated(prods.filter((pr: any) => pr.active !== false).slice(0, 4));
      }).catch(() => {});
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
  const fileIcon  = (t: string) => t === 'pdf' ? '📄' : t === 'zip' ? '🗜️' : t === 'png' ? '🖼️' : '📁';
  const fileBg    = (t: string) => t === 'pdf' ? '#fee2e2' : t === 'png' ? '#f3e8ff' : '#dbeafe';
  const fileColor = (t: string) => t === 'pdf' ? '#dc2626' : t === 'png' ? '#7c3aed' : '#1d4ed8';

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
      <style>{`
        .fd-grid{display:flex;align-items:stretch;}
        .fd-img{width:50%;flex-shrink:0;aspect-ratio:1/1;position:relative;overflow:hidden;}
        .fd-info{flex:1;padding:36px 40px;overflow:hidden;overflow-y:auto;}
        .fd-related-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;}
        @media(max-width:640px){
          .fd-grid{flex-direction:column!important;}
          .fd-img{width:100%!important;aspect-ratio:1/1!important;}
          .fd-info{padding:18px 16px 28px!important;}
          .fd-related-grid{grid-template-columns:repeat(2,1fr)!important;gap:10px!important;}
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
        <button onClick={() => navigate('/free-downloads')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: p, fontSize: 13, fontWeight: 700, padding: 0, fontFamily: theme.fontFamily }}>
          ← {tRaw('ดาวน์โหลดทั้งหมด', 'All Free Downloads')}
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 48px' }}>
        <div className="fd-grid" style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
          {/* Cover image — square, full fill */}
          <div className="fd-img" style={{ background: `${p}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>
            {item.cover_image_url
              ? <img src={item.cover_image_url} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span>{fileIcon(item.file_type)}</span>
            }
          </div>

          <div className="fd-info">
            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {item.file_type && (
                <span style={{ fontSize: 12, fontWeight: 700, background: fileBg(item.file_type), color: fileColor(item.file_type), borderRadius: 6, padding: '3px 10px' }}>
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

        {/* Artist card */}
        {artistProfile && (
          <div style={{ marginTop: 32, background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
            onClick={() => navigate(`/artists/${artistProfile.artist_slug || artistProfile.slug}`)}>
            {artistProfile.avatar_url
              ? <img src={artistProfile.avatar_url} alt={artistProfile.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${p}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🎨</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 2 }}>{tRaw('ศิลปิน', 'Artist')}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{artistProfile.name}</div>
              {artistProfile.bio && <div style={{ fontSize: 13, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{artistProfile.bio}</div>}
            </div>
            <span style={{ color: p, fontSize: 18 }}>→</span>
          </div>
        )}

        {/* More from this artist */}
        {moreFromArtist.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', marginBottom: 20 }}>
              🎨 {tRaw('เพิ่มเติมจากศิลปินนี้', 'More from this artist')}
            </h2>
            <div className="fd-related-grid">
              {moreFromArtist.map(fd => {
                const fdTitle = (lang === 'th' && fd.title_th) ? fd.title_th : fd.title_en;
                const ft = fd.file_type || '';
                const ftBg = ft === 'pdf' ? '#fee2e2' : ft === 'png' ? '#f3e8ff' : '#dbeafe';
                const ftColor = ft === 'pdf' ? '#dc2626' : ft === 'png' ? '#7c3aed' : '#1d4ed8';
                return (
                  <div key={fd.id} onClick={() => navigate(`/free-downloads/${fd.slug}`)}
                    style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1.5px solid #f3f4f6' }}>
                    {fd.cover_image_url
                      ? <img src={fd.cover_image_url} alt={fdTitle} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '100%', aspectRatio: '1/1', background: `${p}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>📁</div>
                    }
                    <div style={{ padding: '10px 12px' }}>
                      {ft && <span style={{ fontSize: 10, fontWeight: 700, background: ftBg, color: ftColor, borderRadius: 5, padding: '2px 7px', marginBottom: 6, display: 'inline-block' }}>{ft.toUpperCase()}</span>}
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', lineHeight: 1.35 }}>{fdTitle}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Related products */}
        {related.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', marginBottom: 20 }}>
              {tRaw('คุณอาจชอบ', 'You may also like')}
            </h2>
            <div className="fd-related-grid">
              {related.map(pr => <ProductCard key={pr.id} product={pr} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
