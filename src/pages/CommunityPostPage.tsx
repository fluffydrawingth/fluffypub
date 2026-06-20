import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';

const REACTIONS = [
  { type: 'love', emoji: '🩷', th: 'รักเลย', en: 'Love it' },
  { type: 'inspiring', emoji: '🎨', th: 'สร้างแรงบันดาลใจ', en: 'Inspiring' },
  { type: 'cozy', emoji: '🌷', th: 'อบอุ่น', en: 'Cozy' },
  { type: 'cute_palette', emoji: '🍓', th: 'พาเลตต์น่ารัก', en: 'Cute palette' },
  { type: 'want_to_try', emoji: '✨', th: 'อยากลองบ้าง', en: 'Want to try' },
];

export default function CommunityPostPage({ postId }: { postId: string }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { user } = useAuth();
  const { tRaw, lang } = useLang();
  const p = theme.primaryColor;

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [commenting, setCommenting] = useState(false);

  // Owner edit
  const [editing, setEditing] = useState(false);
  const [eCaption, setECaption] = useState('');
  const [eMediums, setEMediums] = useState('');
  const [eMarkers, setEMarkers] = useState('');
  const [ePalettes, setEPalettes] = useState('');
  const [eExtTitle, setEExtTitle] = useState('');
  const [eExtAuthor, setEExtAuthor] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getCommunityPost(postId).then((d: any) => {
      if (d && !d.error) { setPost(d); setCounts(d.reactions || {}); setMine(d.myReactions || []); }
      setLoading(false);
    }).catch(() => setLoading(false));
    api.getCommunityComments(postId).then((d: any) => setComments(d?.comments || [])).catch(() => {});
  }, [postId]);

  // ESC closes the lightbox
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const react = useCallback(async (type: string) => {
    const res = await api.reactCommunity(postId, type);
    if (res && !res.error) { setCounts(res.reactions || {}); setMine(res.myReactions || []); }
  }, [postId]);

  const saved = mine.includes('save');
  const toggleSave = async () => {
    if (!user) { navigate('/login'); return; }
    const res = await api.reactCommunity(postId, 'save');
    if (res && !res.error) { setMine(res.myReactions || []); }
  };

  const startEdit = () => {
    setECaption(post.caption || '');
    setEMediums((post.mediums || []).join(', '));
    setEMarkers((post.markers || []).join(', '));
    setEPalettes((post.palettes || []).join(', '));
    setEExtTitle(post.external_book_title || '');
    setEExtAuthor(post.external_book_author || '');
    setEditing(true);
  };
  const csv = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
  const saveEdit = async () => {
    setSavingEdit(true);
    const body: any = { caption: eCaption, mediums: csv(eMediums), markers: csv(eMarkers), palettes: csv(ePalettes) };
    if (!post.product) { body.external_book_title = eExtTitle.trim() || null; body.external_book_author = eExtAuthor.trim() || null; }
    const res = await api.updateCommunityPost(postId, body);
    setSavingEdit(false);
    if (res && !res.error) { setPost(res); setEditing(false); }
  };

  const submitComment = async () => {
    if (!user) { navigate('/login'); return; }
    const b = commentBody.trim();
    if (!b) return;
    setCommenting(true);
    const res = await api.addCommunityComment(postId, b);
    setCommenting(false);
    if (res && !res.error) { setComments(prev => [res, ...prev]); setCommentBody(''); }
  };

  if (loading) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>⏳</div>;
  if (!post) return (
    <div style={{ textAlign: 'center', padding: '80px 24px', fontFamily: theme.fontFamily }}>
      <div style={{ fontSize: 56 }}>🔍</div>
      <h2 style={{ color: theme.textColor }}>{tRaw('ไม่พบโพสต์', 'Post not found')}</h2>
      <button onClick={() => navigate('/community')} style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '12px 28px', borderRadius: 20, marginTop: 16, fontSize: 15, fontWeight: 700, fontFamily: theme.fontFamily }}>← {tRaw('ชุมชน', 'Community')}</button>
    </div>
  );

  const c = post.creator;
  const badge = c?.badge === 'artist' ? '🎨' : c?.badge === 'creator' ? '🌷' : '';
  const isOwner = !!(user && c && user.id === c.id);
  const efld = { width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${p}30`, fontSize: 14, outline: 'none', fontFamily: theme.fontFamily, boxSizing: 'border-box' as const };
  const created = post.created_at ? new Date(post.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const chips = (items: string[], emoji: string, bg: string, color: string) => (items || []).map((m: string) => (
    <span key={m} style={{ background: bg, color, borderRadius: 20, padding: '4px 11px', fontSize: 12, fontWeight: 700 }}>{emoji} {m}</span>
  ));

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{`@media(max-width:760px){.cp-grid{grid-template-columns:1fr!important}}`}</style>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 60px' }}>
        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 14, fontWeight: 600, padding: '0 0 16px' }}>← {tRaw('ชุมชน', 'Community')}</button>

        <div className="cp-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24, alignItems: 'start' }}>
          {/* Artwork (click to zoom) */}
          <div>
            <button onClick={() => setLightbox(true)} title={tRaw('ขยายภาพ', 'Zoom')}
              style={{ display: 'block', width: '100%', padding: 0, border: 'none', borderRadius: 18, overflow: 'hidden', cursor: 'zoom-in', background: p + '08', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <img src={post.artwork_url} alt={post.caption || 'artwork'} style={{ width: '100%', display: 'block' }} />
            </button>
            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 6 }}>🔍 {tRaw('แตะที่ภาพเพื่อขยาย', 'Tap the image to zoom')}</div>
          </div>

          {/* Details */}
          <div>
            {/* Creator */}
            {c && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <button onClick={() => navigate(`/creator/${c.id}`)} style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', background: p + '20', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {c.avatar_url ? <img src={c.avatar_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                </button>
                <div style={{ flex: 1 }}>
                  <button onClick={() => navigate(`/creator/${c.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{badge} {c.name}</button>
                  {created && <div style={{ fontSize: 12, color: '#94a3b8' }}>{created}</div>}
                </div>
                {isOwner && !editing && (
                  <button onClick={startEdit} style={{ padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${p}40`, background: 'white', color: p, cursor: 'pointer', fontSize: 13, fontWeight: 800, fontFamily: theme.fontFamily }}>✏️ {tRaw('แก้ไข', 'Edit')}</button>
                )}
                <button onClick={toggleSave} style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${saved ? p : '#e5e7eb'}`, background: saved ? p + '12' : 'white', color: saved ? p : '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 800, fontFamily: theme.fontFamily }}>
                  {saved ? `🔖 ${tRaw('บันทึกแล้ว', 'Saved')}` : `🔖 ${tRaw('บันทึก', 'Save')}`}
                </button>
                <ShareButton post={post} p={p} theme={theme} tRaw={tRaw} />
              </div>
            )}

            {editing ? (
              /* Owner edit panel — artwork image is NOT editable */
              <div style={{ background: 'white', borderRadius: 14, padding: 16, marginBottom: 18, border: `1.5px solid ${p}20` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 6 }}>✏️ {tRaw('คำบรรยาย', 'Caption')}</div>
                <textarea value={eCaption} maxLength={300} onChange={e => setECaption(e.target.value)} rows={2} style={{ ...efld, resize: 'vertical', marginBottom: 10 }} />
                {!post.product && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <input value={eExtTitle} onChange={e => setEExtTitle(e.target.value)} placeholder={tRaw('ชื่อหนังสือ', 'Book title')} style={efld} />
                    <input value={eExtAuthor} onChange={e => setEExtAuthor(e.target.value)} placeholder={tRaw('ศิลปิน/สำนักพิมพ์', 'Artist / Publisher')} style={efld} />
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>🎨 {tRaw('สื่อ (คั่นด้วยจุลภาค)', 'Mediums (comma-separated)')}</div>
                <input value={eMediums} onChange={e => setEMediums(e.target.value)} style={{ ...efld, marginBottom: 8 }} />
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>🖍️ {tRaw('ปากกา (คั่นด้วยจุลภาค)', 'Markers (comma-separated)')}</div>
                <input value={eMarkers} onChange={e => setEMarkers(e.target.value)} style={{ ...efld, marginBottom: 8 }} />
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>🌷 {tRaw('พาเลตต์ (คั่นด้วยจุลภาค)', 'Palettes (comma-separated)')}</div>
                <input value={ePalettes} onChange={e => setEPalettes(e.target.value)} style={{ ...efld, marginBottom: 12 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveEdit} disabled={savingEdit} style={{ padding: '9px 20px', borderRadius: 12, border: 'none', background: savingEdit ? p + '88' : p, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 800, fontFamily: theme.fontFamily }}>{savingEdit ? tRaw('กำลังบันทึก...', 'Saving...') : tRaw('บันทึก', 'Save')}</button>
                  <button onClick={() => setEditing(false)} style={{ padding: '9px 20px', borderRadius: 12, border: '1.5px solid #e5e7eb', background: 'white', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: theme.fontFamily }}>{tRaw('ยกเลิก', 'Cancel')}</button>
                </div>
              </div>
            ) : (
              <>
                {/* Caption */}
                {post.caption && <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.7, margin: '0 0 18px' }}>{post.caption}</p>}

                {/* Book used */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', marginBottom: 6 }}>📚 {tRaw('หนังสือที่ใช้', 'Book used')}</div>
                  {post.product ? (
                    <button onClick={() => navigate(`/products/${post.product.slug}${c?.affiliate_enabled ? `?ref=${c.id}` : ''}`)} style={{ background: p + '12', color: p, border: 'none', cursor: 'pointer', borderRadius: 12, padding: '8px 14px', fontSize: 13, fontWeight: 800, fontFamily: theme.fontFamily }}>📚 {post.product.title} →</button>
                  ) : post.external_book_title ? (
                    <div style={{ fontSize: 14, color: '#475569' }}>📖 {post.external_book_title}{post.external_book_author ? ` · ${post.external_book_author}` : ''}</div>
                  ) : <div style={{ fontSize: 13, color: '#cbd5e1' }}>—</div>}
                </div>

                {/* Coloring details */}
                {(post.mediums?.length || post.markers?.length || post.palettes?.length) ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                    {chips(post.mediums, '🎨', '#f3e8ff', '#7c3aed')}
                    {chips(post.markers, '🖍️', '#dbeafe', '#1d4ed8')}
                    {chips(post.palettes, '🌷', '#fce7f3', '#be185d')}
                  </div>
                ) : null}
              </>
            )}

            {/* Reactions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 14, borderTop: '1px solid #eef2f7' }}>
              {REACTIONS.map(r => {
                const on = mine.includes(r.type);
                const n = counts[r.type] || 0;
                return (
                  <button key={r.type} onClick={() => react(r.type)} title={tRaw(r.th, r.en)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 20, border: `1.5px solid ${on ? p : '#eef2f7'}`, background: on ? p + '12' : 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: on ? p : '#64748b', fontFamily: theme.fontFamily }}>
                    <span>{r.emoji}</span><span style={{ fontSize: 12 }}>{lang === 'th' ? r.th : r.en}</span>{n > 0 && <span style={{ fontSize: 12 }}>· {n}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Comments */}
        <div style={{ marginTop: 36, maxWidth: 680 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: theme.textColor, marginBottom: 14 }}>💬 {tRaw('ความคิดเห็น', 'Comments')} ({comments.length})</h2>
          {user ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <input value={commentBody} maxLength={500} onChange={e => setCommentBody(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
                placeholder={tRaw('เขียนความคิดเห็น...', 'Write a comment...')} style={{ flex: 1, padding: '11px 14px', borderRadius: 14, border: `1.5px solid ${p}30`, fontSize: 14, outline: 'none', fontFamily: theme.fontFamily }} />
              <button onClick={submitComment} disabled={commenting || !commentBody.trim()} style={{ padding: '0 20px', borderRadius: 14, border: 'none', background: commenting || !commentBody.trim() ? '#e2e8f0' : p, color: commenting || !commentBody.trim() ? '#94a3b8' : 'white', cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: theme.fontFamily }}>{tRaw('ส่ง', 'Post')}</button>
            </div>
          ) : (
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: `1.5px solid ${p}40`, color: p, cursor: 'pointer', padding: '10px 18px', borderRadius: 14, fontSize: 13, fontWeight: 700, marginBottom: 18, fontFamily: theme.fontFamily }}>
              {tRaw('เข้าสู่ระบบเพื่อแสดงความคิดเห็น', 'Log in to comment')}
            </button>
          )}
          {comments.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 14 }}>{tRaw('ยังไม่มีความคิดเห็น เป็นคนแรกสิ!', 'No comments yet — be the first!')}</div>
          ) : comments.map(cm => {
            const b = cm.author?.badge === 'artist' ? '🎨' : cm.author?.badge === 'creator' ? '🌷' : '';
            return (
              <div key={cm.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', background: p + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {cm.author?.avatar_url ? <img src={cm.author.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                </span>
                <div style={{ background: 'white', borderRadius: 14, padding: '10px 14px', flex: 1, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>{b} {cm.author?.name || 'Fluffy Creator'}</div>
                  <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.5 }}>{cm.body}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, touchAction: 'pinch-zoom' as any }}>
          <button onClick={() => setLightbox(false)} aria-label="Close" style={{ position: 'fixed', top: 16, right: 16, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 22, fontWeight: 700 }}>✕</button>
          <img src={post.artwork_url} alt={post.caption || 'artwork'} onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}

// ── Share button ──────────────────────────────────────────────────────────────
function ShareButton({ post, p, theme, tRaw }: any) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const postUrl = `${window.location.origin}${window.location.pathname}#/community/${post.id}`;
  const title = post.caption || (post.product?.title ? `Coloring: ${post.product.title}` : 'Coloring inspiration');
  const img = post.artwork_url;

  const copyLink = async () => {
    await navigator.clipboard.writeText(postUrl).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  };

  const nativeShare = () => {
    if (navigator.share) {
      navigator.share({ title, text: title, url: postUrl }).catch(() => {});
    } else {
      setOpen(o => !o);
    }
  };

  const enc = encodeURIComponent;
  const socials = [
    { label: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${enc(postUrl)}`, color: '#1877f2' },
    { label: 'Pinterest', url: `https://pinterest.com/pin/create/button/?url=${enc(postUrl)}&media=${enc(img)}&description=${enc(title)}`, color: '#e60023' },
    { label: 'X / Twitter', url: `https://twitter.com/intent/tweet?url=${enc(postUrl)}&text=${enc(title)}`, color: '#000' },
  ];

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={nativeShare} style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid #e5e7eb`, background: 'white', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 800, fontFamily: theme.fontFamily }}>
        📤 {tRaw('แชร์', 'Share')}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 180, overflow: 'hidden' }}>
          {socials.map(s => (
            <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              style={{ display: 'block', padding: '10px 16px', fontSize: 13, fontWeight: 700, color: s.color, textDecoration: 'none', borderBottom: '1px solid #f1f5f9' }}>
              {s.label}
            </a>
          ))}
          <button onClick={copyLink} style={{ display: 'block', width: '100%', padding: '10px 16px', fontSize: 13, fontWeight: 700, color: copied ? '#059669' : '#374151', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: theme.fontFamily }}>
            {copied ? `✓ ${tRaw('คัดลอกแล้ว', 'Copied!')}` : `🔗 ${tRaw('คัดลอกลิงก์', 'Copy link')}`}
          </button>
        </div>
      )}
    </div>
  );
}
