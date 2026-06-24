import React, { useEffect, useState } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

const TYPE_META: Record<string, { label: { th: string; en: string }; emoji: string }> = {
  tips:      { label: { th: 'มุมระบายสี',  en: 'Coloring Tips' }, emoji: '🎨' },
  tools:     { label: { th: 'มุมอุปกรณ์',  en: 'Tools' },         emoji: '🖍️' },
  favorites: { label: { th: 'มุมโปรด',     en: 'My Favorites' },  emoji: '🩷' },
  journal:   { label: { th: 'เล่าให้ฟัง',  en: 'Journal' },       emoji: '📔' },
};

function readingTime(contentTh?: string, contentEn?: string): string {
  const words = ((contentTh || '') + ' ' + (contentEn || '')).split(/\s+/).filter(Boolean).length;
  if (words < 300) return '1 min read';
  if (words < 700) return '2 min read';
  if (words < 1200) return '3 min read';
  return Math.ceil(words / 400) + ' min read';
}

// ── Inline reaction buttons (used inside the info panel) ──────────────────────
function ReactionButtons({ article, p, lang, tRaw, navigate }: any) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ love: 0, save: 0, share: 0 });
  const [mine, setMine] = useState({ love: false, save: false });
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!article?.id) return;
    (api as any).getJournalReactions(article.id).then((d: any) => {
      if (!d?.error) {
        setCounts({ love: d.love || 0, save: d.save || 0, share: d.share || 0 });
        setMine({ love: !!d.my_love, save: !!d.my_save });
      }
    }).catch(() => {});
  }, [article?.id]);

  const handleReact = async (type: 'love' | 'save') => {
    if (!user) { navigate('/login'); return; }
    const prev = mine[type];
    setMine(m => ({ ...m, [type]: !prev }));
    setCounts(c => ({ ...c, [type]: prev ? c[type] - 1 : c[type] + 1 }));
    try { await (api as any).reactJournalArticle(article.id, type); }
    catch { setMine(m => ({ ...m, [type]: prev })); setCounts(c => ({ ...c, [type]: prev ? c[type] + 1 : c[type] - 1 })); }
  };

  const handleShare = async () => {
    const url = window.location.href;
    let done = false;
    if (navigator.share) { try { await navigator.share({ title: article.title_th, url }); done = true; } catch {} }
    if (!done) { try { await navigator.clipboard.writeText(url); } catch {} }
    setShared(true);
    setTimeout(() => setShared(false), 2000);
    setCounts(c => ({ ...c, share: c.share + 1 }));
    (api as any).shareJournalArticle(article.id).catch(() => {});
  };

  const btn = (active: boolean) => ({
    display: 'inline-flex' as const, alignItems: 'center' as const, gap: 5,
    padding: '7px 14px', borderRadius: 18, border: `1.5px solid ${active ? p : '#e5e7eb'}`,
    background: active ? p + '12' : 'white', color: active ? p : '#64748b',
    cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s',
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        <button onClick={() => handleReact('love')} style={btn(mine.love)}>
          {mine.love ? '🩷' : '🤍'} {tRaw('ชอบมาก', 'Love this')}
          {counts.love > 0 && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{counts.love}</span>}
        </button>
        <button onClick={() => handleReact('save')} style={btn(mine.save)}>
          {mine.save ? '💾' : '🔖'} {tRaw('บันทึก', 'Save')}
          {counts.save > 0 && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{counts.save}</span>}
        </button>
        <button onClick={handleShare} style={btn(shared)}>
          🔗 {shared ? tRaw('คัดลอกแล้ว!', 'Copied!') : tRaw('แชร์', 'Share')}
          {counts.share > 0 && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{counts.share}</span>}
        </button>
      </div>
      {!user && (
        <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '8px 0 0', lineHeight: 1.5 }}>
          {tRaw('เข้าสู่ระบบเพื่อบันทึกและแสดงความชอบ', 'Log in to love and save.')}
          {' '}<button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: p, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, padding: 0 }}>{tRaw('เข้าสู่ระบบ →', 'Log in →')}</button>
        </p>
      )}
    </div>
  );
}

// ── Article page ──────────────────────────────────────────────────────────────
export default function JournalArticlePage({ slug }: { slug: string }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { lang, tRaw } = useLang();
  const p = theme.primaryColor;

  const [article, setArticle] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true); setNotFound(false); setArticle(null); setRelated([]);
    api.getJournalArticle(slug).then((d: any) => {
      if (d?.error || !d?.id) { setNotFound(true); setLoading(false); return; }
      setArticle(d);
      setLoading(false);
      api.getJournalArticles(d.article_type).then((all: any) => {
        setRelated((Array.isArray(all) ? all : []).filter((a: any) => a.id !== d.id).slice(0, 3));
      }).catch(() => {});
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>⏳</div>
  );

  if (notFound) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: theme.fontFamily, gap: 16 }}>
      <div style={{ fontSize: 56 }}>📝</div>
      <h2 style={{ color: theme.textColor, fontWeight: 900 }}>{tRaw('ไม่พบบทความ', 'Article not found')}</h2>
      <button onClick={() => navigate('/journal')} style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '10px 24px', borderRadius: 20, fontSize: 14, fontWeight: 700 }}>
        ← {tRaw('กลับ Journal', 'Back to Journal')}
      </button>
    </div>
  );

  const title   = (lang === 'th' ? article.title_th   : article.title_en)   || article.title_th;
  const excerpt = (lang === 'th' ? article.excerpt_th : article.excerpt_en) || article.excerpt_th;
  const content = (lang === 'th' ? article.content_th : article.content_en) || article.content_th || '';
  const rt       = readingTime(article.content_th, article.content_en);
  const typeMeta = TYPE_META[article.article_type];
  const date     = new Date(article.created_at).toLocaleDateString(
    lang === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{`
        .jap-hero { display: grid; grid-template-columns: minmax(0, 520px) 1fr; gap: 40px; align-items: start; }
        @media(max-width: 780px) { .jap-hero { grid-template-columns: 1fr; gap: 24px; } }
        .journal-content { font-size: 16px; line-height: 1.9; color: #374151; }
        .journal-content p  { margin: 0 0 1.2em; }
        .journal-content h2 { font-size: 1.35em; font-weight: 800; color: #1e293b; margin: 1.8em 0 0.5em; }
        .journal-content h3 { font-size: 1.12em; font-weight: 700; color: #1e293b; margin: 1.4em 0 0.4em; }
        .journal-content ul, .journal-content ol { padding-left: 1.4em; margin: 0 0 1.2em; }
        .journal-content li { margin-bottom: 0.35em; }
        .journal-content img { max-width: 100%; height: auto; border-radius: 14px; margin: 1.2em 0; display: block; }
        .journal-content a  { color: ${p}; }
        .related-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        @media(max-width: 640px) { .related-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ maxWidth: 1020, margin: '0 auto', padding: '36px 20px 80px' }}>

        {/* Back */}
        <button onClick={() => navigate('/journal')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 13, fontWeight: 600, padding: '0 0 28px', display: 'flex', alignItems: 'center', gap: 5 }}>
          ← {tRaw('Fluffy Journal', 'Fluffy Journal')}
        </button>

        {/* ── Hero: image left + info right ── */}
        <div className="jap-hero" style={{ marginBottom: 48 }}>

          {/* Left — cover image */}
          {article.cover_image ? (
            <div>
              <img src={article.cover_image} alt={title}
                style={{ width: '100%', height: 'auto', maxHeight: 480, objectFit: 'contain', borderRadius: 20, display: 'block' }} />
            </div>
          ) : (
            <div style={{ aspectRatio: '4/3', background: `linear-gradient(135deg,${p}14,${p}07)`, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
              📝
            </div>
          )}

          {/* Right — info panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 6 }}>

            {/* Category badge */}
            {typeMeta && (
              <span style={{ alignSelf: 'flex-start', background: p + '18', color: p, fontSize: 12, fontWeight: 800, padding: '5px 14px', borderRadius: 20 }}>
                {typeMeta.emoji} {typeMeta.label[lang as 'th' | 'en'] ?? typeMeta.label.en}
              </span>
            )}

            {/* Title */}
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1e293b', margin: 0, lineHeight: 1.35 }}>
              {title}
            </h1>

            {/* Meta row */}
            <div style={{ display: 'flex', gap: 10, fontSize: 12.5, color: '#94a3b8', fontWeight: 600, flexWrap: 'wrap' as const }}>
              <span>📅 {date}</span>
              <span>·</span>
              <span>⏱ {rt}</span>
            </div>

            {/* Excerpt */}
            {excerpt && (
              <p style={{ fontSize: 14.5, color: '#475569', lineHeight: 1.75, margin: 0 }}>
                {excerpt}
              </p>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: p + '18', borderRadius: 2, margin: '4px 0' }} />

            {/* Reaction buttons */}
            <ReactionButtons article={article} p={p} lang={lang} tRaw={tRaw} navigate={navigate} />
          </div>
        </div>

        {/* ── Main content ── */}
        {content ? (
          <div style={{ maxWidth: 850, margin: '0 auto' }}>
            <div style={{ height: 1.5, background: p + '15', borderRadius: 2, marginBottom: 36 }} />
            <div className="journal-content" dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: 15, padding: '20px 0' }}>
            {tRaw('ยังไม่มีเนื้อหา', 'No content yet.')}
          </div>
        )}

        {/* ── Related articles ── */}
        {related.length > 0 && (
          <div style={{ marginTop: 64, maxWidth: 850, margin: '64px auto 0' }}>
            <div style={{ height: 1.5, background: p + '15', borderRadius: 2, marginBottom: 28 }} />
            <h2 style={{ fontSize: 17, fontWeight: 900, color: '#1e293b', margin: '0 0 18px' }}>
              ✨ {tRaw('บทความที่คุณอาจชอบ', 'You may also like')}
            </h2>
            <div className="related-grid">
              {related.map(a => {
                const rtitle   = (lang === 'th' ? a.title_th   : a.title_en)   || a.title_th;
                const rexcerpt = (lang === 'th' ? a.excerpt_th : a.excerpt_en) || a.excerpt_th;
                return (
                  <div key={a.id} onClick={() => { navigate(`/journal/${a.slug}`); window.scrollTo(0, 0); }}
                    style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: `1.5px solid ${p}12` }}>
                    <div style={{ aspectRatio: '16/9', background: `linear-gradient(135deg,${p}18,${p}08)`, overflow: 'hidden' }}>
                      {a.cover_image
                        ? <img src={a.cover_image} alt={rtitle} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
                        : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📝</div>
                      }
                    </div>
                    <div style={{ padding: '12px 14px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        {rtitle}
                      </div>
                      {rexcerpt && (
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                          {rexcerpt}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
