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

function readingTimeForArticle(article: any): string {
  const blocks = Array.isArray(article?.content_blocks) ? article.content_blocks : [];
  const blockText = blocks.map((b: any) => [
    b.heading_th, b.heading_en, b.text_th, b.text_en, b.caption_th, b.caption_en, b.button_label_th, b.button_label_en, b.note_th, b.note_en, b.image_alt_th, b.image_alt_en,
  ].filter(Boolean).join(' ')).join(' ');
  return readingTime(`${article?.content_th || ''} ${blockText}`, article?.content_en || '');
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

const BLOCK_IMAGE_MAX: Record<string, number | string> = {
  small: 280,
  medium: 420,
  large: 640,
  full: '100%',
};

function blockText(block: any, key: string, lang: string): string {
  if (lang === 'th') return block[`${key}_th`] || block[key] || block[`${key}_en`] || '';
  return block[`${key}_en`] || block[key] || block[`${key}_th`] || '';
}

function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined' || !html) return html || '';
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,form,input,button').forEach(el => el.remove());
  doc.body.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value || '';
      const style = name === 'style' ? value.toLowerCase() : '';
      if (style.includes('font-weight') && /(bold|700|800|900)/.test(style)) {
        const wrapper = doc.createElement('strong');
        while (el.firstChild) wrapper.appendChild(el.firstChild);
        el.appendChild(wrapper);
      }
      if (style.includes('font-style') && style.includes('italic')) {
        const wrapper = doc.createElement('em');
        while (el.firstChild) wrapper.appendChild(el.firstChild);
        el.appendChild(wrapper);
      }
      if (style.includes('text-decoration') && style.includes('underline')) {
        const wrapper = doc.createElement('u');
        while (el.firstChild) wrapper.appendChild(el.firstChild);
        el.appendChild(wrapper);
      }
      if (name.startsWith('on') || name === 'style') el.removeAttribute(attr.name);
      if ((name === 'href' || name === 'src') && !/^(https?:|mailto:|tel:|\/|#)/i.test(value)) el.removeAttribute(attr.name);
    });
    if (el.tagName.toLowerCase() === 'a') {
      el.setAttribute('rel', 'noopener noreferrer');
      if (!el.getAttribute('target')) el.setAttribute('target', '_blank');
    }
  });
  return doc.body.innerHTML;
}

function ParagraphText({ text }: { text: string }) {
  if (/<[a-z][\s\S]*>/i.test(String(text || ''))) return <div className="jap-rich" dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />;
  return (
    <>
      {String(text || '').split(/\n{2,}/).filter(Boolean).map((part, idx) => (
        <p key={idx}>{part.split('\n').map((line, i) => <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>)}</p>
      ))}
    </>
  );
}

function LinkButton({ block, lang, p }: { block: any; lang: string; p: string }) {
  if (!block.link_url) return null;
  const label = blockText(block, 'button_label', lang);
  if (!label) return null;
  const outline = block.button_style === 'outline';
  return (
    <a href={block.link_url} target={block.link_new_tab === false ? undefined : '_blank'} rel={block.link_new_tab === false ? undefined : 'noopener noreferrer'}
      className={block.type === 'cta' ? 'jap-cta-button' : undefined}
      style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:12,background:outline?'white':p,color:outline?p:'white',border:`1.5px solid ${p}`,textDecoration:'none',borderRadius:18,padding:'8px 15px',fontSize:13,fontWeight:800,boxShadow:outline?'none':`0 8px 20px ${p}20`}}>
      {label} →
    </a>
  );
}

function LegacyHtml({ html }: { html: string }) {
  if (!html) return null;
  return <div className="jap-rich" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}

function JournalImage({ block, alt, p }: { block: any; alt: string; p: string }) {
  if (!block.image) return null;
  const maxWidth = BLOCK_IMAGE_MAX[block.size || 'medium'] || BLOCK_IMAGE_MAX.medium;
  const justifyContent = block.align === 'left' ? 'flex-start' : block.align === 'right' ? 'flex-end' : 'center';
  const img = <img src={block.image} alt={alt} style={{ width: '100%', maxWidth, borderRadius: 16, objectFit: 'cover', display: 'block', boxShadow: `0 10px 28px ${p}10` }} />;
  return (
    <figure style={{ margin: '0', display: 'flex', flexDirection: 'column', alignItems: block.align === 'left' ? 'flex-start' : block.align === 'right' ? 'flex-end' : 'center' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent }}>
        {block.link_url && !blockText(block, 'button_label', 'th') && !blockText(block, 'button_label', 'en') ? (
          <a href={block.link_url} target={block.link_new_tab === false ? undefined : '_blank'} rel={block.link_new_tab === false ? undefined : 'noopener noreferrer'} style={{width:'100%',maxWidth,display:'block'}}>{img}</a>
        ) : img}
      </div>
      {block.caption && <figcaption style={{ maxWidth, marginTop: 8, fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5, textAlign: block.align || 'center' }}>{block.caption}</figcaption>}
    </figure>
  );
}

function JournalBlock({ block, lang, p }: { block: any; lang: string; p: string }) {
  const heading = blockText(block, 'heading', lang);
  const text = blockText(block, 'text', lang);
  const legacyHtml = lang === 'th' ? (block.legacy_html_th || block.legacy_html_en) : (block.legacy_html_en || block.legacy_html_th);
  const caption = blockText(block, 'caption', lang);
  const note = blockText(block, 'note', lang);
  const imageAlt = blockText(block, 'image_alt', lang);
  const imageBlock = { ...block, caption };

  if (block.type === 'cta') {
    return (
      <section className="jap-block jap-cta">
        {block.image_url && <img src={block.image_url} alt={imageAlt || ''} className="jap-cta-image" />}
        <div className="jap-cta-copy">
          {note && <ParagraphText text={note} />}
          <LinkButton block={block} lang={lang} p={p} />
        </div>
      </section>
    );
  }

  if (block.type === 'image') {
    return (
      <section className="jap-block">
        <JournalImage block={imageBlock} alt={caption || heading || 'Journal image'} p={p} />
        <LinkButton block={block} lang={lang} p={p} />
      </section>
    );
  }

  if (block.type === 'imageText') {
    const textFirst = block.layout === 'text-left';
    return (
      <section className={`jap-block jap-split ${textFirst ? 'text-first' : 'image-first'}`}>
        <div className="jap-split-image">
          <JournalImage block={{ ...imageBlock, size: 'full', align: 'center' }} alt={caption || heading || 'Journal image'} p={p} />
        </div>
        <div className="jap-split-text">
          {heading && <h2>{heading}</h2>}
          {text && <ParagraphText text={text} />}
          <LinkButton block={block} lang={lang} p={p} />
        </div>
      </section>
    );
  }

  if (block.type === 'quote') {
    return (
      <section className="jap-block jap-note">
        {heading && <h3>{heading}</h3>}
        {text ? <ParagraphText text={text} /> : <LegacyHtml html={legacyHtml} />}
      </section>
    );
  }

  return (
    <section className="jap-block">
      {heading && <h2>{heading}</h2>}
      {text ? <ParagraphText text={text} /> : <LegacyHtml html={legacyHtml} />}
      <LinkButton block={block} lang={lang} p={p} />
    </section>
  );
}

function articleBlocks(article: any) {
  const blocks = Array.isArray(article?.content_blocks) ? article.content_blocks : [];
  if (blocks.length > 0) return blocks;
  if (!article?.content_th && !article?.content_en) return [];
  return [{
    id: `legacy-${article.id}`,
    type: 'text',
    heading_th: '',
    heading_en: '',
    text_th: '',
    text_en: '',
    legacy_html_th: article.content_th || '',
    legacy_html_en: article.content_en || '',
  }];
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
  const blocks   = articleBlocks(article);
  const rt       = readingTimeForArticle(article);
  const typeMeta = TYPE_META[article.article_type];
  const coverCrop = article.cover_crop || {};
  const coverPosition = `${((coverCrop.focalPointX ?? 0.5) * 100).toFixed(0)}% ${((coverCrop.focalPointY ?? 0.5) * 100).toFixed(0)}%`;
  const date     = new Date(article.created_at).toLocaleDateString(
    lang === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{`
        .jap-header-card {
          display: grid;
          grid-template-columns: minmax(280px, 340px) 1fr;
          gap: 22px;
          align-items: center;
          background: rgba(255,255,255,0.68);
          border: 1px solid rgba(255,255,255,0.72);
          border-radius: 22px;
          padding: 18px;
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(10px);
        }
        @media (max-width: 760px) {
          .jap-header-card { grid-template-columns: 1fr; padding: 14px; gap: 14px; }
        }

        /* article body */
        .jap-body {
          font-size: 16.5px;
          line-height: 1.82;
          color: #374151;
          letter-spacing: 0;
          background: rgba(255,255,255,0.66);
          border: 1px solid rgba(255,255,255,0.74);
          border-radius: 22px;
          padding: clamp(22px, 4vw, 38px);
          box-shadow: 0 12px 36px rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(8px);
        }
        .jap-body p,
        .jap-rich p { margin: 0 0 1.15em; }
        .jap-body h2,
        .jap-rich h2 { font-size: 1.28em; font-weight: 850; color: #1e293b; margin: 1.6em 0 0.65em; line-height: 1.35; }
        .jap-body h3,
        .jap-rich h3 { font-size: 1.08em; font-weight: 800; color: #1e293b; margin: 1.25em 0 0.5em; line-height: 1.4; }
        .jap-rich b,
        .jap-rich strong { font-weight: 850; color: #1e293b; }
        .jap-rich u { text-underline-offset: 3px; }
        .jap-body div > ul,
        .jap-body div > ol,
        .jap-rich ul,
        .jap-rich ol,
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
        .jap-block { margin: 0 0 32px; }
        .jap-block h2 { font-size: 1.28em; font-weight: 850; color: #1e293b; line-height: 1.35; margin: 0 0 0.65em; }
        .jap-block h3 { font-size: 1.05em; font-weight: 800; color: #1e293b; line-height: 1.4; margin: 0 0 0.45em; }
        .jap-block p { margin: 0 0 1em; }
        .jap-split {
          display: grid;
          grid-template-columns: minmax(220px, 0.9fr) 1.1fr;
          gap: 26px;
          align-items: center;
        }
        .jap-split.text-first { grid-template-columns: 1.1fr minmax(220px, 0.9fr); }
        .jap-split.text-first .jap-split-text { order: 1; }
        .jap-split.text-first .jap-split-image { order: 2; }
        .jap-split.image-first .jap-split-image { order: 1; }
        .jap-split.image-first .jap-split-text { order: 2; }
        .jap-note {
          background: white;
          border: 1.5px solid ${p}18;
          border-left: 4px solid ${p};
          border-radius: 16px;
          padding: 18px 20px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
          text-align: center;
        }
        .jap-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          text-align: left;
          background: rgba(255,255,255,0.78);
          border: 1.5px solid ${p}18;
          border-radius: 16px;
          padding: 12px 18px;
          max-width: 660px;
          margin: 0 auto 16px;
          height: auto;
          min-height: unset;
          max-height: none;
          box-sizing: border-box;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
        }
        .jap-cta-image {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 12px;
          flex: 0 0 auto;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.07);
        }
        .jap-cta-copy { min-width: 0; display: flex; flex-direction: column; justify-content: center; }
        .jap-cta-copy p { margin-bottom: 0.35em; line-height: 1.4; font-size: 14px; }
        .jap-cta-button {
          min-height: 0 !important;
          height: 44px;
          margin-top: 2px !important;
          padding: 0 18px !important;
          border-radius: 14px !important;
          justify-content: center;
          width: fit-content;
          max-width: 100%;
        }
        @media (max-width: 680px) {
          .jap-split,
          .jap-split.text-first { grid-template-columns: 1fr; gap: 14px; }
          .jap-split .jap-split-image { order: 1 !important; }
          .jap-split .jap-split-text { order: 2 !important; }
          .jap-block { margin-bottom: 28px; }
          .jap-cta { align-items: center; gap: 10px; padding: 12px 14px; margin-bottom: 16px; min-height: unset; height: auto; }
          .jap-cta-image { width: 56px; height: 56px; }
          .jap-cta-button { height: 42px; min-height: 0 !important; font-size: 12.5px !important; padding: 0 14px !important; }
        }
        @media (max-width: 360px) {
          .jap-cta { flex-direction: column; text-align: center; }
          .jap-cta-copy { align-items: center; }
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

        {/* ── Compact article header ── */}
        <div className="jap-header-card" style={{ marginBottom: 28 }}>
          <div style={{ width:'100%' }}>
            {article.cover_image ? (
              <div style={{width:'100%',aspectRatio:'4/3',overflow:'hidden',borderRadius:16,background:'white'}}>
                <img
                  src={article.cover_image}
                  alt={title}
                  style={{
                    width: '100%',
                    height:'100%',
                    objectFit: coverCrop.useOriginal ? 'contain' : 'cover',
                    objectPosition: coverPosition,
                    transform: coverCrop.useOriginal ? 'none' : `scale(${coverCrop.zoom || 1})`,
                    display: 'block',
                  }}
                />
              </div>
            ) : (
              <div style={{width:'100%',aspectRatio:'4/3',borderRadius:16,background:`linear-gradient(135deg,${p}14,${p}06)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:34}}>📝</div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems:'flex-start', minWidth:0 }}>

            {/* Category badge */}
            {typeMeta && (
              <span style={{ background: p + '15', color: p, fontSize: 11.5, fontWeight: 800, padding: '4px 13px', borderRadius: 20, letterSpacing: 0.3 }}>
                {typeMeta.emoji} {typeMeta.label[lang as 'th' | 'en'] ?? typeMeta.label.en}
              </span>
            )}

            {/* Title — primary heading */}
            <h1 style={{ fontSize: 'clamp(21px, 3vw, 30px)', fontWeight: 900, color: '#1e293b', margin: 0, lineHeight: 1.28, letterSpacing: 0 }}>
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
            {/* Reactions */}
            <ReactionButtons article={article} p={p} lang={lang} tRaw={tRaw} navigate={navigate} />
          </div>
        </div>

        {/* ── Article content — primary focus ── */}
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {blocks.length > 0 ? (
            <div className="jap-body">
              {blocks.map((block: any, idx: number) => <JournalBlock key={block.id || idx} block={block} lang={lang} p={p} />)}
            </div>
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
                const rcrop = a.cover_crop || {};
                const rcoverPosition = `${((rcrop.focalPointX ?? 0.5) * 100).toFixed(0)}% ${((rcrop.focalPointY ?? 0.5) * 100).toFixed(0)}%`;
                return (
                  <div key={a.id} className="jap-related-card"
                    onClick={() => { navigate(`/journal/${a.slug}`); window.scrollTo(0, 0); }}
                    style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: `1.5px solid ${p}10` }}>
                    {/* 16:9 thumbnail — cover crop acceptable for small previews */}
                    <div style={{ aspectRatio: '16/9', background: `linear-gradient(135deg,${p}18,${p}08)`, overflow: 'hidden' }}>
                      {a.cover_image
                        ? <img src={a.cover_image} alt={rtitle} style={{ width: '100%', height: '100%', objectFit: rcrop.useOriginal ? 'contain' : 'cover', objectPosition: rcoverPosition, transform: rcrop.useOriginal ? 'none' : `scale(${rcrop.zoom || 1})`, display: 'block' }} />
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
