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
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 5,
    padding: '7px 14px',
    borderRadius: 18,
    border: `1.5px solid ${active ? p : '#e5e7eb'}`,
    background: active ? p + '12' : 'white',
    color: active ? p : '#64748b',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
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

  const title    = (lang === 'th' ? article.title_th   : article.title_en)   || article.title_th;
  const excerpt  = (lang === 'th' ? article.excerpt_th : article.excerpt_en) || article.excerpt_th;
  const content  = (lang === 'th' ? article.content_th : article.content_en) || article.content_th || '';
  const rt       = readingTime(article.content_th, article.content_en);
  const typeMeta = TYPE_META[article.article_type];
  const date     = new Date(article.created_at).toLocaleDateString(
    lang === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{`
        /* intro: small image left + meta right on desktop */
        .jap-intro {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 32px;
          align-items: start;
        }
        @media (max-width: 680px) {
          .jap-intro { grid-template-columns: 1fr; gap: 16px; }
        }

        /* article body */
        .jap-body {
          font-size: 16.5px;
          line-height: 1.95;
          color: #374151;
          letter-spacing: 0.01em;
        }
        .jap-body p  { margin: 0 0 1.3em; }
        .jap-body h2 { font-size: 1.3em; font-weight: 800; color: #1e293b; margin: 2em 0 0.6em; }
        .jap-body h3 { font-size: 1.1em; font-weight: 700; color: #1e293b; margin: 1.6em 0 0.5em; }
        .jap-body ul,
        .jap-body ol { padding-left: 1.5em; margin: 0 0 1.3em; }
        .jap-body li { margin-bottom: 0.4em; }
        .jap-body img {
          max-width: 100%;
          height: auto;
          border-radius: 14px;
          margin: 1.6em 0;
          display: block;
        }
        .jap-body a { color: ${p}; text-decoration: underline; text-underline-offset: 3px; }
        .jap-body blockquote {
          border-left: 3px solid ${p}50;
          margin: 1.4em 0;
          padding: 0.6em 1.2em;
          color: #64748b;
          font-style: italic;
        }

        /* related grid */
        .jap-related { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        @media (max-width: 640px) { .jap-related { grid-template-columns: 1fr; gap: 12px; } }
        @media (min-width: 641px) and (max-width: 860px) { .jap-related { grid-template-columns: repeat(2, 1fr); } }

        .jap-related-card { transition: transform 0.15s, box-shadow 0.15s; }
        .jap-related-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,0.10) !important; }
      `}</style>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 20px 88px' }}>

        {/* Back */}
        <button onClick={() => navigate('/journal')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 13, fontWeight: 600, padding: '0 0 24px', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
          ← {tRaw('Fluffy Journal', 'Fluffy Journal')}
        </button>

        {/* ── Intro: cover (secondary) + meta (primary) ── */}
        <div className="jap-intro" style={{ marginBottom: 44 }}>

          {/* Left — cover image, reduced weight */}
          <div>
            {article.cover_image ? (
              <img
                src={article.cover_image}
                alt={title}
                style={{ width: '100%', height: 'auto', maxHeight: 320, objectFit: 'contain', borderRadius: 14, display: 'block' }}
              />
            ) : (
              <div style={{ width: '100%', aspectRatio: '1/1', background: `linear-gradient(135deg,${p}14,${p}07)`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                📝
              </div>
            )}
          </div>

          {/* Right — primary info panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>

            {/* Category badge */}
            {typeMeta && (
              <span style={{ alignSelf: 'flex-start', background: p + '15', color: p, fontSize: 11.5, fontWeight: 800, padding: '4px 13px', borderRadius: 20, letterSpacing: 0.3 }}>
                {typeMeta.emoji} {typeMeta.label[lang as 'th' | 'en'] ?? typeMeta.label.en}
              </span>
            )}

            {/* Title — primary heading */}
            <h1 style={{ fontSize: 'clamp(20px, 3.2vw, 27px)', fontWeight: 900, color: '#1e293b', margin: 0, lineHeight: 1.3, letterSpacing: -0.3 }}>
              {title}
            </h1>

            {/* Date + reading time */}
            <div style={{ display: 'flex', gap: 10, fontSize: 12.5, color: '#94a3b8', fontWeight: 600, flexWrap: 'wrap' as const, alignItems: 'center' }}>
              <span>📅 {date}</span>
              <span style={{ color: '#e2e8f0' }}>·</span>
              <span>⏱ {rt}</span>
            </div>

            {/* Excerpt — 3 lines max */}
            {excerpt && (
              <p style={{ fontSize: 14.5, color: '#64748b', lineHeight: 1.75, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                {excerpt}
              </p>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: `${p}18`, borderRadius: 1, margin: '2px 0' }} />

            {/* Reactions */}
            <ReactionButtons article={article} p={p} lang={lang} tRaw={tRaw} navigate={navigate} />
          </div>
        </div>

        {/* ── Article content — primary focus ── */}
        <div style={{ maxWidth: 850, margin: '0 auto' }}>
          {/* ornamental divider before content */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
            <div style={{ flex: 1, height: 1, background: `${p}15` }} />
            <span style={{ fontSize: 15, opacity: 0.35 }}>✦</span>
            <div style={{ flex: 1, height: 1, background: `${p}15` }} />
          </div>

          {content ? (
            <div className="jap-body" dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: 15, padding: '32px 0' }}>
              {tRaw('ยังไม่มีเนื้อหา', 'No content yet.')}
            </div>
          )}
        </div>

        {/* ── You may also like ── */}
        {related.length > 0 && (
          <div style={{ maxWidth: 850, margin: '72px auto 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: `${p}12` }} />
              <span style={{ fontSize: 12.5, fontWeight: 800, color: '#94a3b8', whiteSpace: 'nowrap' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>
                ✨ {tRaw('บทความที่คุณอาจชอบ', 'You may also like')}
              </span>
              <div style={{ flex: 1, height: 1, background: `${p}12` }} />
            </div>

            <div className="jap-related">
              {related.map(a => {
                const rtitle   = (lang === 'th' ? a.title_th   : a.title_en)   || a.title_th;
                const rexcerpt = (lang === 'th' ? a.excerpt_th : a.excerpt_en) || a.excerpt_th;
                const rm = TYPE_META[a.article_type];
                return (
                  <div key={a.id} className="jap-related-card"
                    onClick={() => { navigate(`/journal/${a.slug}`); window.scrollTo(0, 0); }}
                    style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: `1.5px solid ${p}10` }}>
                    {/* 16:9 thumbnail — cover crop acceptable for small previews */}
                    <div style={{ aspectRatio: '16/9', background: `linear-gradient(135deg,${p}18,${p}08)`, overflow: 'hidden' }}>
                      {a.cover_image
                        ? <img src={a.cover_image} alt={rtitle} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
                        : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📝</div>
                      }
                    </div>
                    <div style={{ padding: '11px 13px 13px' }}>
                      {rm && (
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: p, marginBottom: 4, letterSpacing: 0.3 }}>
                          {rm.emoji} {rm.label[lang as 'th' | 'en'] ?? rm.label.en}
                        </div>
                      )}
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        {rtitle}
                      </div>
                      {rexcerpt && (
                        <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, lineHeight: 1.5 }}>
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
