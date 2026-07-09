import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';
import ImageCarousel from '../components/ImageCarousel';
import CommunityCard from '../components/CommunityCard';
import BadgeIcon from '../components/BadgeIcon';
import { isImageUrl } from '../lib/avatar';
import { RecommendedToolsBlock, StructuredMediumBlock, KeywordsBlock } from './CommunityPage';
import { breadcrumbSchema, cleanText, useSEO } from '../lib/seo';

const REACTIONS = [
  { type: 'love', emoji: '🩷', th: 'รักเลย', en: 'Love it' },
  { type: 'inspiring', emoji: '🎨', th: 'สร้างแรงบันดาลใจ', en: 'Inspiring' },
  { type: 'cozy', emoji: '🌷', th: 'อบอุ่น', en: 'Cozy' },
  { type: 'cute_palette', emoji: '🍓', th: 'พาเลตต์น่ารัก', en: 'Cute palette' },
  { type: 'want_to_try', emoji: '✨', th: 'อยากลองบ้าง', en: 'Want to try' },
];

const DEFAULT_TAGS: Record<string, string[]> = {
  medium: ['Alcohol Marker', 'Acrylic', 'Colored Pencil', 'Watercolor', 'Gel Pen', 'Crayon', 'Digital', 'Other'],
  marker: ['Ohuhu Pastel 48', 'Ohuhu Midtone 48', 'Ohuhu Kaala B Series', 'Copic Sketch', 'Prismacolor'],
  palette: [],
};

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
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [related, setRelated] = useState<any[]>([]);

  // Owner edit — full form
  const [editing, setEditing] = useState(false);
  const [eCaption, setECaption] = useState('');
  const [eHeader, setEHeader] = useState('');
  const [eDetails, setEDetails] = useState<{ medium: string; brand: string }[]>([{ medium: '', brand: '' }]);
  const [eKeywords, setEKeywords] = useState<string[]>([]);
  const [ePalettes, setEPalettes] = useState<string[]>([]);
  const [eBookMode, setEBookMode] = useState<'product' | 'external' | 'none'>('none');
  const [eSelProduct, setESelProduct] = useState<any>(null);
  const [eProdQuery, setEProdQuery] = useState('');
  const [eProdResults, setEProdResults] = useState<any[]>([]);
  const [eAllProducts, setEAllProducts] = useState<any[]>([]);
  const [eExtTitle, setEExtTitle] = useState('');
  const [eExtAuthor, setEExtAuthor] = useState('');
  const [eTools, setETools] = useState<{ name: string; url: string }[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getCommunityPost(postId).then((d: any) => {
      if (d && !d.error) { setPost(d); setCounts(d.reactions || {}); setMine(d.myReactions || []); }
      setLoading(false);
    }).catch(() => setLoading(false));
    api.getCommunityComments(postId).then((d: any) => setComments(d?.comments || [])).catch(() => {});
    api.getProducts().then((d: any) => setEAllProducts(Array.isArray(d) ? d : [])).catch(() => {});
    api.getCommunityRelated(postId).then((d: any) => setRelated(d?.posts || [])).catch(() => {});
  }, [postId]);

  useEffect(() => {
    const q = eProdQuery.trim().toLowerCase();
    if (!q) { setEProdResults([]); return; }
    setEProdResults(eAllProducts.filter(pr => (pr.title || '').toLowerCase().includes(q)).slice(0, 6));
  }, [eProdQuery, eAllProducts]);

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

  const seoImages = post ? ((post.artwork_urls && post.artwork_urls.length ? post.artwork_urls : [post.artwork_url]).filter(Boolean)) : [];
  const seoTitleSource = post?.caption || post?.product?.title || post?.external_book?.title || post?.external_book_title || 'Community post';
  const seoTitle = cleanText(seoTitleSource, 'Community post').slice(0, 80);
  const seoDescription = cleanText(
    post?.caption || [post?.product?.title, post?.external_book?.title || post?.external_book_title, post?.creator?.name].filter(Boolean).join(' · '),
    'Coloring artwork and creative notes from the FluffyPub community.'
  );
  useSEO({
    title: seoTitle,
    description: seoDescription,
    path: `/community/${post?.id || postId}`,
    image: seoImages[0],
    type: 'website',
    jsonLd: post ? breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Community', path: '/community' }, { name: seoTitle, path: `/community/${post.id}` }]) : [],
  });

  const saved = mine.includes('save');
  const toggleSave = async () => {
    if (!user) { navigate('/login'); return; }
    const res = await api.reactCommunity(postId, 'save');
    if (res && !res.error) setMine(res.myReactions || []);
  };

  const startEdit = () => {
    setECaption(post.caption || '');
    setEHeader(post.post_header || '');
    // Load structured rows from coloring_details, else derive from legacy mediums/markers
    const cd = Array.isArray(post.coloring_details) && post.coloring_details.length
      ? post.coloring_details.map((d: any) => ({ medium: d.medium || '', brand: d.brand || '' }))
      : (post.mediums || []).map((m: string, i: number) => ({ medium: m, brand: (post.markers || [])[i] || '' }));
    setEDetails(cd.length ? cd : [{ medium: '', brand: '' }]);
    setEKeywords(post.keywords || []);
    setEPalettes(post.palettes || []);
    setEExtTitle(post.external_book_title || '');
    setEExtAuthor(post.external_book_author || '');
    setETools((post.recommended_tools || []).map((t: any) => ({ name: t.name || '', url: t.url || '' })));
    if (post.product) { setEBookMode('product'); setESelProduct(post.product); }
    else if (post.external_book_title) setEBookMode('external');
    else setEBookMode('none');
    setEditing(true);
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    const body: any = {
      post_header: eHeader.trim() || null,
      caption: eCaption,
      coloring_details: eDetails.filter(d => d.medium.trim()).map(d => ({ medium: d.medium.trim(), brand: d.brand.trim() })),
      mediums: [...new Set(eDetails.map(d => d.medium.trim()).filter(Boolean))],
      markers: [...new Set(eDetails.map(d => d.brand.trim()).filter(Boolean))],
      keywords: eKeywords,
      palettes: ePalettes,
      product_id: eBookMode === 'product' ? (eSelProduct?.id || null) : null,
      external_book_title: eBookMode === 'external' ? eExtTitle.trim() || null : null,
      external_book_author: eBookMode === 'external' ? eExtAuthor.trim() || null : null,
    };
    if (post.creator?.affiliate_enabled) body.recommended_tools = eTools.filter(t => t.name.trim());
    const res = await api.updateCommunityPost(postId, body);
    setSavingEdit(false);
    if (res && !res.error) { setPost(res); setEditing(false); }
  };

  const deletePost = async () => {
    setDeleting(true);
    await api.deleteCommunityPost(postId);
    navigate('/community');
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
  const images = (post.artwork_urls && post.artwork_urls.length ? post.artwork_urls : [post.artwork_url]).filter(Boolean);
  const isOwner = !!(user && c && user.id === c.id);
  const isAdmin = user?.role === 'admin';
  const efld = { width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${p}30`, fontSize: 14, outline: 'none', fontFamily: theme.fontFamily, boxSizing: 'border-box' as const };
  const created = post.created_at ? new Date(post.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const chips = (items: string[], emoji: string, bg: string, color: string) => (items || []).map((m: string) => (
    <span key={m} style={{ background: bg, color, borderRadius: 20, padding: '4px 11px', fontSize: 12, fontWeight: 700 }}>{emoji} {m}</span>
  ));

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{`@media(max-width:760px){.cp-grid{grid-template-columns:1fr!important}}`}</style>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 60px' }}>
        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 15, fontWeight: 600, padding: '0 0 16px' }}>← {tRaw('ชุมชน', 'Community')}</button>

        <div className="cp-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24, alignItems: 'start' }}>
          {/* Artwork — full original ratio carousel, no cropping on detail page */}
          <div>
            <div style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.08))' }}>
              <ImageCarousel images={images} fit="contain" rounded={18} onImageClick={() => setLightbox(true)} thumbnails priority />
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 6 }}>🔍 {tRaw('แตะที่ภาพเพื่อขยาย', 'Tap to zoom')}</div>
          </div>

          {/* Details */}
          <div>
            {/* Creator + action buttons */}
            {c && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <button onClick={() => navigate(`/creator/${c.id}`)} style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: p + '20', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {isImageUrl(c.avatar_url) ? <img src={c.avatar_url} alt={c.name} loading="lazy" decoding="async" width={44} height={44} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.avatar_url ? <span style={{ fontSize: 22 }}>{c.avatar_url}</span> : <BadgeIcon affiliate={c.affiliate_enabled} size={20} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button onClick={() => navigate(`/creator/${c.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 16, fontWeight: 800, color: '#1e293b', textAlign: 'left' }}><BadgeIcon affiliate={c.affiliate_enabled} size={15} /> {c.name}</button>
                  {created && <div style={{ fontSize: 13, color: '#94a3b8' }}>{created}</div>}
                </div>
                <button onClick={toggleSave} style={{ padding: '7px 12px', borderRadius: 20, border: `1.5px solid ${saved ? p : '#e5e7eb'}`, background: saved ? p + '12' : 'white', color: saved ? p : '#64748b', cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: theme.fontFamily }}>
                  {saved ? `🔖 ${tRaw('บันทึกแล้ว', 'Saved')}` : `🔖 ${tRaw('บันทึก', 'Save')}`}
                </button>
                <ShareButton post={post} p={p} theme={theme} tRaw={tRaw} />
              </div>
            )}

            {/* Owner actions */}
            {(isOwner || isAdmin) && !editing && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <button onClick={startEdit} style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${p}40`, background: 'white', color: p, cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: theme.fontFamily }}>✏️ {tRaw('แก้ไข', 'Edit')}</button>
                <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: '7px 14px', borderRadius: 20, border: '1.5px solid #fca5a5', background: 'white', color: '#dc2626', cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: theme.fontFamily }}>🗑️ {tRaw('ลบโพสต์', 'Delete')}</button>
              </div>
            )}

            {editing ? (
              <FullEditForm
                post={post} p={p} theme={theme} tRaw={tRaw} efld={efld}
                eHeader={eHeader} setEHeader={setEHeader}
                eCaption={eCaption} setECaption={setECaption}
                eDetails={eDetails} setEDetails={setEDetails}
                eKeywords={eKeywords} setEKeywords={setEKeywords}
                ePalettes={ePalettes} setEPalettes={setEPalettes}
                eBookMode={eBookMode} setEBookMode={setEBookMode}
                eSelProduct={eSelProduct} setESelProduct={setESelProduct}
                eProdQuery={eProdQuery} setEProdQuery={setEProdQuery}
                eProdResults={eProdResults}
                eExtTitle={eExtTitle} setEExtTitle={setEExtTitle}
                eExtAuthor={eExtAuthor} setEExtAuthor={setEExtAuthor}
                eTools={eTools} setETools={setETools} isCreator={!!c?.affiliate_enabled}
                savingEdit={savingEdit} onSave={saveEdit} onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                {/* 1. Header + Caption box */}
                {(post.post_header || post.caption) && (
                  <div style={{ background: 'white', borderLeft: `4px solid ${p}`, borderRadius: '0 14px 14px 0', padding: '14px 18px', marginBottom: 14 }}>
                    {post.post_header && <p style={{ fontSize: 21, fontWeight: 900, color: p, margin: '0 0 6px', lineHeight: 1.3 }}>{post.post_header}</p>}
                    {post.caption && <p style={{ fontSize: 16, color: '#334155', lineHeight: 1.7, margin: 0, fontWeight: 400 }}>{post.caption}</p>}
                  </div>
                )}

                {/* 2. Book used box */}
                <div style={{ background: 'white', border: '1.5px solid #f1f5f9', borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#94a3b8', marginBottom: 8 }}>📚 {tRaw('หนังสือที่ใช้', 'Book used')}</div>
                  {post.product ? (
                    <button onClick={() => navigate(`/products/${post.product.slug}${c?.affiliate_enabled ? `?ref=${c.id}` : ''}`)} style={{ background: p + '12', color: p, border: 'none', cursor: 'pointer', borderRadius: 12, padding: '8px 14px', fontSize: 15, fontWeight: 800, fontFamily: theme.fontFamily }}>📚 {post.product.title} →</button>
                  ) : (post.external_book?.title || post.external_book_title) ? (
                    <div style={{ fontSize: 16, color: '#475569', fontWeight: 600 }}>📖 {post.external_book?.title || post.external_book_title}{(post.external_book?.author || post.external_book_author) ? <span style={{ fontWeight: 400 }}> by {post.external_book?.author || post.external_book_author}</span> : ''}</div>
                  ) : <div style={{ fontSize: 15, color: '#cbd5e1' }}>—</div>}
                </div>

                {/* 3. Coloring details box — structured medium — brand pairs */}
                {(() => {
                  const pairs = Array.isArray(post.coloring_details) ? post.coloring_details.filter((d: any) => d && d.medium) : [];
                  const hasAny = pairs.length || post.mediums?.length || post.markers?.length || post.palettes?.length;
                  if (!hasAny) return null;
                  return (
                    <div style={{ background: 'white', border: '1.5px solid #f1f5f9', borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#94a3b8', marginBottom: 8 }}>🎨 {tRaw('รายละเอียดการลงสี', 'Coloring details')}</div>
                      {pairs.length ? (
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 16, color: '#334155', lineHeight: 1.85 }}>
                          {pairs.map((d: any, i: number) => <li key={i}><b>{d.medium}</b>{d.brand ? ` — ${d.brand}` : <span style={{ color: '#94a3b8' }}> — {tRaw('ไม่ระบุยี่ห้อ', 'unknown brand')}</span>}</li>)}
                        </ul>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {post.mediums?.length > 0 && <div style={{ fontSize: 15.5, color: '#334155' }}><span style={{ color: '#7c3aed', fontWeight: 700 }}>🎨 {tRaw('เทคนิค', 'Mediums')}:</span> {post.mediums.join(', ')}</div>}
                          {post.markers?.length > 0 && <div style={{ fontSize: 15.5, color: '#334155' }}><span style={{ color: '#1d4ed8', fontWeight: 700 }}>🖍️ {tRaw('ปากกา/ชุดสี', 'Markers / sets')}:</span> {post.markers.join(', ')}</div>}
                        </div>
                      )}
                      {post.palettes?.length > 0 && <div style={{ fontSize: 15.5, color: '#334155', marginTop: pairs.length ? 8 : 0 }}><span style={{ color: '#be185d', fontWeight: 700 }}>🌷 {tRaw('พาเลตต์', 'Palettes')}:</span> {post.palettes.join(', ')}</div>}
                    </div>
                  );
                })()}

                {/* 4. Creator recommendations box — Fluffy Creator picks (detail page only) */}
                {post.recommended_tools?.length > 0 && (
                  <div style={{ background: p + '08', border: `1.5px solid ${p}20`, borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: p, marginBottom: 8 }}>🖍 {tRaw('เครื่องมือที่ครีเอเตอร์แนะนำ', 'Creator recommendations')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {post.recommended_tools.map((t: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{t.name}</span>
                          {t.url && <a href={t.url} target="_blank" rel="noopener noreferrer sponsored" style={{ fontSize: 15, fontWeight: 800, color: p, textDecoration: 'none', whiteSpace: 'nowrap' }}>{tRaw('ดูลิงก์', 'View link')} →</a>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Reactions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 14, borderTop: '1px solid #eef2f7' }}>
              {REACTIONS.map(r => {
                const on = mine.includes(r.type);
                const n = counts[r.type] || 0;
                return (
                  <button key={r.type} onClick={() => react(r.type)} title={tRaw(r.th, r.en)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 20, border: `1.5px solid ${on ? p : '#eef2f7'}`, background: on ? p + '12' : 'white', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: on ? p : '#64748b', fontFamily: theme.fontFamily }}>
                    <span>{r.emoji}</span><span style={{ fontSize: 13 }}>{lang === 'th' ? r.th : r.en}</span>{n > 0 && <span style={{ fontSize: 13 }}>· {n}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* You may also like — horizontal carousel, no wrapping */}
        {related.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: theme.textColor, marginBottom: 14 }}>✨ {tRaw('คุณอาจชอบสิ่งนี้', 'You may also like')}</h2>
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, scrollSnapType: 'x mandatory' }}>
              {related.map((rp: any) => (
                <div key={rp.id} style={{ width: 180, flexShrink: 0, scrollSnapAlign: 'start' }}>
                  <CommunityCard post={rp} compact />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div style={{ marginTop: 36, maxWidth: 680 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: theme.textColor, marginBottom: 14 }}>💬 {tRaw('ความคิดเห็น', 'Comments')} ({comments.length})</h2>
          {user ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <input value={commentBody} maxLength={500} onChange={e => setCommentBody(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
                placeholder={tRaw('เขียนความคิดเห็น...', 'Write a comment...')} style={{ flex: 1, padding: '11px 14px', borderRadius: 14, border: `1.5px solid ${p}30`, fontSize: 16, outline: 'none', fontFamily: theme.fontFamily }} />
              <button onClick={submitComment} disabled={commenting || !commentBody.trim()} style={{ padding: '0 20px', borderRadius: 14, border: 'none', background: commenting || !commentBody.trim() ? '#e2e8f0' : p, color: commenting || !commentBody.trim() ? '#94a3b8' : 'white', cursor: 'pointer', fontSize: 16, fontWeight: 800, fontFamily: theme.fontFamily }}>{tRaw('ส่ง', 'Post')}</button>
            </div>
          ) : (
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: `1.5px solid ${p}40`, color: p, cursor: 'pointer', padding: '10px 18px', borderRadius: 14, fontSize: 15, fontWeight: 700, marginBottom: 18, fontFamily: theme.fontFamily }}>
              {tRaw('เข้าสู่ระบบเพื่อแสดงความคิดเห็น', 'Log in to comment')}
            </button>
          )}
          {comments.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 16 }}>{tRaw('ยังไม่มีความคิดเห็น เป็นคนแรกสิ!', 'No comments yet — be the first!')}</div>
          ) : comments.map(cm => {
            return (
              <div key={cm.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', background: p + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {isImageUrl(cm.author?.avatar_url) ? <img src={cm.author.avatar_url} alt="" loading="lazy" decoding="async" width={34} height={34} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : cm.author?.avatar_url ? <span style={{ fontSize: 16 }}>{cm.author.avatar_url}</span> : <BadgeIcon affiliate={cm.author?.affiliate_enabled} size={16} />}
                </span>
                <div style={{ background: 'white', borderRadius: 14, padding: '10px 14px', flex: 1, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}><BadgeIcon affiliate={cm.author?.affiliate_enabled} size={14} /> {cm.author?.name || 'Community Member'}</div>
                  <div style={{ fontSize: 16, color: '#334155', lineHeight: 1.55 }}>{cm.body}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <button onClick={() => setLightbox(false)} style={{ position: 'fixed', top: 16, right: 16, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 22, fontWeight: 700, zIndex: 1001 }}>✕</button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '90%', width: 700 }}>
            <ImageCarousel images={images} fit="contain" rounded={8} />
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: '#1e293b', margin: '0 0 8px' }}>{tRaw('ลบโพสต์นี้?', 'Delete this post?')}</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>{tRaw('การดำเนินการนี้ไม่สามารถย้อนกลับได้', 'This action cannot be undone.')}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '10px 22px', borderRadius: 20, border: '1.5px solid #e5e7eb', background: 'white', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: theme.fontFamily }}>{tRaw('ยกเลิก', 'Cancel')}</button>
              <button onClick={deletePost} disabled={deleting} style={{ padding: '10px 22px', borderRadius: 20, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 800, fontFamily: theme.fontFamily }}>{deleting ? '...' : tRaw('ลบโพสต์', 'Delete post')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Full edit form ─────────────────────────────────────────────────────────────
function FullEditForm({ post, p, theme, tRaw, efld, eHeader, setEHeader, eCaption, setECaption, eDetails, setEDetails, eKeywords, setEKeywords, ePalettes, setEPalettes, eBookMode, setEBookMode, eSelProduct, setESelProduct, eProdQuery, setEProdQuery, eProdResults, eExtTitle, setEExtTitle, eExtAuthor, setEExtAuthor, eTools, setETools, isCreator, savingEdit, onSave, onCancel }: any) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16, marginBottom: 18, border: `1.5px solid ${p}20` }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>✏️ {tRaw('แก้ไขโพสต์', 'Edit post')}</div>

      {/* Book */}
      <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 6 }}>📚 {tRaw('หนังสือที่ใช้', 'Book used')}</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {(['product', 'external', 'none'] as const).map(m => (
          <button key={m} onClick={() => setEBookMode(m)} style={{ flex: 1, padding: '6px', borderRadius: 9, border: `1.5px solid ${eBookMode === m ? p : '#e5e7eb'}`, background: eBookMode === m ? p + '12' : 'white', color: eBookMode === m ? p : '#64748b', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: theme.fontFamily }}>
            {m === 'product' ? 'Fluffy Pub' : m === 'external' ? tRaw('ภายนอก', 'External') : tRaw('ไม่ระบุ', 'None')}
          </button>
        ))}
      </div>
      {eBookMode === 'product' && (
        <div style={{ marginBottom: 10 }}>
          {eSelProduct ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: p + '10', borderRadius: 10, padding: '8px 12px' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: p, flex: 1 }}>📚 {eSelProduct.title}</span>
              <button onClick={() => { setESelProduct(null); setEProdQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 13, fontWeight: 700 }}>✕</button>
            </div>
          ) : (
            <>
              <input value={eProdQuery} onChange={e => setEProdQuery(e.target.value)} placeholder={tRaw('ค้นหาหนังสือ...', 'Search books...')} style={efld} />
              {eProdResults.map((pr: any) => (
                <button key={pr.id} onClick={() => { setESelProduct(pr); setEProdQuery(''); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'white', border: '1px solid #f1f5f9', cursor: 'pointer', padding: '8px 12px', fontSize: 13, fontFamily: theme.fontFamily, color: '#1e293b' }}>{pr.title}</button>
              ))}
            </>
          )}
        </div>
      )}
      {eBookMode === 'external' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <input value={eExtTitle} onChange={e => setEExtTitle(e.target.value)} placeholder={tRaw('ชื่อหนังสือ', 'Book title')} style={efld} />
          <input value={eExtAuthor} onChange={e => setEExtAuthor(e.target.value)} placeholder={tRaw('ศิลปิน/สำนักพิมพ์', 'Author')} style={efld} />
        </div>
      )}

      <StructuredMediumBlock details={eDetails} setDetails={setEDetails} theme={theme} p={p} fld={efld} tRaw={tRaw} />
      <TagEditBlock label={`🌷 ${tRaw('พาเลตต์ที่ใช้', 'Palette')}`} type="palette" values={ePalettes} setValues={setEPalettes} theme={theme} p={p} efld={efld} tRaw={tRaw} />
      <KeywordsBlock keywords={eKeywords} setKeywords={setEKeywords} theme={theme} p={p} fld={efld} tRaw={tRaw} />

      {isCreator && <RecommendedToolsBlock tools={eTools} setTools={setETools} theme={theme} p={p} fld={efld} tRaw={tRaw} />}

      <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', margin: '4px 0 4px' }}>✍️ {tRaw('หัวข้อ', 'Header')} <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 11 }}>{tRaw('(ไม่บังคับ)', '(optional)')}</span></div>
      <input value={eHeader || ''} maxLength={100} onChange={e => setEHeader(e.target.value)} placeholder={tRaw('ชื่อผลงาน', 'Post title')} style={{ ...efld, fontWeight: 700, marginBottom: 8 }} />
      <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', margin: '4px 0 4px' }}>✏️ {tRaw('คำบรรยาย', 'Caption')} <span style={{ fontWeight: 500, color: '#9ca3af' }}>({eCaption.length}/300)</span></div>
      <textarea value={eCaption} maxLength={300} onChange={e => setECaption(e.target.value)} rows={3} style={{ ...efld, resize: 'vertical', marginBottom: 12 }} />

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onSave} disabled={savingEdit} style={{ padding: '9px 20px', borderRadius: 12, border: 'none', background: savingEdit ? p + '88' : p, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 800, fontFamily: theme.fontFamily }}>{savingEdit ? tRaw('กำลังบันทึก...', 'Saving...') : tRaw('บันทึก', 'Save')}</button>
        <button onClick={onCancel} style={{ padding: '9px 20px', borderRadius: 12, border: '1.5px solid #e5e7eb', background: 'white', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: theme.fontFamily }}>{tRaw('ยกเลิก', 'Cancel')}</button>
      </div>
    </div>
  );
}

// Tag chip selector for edit form — mirrors LibraryTagBlock in CommunityPage
function TagEditBlock({ label, type, values, setValues, theme, p, efld, tRaw }: any) {
  const [approved, setApproved] = useState<string[]>([]);
  const [custom, setCustom] = useState('');

  useEffect(() => {
    api.getCommunityTags(type).then((d: any) => setApproved((d?.tags || []).map((t: any) => t.name))).catch(() => {});
  }, [type]);

  const toggle = (v: string) => setValues((prev: string[]) => prev.includes(v) ? prev.filter((x: string) => x !== v) : [...prev, v]);
  const addCustom = () => {
    const v = custom.trim();
    if (!v) return;
    if (!values.includes(v)) setValues((prev: string[]) => [...prev, v]);
    api.submitCommunityTag(type, v).catch(() => {});
    setCustom('');
  };

  const defaults = DEFAULT_TAGS[type] || [];
  const dbExtra = approved.filter(a => !defaults.includes(a));
  const known = [...defaults, ...dbExtra];
  const all = [...known, ...values.filter((v: string) => !known.includes(v))];

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 5 }}>
        {all.map((o: string) => {
          const on = values.includes(o);
          return (
            <button key={o} onClick={() => toggle(o)} style={{ padding: '4px 10px', borderRadius: 16, border: `1.5px solid ${on ? p : '#e5e7eb'}`, background: on ? p + '15' : 'white', color: on ? p : '#64748b', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, fontFamily: theme.fontFamily }}>
              {o}{on ? ' ✓' : ''}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} placeholder={tRaw('เพิ่มเอง...', 'Add custom...')} style={{ ...efld, fontSize: 12, padding: '7px 10px' }} />
        <button onClick={addCustom} style={{ padding: '0 12px', borderRadius: 9, border: 'none', background: p, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: theme.fontFamily }}>+</button>
      </div>
    </div>
  );
}

// ── Share button — exports artwork with watermark for sharing ──────────────────
function ShareButton({ post, p, theme, tRaw }: any) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const postUrl = `${window.location.origin}${window.location.pathname}#/community/${post.id}`;
  const title = post.caption || (post.product?.title ? `Coloring: ${post.product.title}` : 'Coloring inspiration from Fluffy Pub');

  const copyLink = async () => {
    await navigator.clipboard.writeText(postUrl).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  };

  // Build a watermarked image in a canvas and return a blob URL
  const buildWatermarkedBlob = (): Promise<string> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const W = img.naturalWidth, H = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      // Watermark: bottom-right, semi-transparent
      const fontSize = Math.max(14, Math.round(W / 40));
      ctx.font = `bold ${fontSize}px sans-serif`;
      const text = 'Fluffy Pub  /  fluffypub.com';
      const tw = ctx.measureText(text).width;
      const pad = fontSize * 0.8;
      const bx = W - tw - pad * 2, by = H - fontSize - pad * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(bx - pad * 0.5, by - pad * 0.5, tw + pad, fontSize + pad);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(text, bx, by + fontSize * 0.85);
      canvas.toBlob(blob => blob ? resolve(URL.createObjectURL(blob)) : reject(), 'image/jpeg', 0.92);
    };
    img.onerror = reject;
    img.src = post.artwork_url;
  });

  const nativeShare = async () => {
    if (navigator.share) {
      setExporting(true);
      try {
        const blobUrl = await buildWatermarkedBlob();
        const res = await fetch(blobUrl);
        const blob = await res.blob();
        const file = new File([blob], 'artwork-fluffy-pub.jpg', { type: 'image/jpeg' });
        URL.revokeObjectURL(blobUrl);
        await navigator.share({ title, text: title, url: postUrl, files: [file] }).catch(() => {
          // files not supported — fall back to URL-only share
          navigator.share({ title, text: title, url: postUrl }).catch(() => {});
        });
      } catch { navigator.share({ title, url: postUrl }).catch(() => {}); }
      setExporting(false);
    } else {
      setOpen(o => !o);
    }
  };

  const downloadWatermarked = async () => {
    setExporting(true);
    setOpen(false);
    try {
      const blobUrl = await buildWatermarkedBlob();
      const a = document.createElement('a');
      a.href = blobUrl; a.download = 'artwork-fluffy-pub.jpg'; a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    } catch { /* ignore */ }
    setExporting(false);
  };

  const enc = encodeURIComponent;
  const img = post.artwork_url;
  const socials = [
    { label: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${enc(postUrl)}`, color: '#1877f2' },
    { label: 'Pinterest', url: `https://pinterest.com/pin/create/button/?url=${enc(postUrl)}&media=${enc(img)}&description=${enc(title)}`, color: '#e60023' },
    { label: 'X / Twitter', url: `https://twitter.com/intent/tweet?url=${enc(postUrl)}&text=${enc(title)}`, color: '#000' },
  ];

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={nativeShare} disabled={exporting} style={{ padding: '7px 12px', borderRadius: 20, border: `1.5px solid #e5e7eb`, background: 'white', color: '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 800, fontFamily: theme.fontFamily }}>
        {exporting ? '⏳' : `📤 ${tRaw('แชร์', 'Share')}`}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 190, overflow: 'hidden' }}>
          <button onClick={downloadWatermarked} style={{ display: 'block', width: '100%', padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#374151', background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', textAlign: 'left', fontFamily: theme.fontFamily }}>
            🖼️ {tRaw('ดาวน์โหลดรูปพร้อมลายน้ำ', 'Download with watermark')}
          </button>
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
