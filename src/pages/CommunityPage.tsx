import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';
import { makeImageVariants } from '../lib/imageThumb';
import CommunityCard from '../components/CommunityCard';

const PAGE = 16;
const GRID = `.cm-grid{column-count:4;column-gap:16px}@media(max-width:1200px){.cm-grid{column-count:3}}@media(max-width:820px){.cm-grid{column-count:2;column-gap:12px}}@media(max-width:480px){.cm-grid{column-count:1}}.cm-grid>div{margin-bottom:16px}`;

type Filter = { kind: 'all' | 'palette' | 'marker' | 'month' | 'product'; value?: string; label?: string };

function initialFilter(): Filter {
  const hash = window.location.hash || '';
  const qi = hash.indexOf('?');
  if (qi >= 0) {
    const book = new URLSearchParams(hash.slice(qi + 1)).get('book');
    if (book) return { kind: 'product', value: book };
  }
  return { kind: 'all' };
}

export default function CommunityPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { user } = useAuth();
  const { tRaw } = useLang();
  const p = theme.primaryColor;

  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [cozy, setCozy] = useState<any[]>([]);
  const [curation, setCuration] = useState<{ featured_books: any[]; featured_creators: any[] }>({ featured_books: [], featured_creators: [] });
  const [facets, setFacets] = useState<{ palettes: any[]; markers: any[]; books: any[] }>({ palettes: [], markers: [], books: [] });
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCommunityCozyPicks().then((d: any) => setCozy(d?.posts || [])).catch(() => {});
    api.getCommunityCuration().then((d: any) => setCuration({ featured_books: d?.featured_books || [], featured_creators: d?.featured_creators || [] })).catch(() => {});
    api.getCommunityFacets().then((d: any) => setFacets({ palettes: d?.palettes || [], markers: d?.markers || [], books: d?.books || [] })).catch(() => {});
  }, []);

  const loadPage = useCallback((pg: number, f: Filter) => {
    setLoading(true);
    const opts: any = { page: pg, limit: PAGE };
    if (f.kind === 'palette') opts.palette = f.value;
    if (f.kind === 'marker') opts.marker = f.value;
    if (f.kind === 'month') opts.month = f.value;
    if (f.kind === 'product') opts.product_id = f.value;
    api.getCommunityPosts(opts).then((d: any) => {
      const list = d?.posts || [];
      setPosts(prev => pg === 0 ? list : [...prev, ...list]);
      setHasMore(!!d?.hasMore);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { setPage(0); loadPage(0, filter); }, [filter, loadPage]);

  const onPosted = (post: any) => { setShowForm(false); setPosts(prev => [post, ...prev]); };
  const isAll = filter.kind === 'all';
  const choose = (f: Filter) => { setFilter(f); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{GRID}</style>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 16px 60px' }}>

        {/* Header — centered */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, color: theme.textColor, margin: '0 0 4px' }}>{tRaw('แบ่งปันโลกสีสันของคุณ', 'Share Your Colorful World')} 🌈</h1>
          <p style={{ color: theme.textColor + '88', fontSize: 13, margin: '0 0 14px' }}>{tRaw('แรงบันดาลใจการระบายสีจากชุมชน', 'Coloring inspiration from the community')}</p>
          {user ? (
            <button onClick={() => setShowForm(s => !s)} style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '9px 22px', borderRadius: 22, fontSize: 13.5, fontWeight: 800, fontFamily: theme.fontFamily }}>
              {showForm ? tRaw('ปิด', 'Close') : `🎨 ${tRaw('แบ่งปันผลงาน', 'Share artwork')}`}
            </button>
          ) : (
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: `1.5px solid ${p}40`, color: p, cursor: 'pointer', padding: '8px 20px', borderRadius: 22, fontSize: 13, fontWeight: 700, fontFamily: theme.fontFamily }}>
              {tRaw('เข้าสู่ระบบเพื่อแบ่งปัน', 'Log in to share')}
            </button>
          )}
        </div>

        {showForm && user && <UploadForm theme={theme} p={p} tRaw={tRaw} onPosted={onPosted} />}

        {/* 1. New Creations */}
        <SectionHead theme={theme} title={
          isAll ? `🆕 ${tRaw('ผลงานใหม่ล่าสุด', 'New Creations')}`
            : filter.kind === 'palette' ? `🌷 ${filter.value}`
            : filter.kind === 'marker' ? `🖍️ ${filter.value}`
            : filter.kind === 'product' ? `📚 ${filter.label || tRaw('จากเล่มนี้', 'This book')}`
            : `📅 ${filter.value}`
        } onClear={!isAll ? () => setFilter({ kind: 'all' }) : undefined} clearLabel={tRaw('ล้าง', 'Clear')} />

        {!loading && posts.length === 0 ? (
          <Empty theme={theme} tRaw={tRaw} isAll={isAll} />
        ) : (
          <>
            <div className="cm-grid">{posts.map(post => <CommunityCard key={post.id} post={post} />)}</div>
            {loading && <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 26 }}>⏳</div>}
            {hasMore && !loading && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button onClick={() => { const np = page + 1; setPage(np); loadPage(np, filter); }} style={{ background: 'transparent', border: `2px solid ${p}`, color: p, cursor: 'pointer', padding: '10px 28px', borderRadius: 22, fontSize: 13.5, fontWeight: 800, fontFamily: theme.fontFamily }}>{tRaw('ดูเพิ่มเติม', 'View more')}</button>
              </div>
            )}
          </>
        )}

        {/* 2. Cozy Picks (admin-pinned, manual) */}
        {isAll && cozy.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <SectionHead theme={theme} title={`🌷 ${tRaw('คัดสรรโดยทีม', 'Cozy Picks')}`} />
            <div className="cm-grid">{cozy.map(post => <CommunityCard key={'c' + post.id} post={post} />)}</div>
          </div>
        )}

        {/* 3. Featured Books (curated by admin) */}
        {isAll && curation.featured_books.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <SectionHead theme={theme} title={`📚 ${tRaw('หนังสือแนะนำ', 'Featured Books')}`} />
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {curation.featured_books.map((bk: any) => (
                <button key={bk.id} onClick={() => navigate(`/products/${bk.slug}`)}
                  style={{ background: 'white', border: `1.5px solid ${p}15`, borderRadius: 14, padding: '10px', cursor: 'pointer', minWidth: 120, maxWidth: 140, textAlign: 'center', fontFamily: theme.fontFamily, flexShrink: 0 }}>
                  <div style={{ width: 100, height: 130, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', margin: '0 auto 8px' }}>
                    <img src={bk.cover_image_url || bk.image} alt={bk.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1e293b', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{bk.title}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Discover by Book / Palette / Marker (chip rows) */}
        {isAll && (facets.books.length || facets.palettes.length || facets.markers.length) ? (
          <div style={{ marginTop: 36 }}>
            {facets.books.length > 0 && <ChipRow theme={theme} p={p} title={`📚 ${tRaw('ตามหนังสือ', 'By Book')}`} items={facets.books.map(b => ({ key: b.id, label: b.title, count: b.count }))} onPick={(it) => choose({ kind: 'product', value: it.key, label: it.label })} />}
            {facets.palettes.length > 0 && <ChipRow theme={theme} p={p} title={`🎨 ${tRaw('ตามพาเลตต์', 'By Palette')}`} items={facets.palettes.map(t => ({ key: t.name, label: t.name, count: t.count }))} onPick={(it) => choose({ kind: 'palette', value: it.key })} />}
            {facets.markers.length > 0 && <ChipRow theme={theme} p={p} title={`🖍️ ${tRaw('ตามชุดปากกา', 'By Marker')}`} items={facets.markers.map(t => ({ key: t.name, label: t.name, count: t.count }))} onPick={(it) => choose({ kind: 'marker', value: it.key })} />}
          </div>
        ) : null}

        {/* 5. Featured Creators (admin-curated) */}
        {isAll && curation.featured_creators.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <SectionHead theme={theme} title={`🌷 ${tRaw('ครีเอเตอร์แนะนำ', 'Featured Creators')}`} />
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
              {curation.featured_creators.map((c: any) => (
                <button key={c.id} onClick={() => navigate(`/creator/${c.id}`)}
                  style={{ background: 'white', border: `1.5px solid ${p}15`, borderRadius: 16, padding: '16px 14px', cursor: 'pointer', minWidth: 130, textAlign: 'center', fontFamily: theme.fontFamily, flexShrink: 0 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: p + '20', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                    {c.avatar_url ? <img src={c.avatar_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (c.affiliate_enabled ? '🌷' : '👤')}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>{c.affiliate_enabled ? '🌷' : '👤'} {c.name}</div>
                  {c.community_country && <div style={{ fontSize: 10.5, color: '#94a3b8' }}>📍 {c.community_country}</div>}
                  {c.community_favorite_medium && <div style={{ fontSize: 10.5, color: '#94a3b8' }}>🎨 {c.community_favorite_medium}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function SectionHead({ theme, title, onClear, clearLabel }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 14px' }}>
      <h2 style={{ fontSize: 18, fontWeight: 900, color: theme.textColor, margin: 0 }}>{title}</h2>
      {onClear && <button onClick={onClear} style={{ fontSize: 12, fontWeight: 700, color: theme.primaryColor, background: 'none', border: 'none', cursor: 'pointer' }}>✕ {clearLabel}</button>}
    </div>
  );
}

function ChipRow({ theme, p, title, items, onPick }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: theme.textColor, marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((it: any) => (
          <button key={it.key} onClick={() => onPick(it)} style={{ padding: '6px 12px', borderRadius: 18, border: `1.5px solid ${p}30`, background: 'white', color: theme.textColor, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: theme.fontFamily, whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label} <span style={{ color: '#9ca3af' }}>({it.count})</span></button>
        ))}
      </div>
    </div>
  );
}

function Empty({ theme, tRaw, isAll }: any) {
  return (
    <div style={{ textAlign: 'center', padding: '50px 24px', color: theme.textColor + '88' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>🎨</div>
      <h3 style={{ fontWeight: 800, color: theme.textColor }}>{tRaw('ยังไม่มีผลงาน', 'No creations yet')}</h3>
      <p>{isAll ? tRaw('เป็นคนแรกที่แบ่งปันผลงานระบายสีของคุณ!', 'Be the first to share your colored page!') : tRaw('ลองเลือกตัวกรองอื่น', 'Try another filter.')}</p>
    </div>
  );
}

// ── Crop Modal ────────────────────────────────────────────────────────────────
const CROP_SZ = 320;

function CropModal({ file, theme, p, tRaw, onCrop, onCancel }: {
  file: File; theme: any; p: string; tRaw: any;
  onCrop: (f: File) => void; onCancel: () => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [box, setBox] = useState({ x: 20, y: 20, size: CROP_SZ - 40 });
  const dragging = useRef<{ mode: 'move' | 'resize'; mx: number; my: number; bx: number; by: number; bs: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      const s = CROP_SZ * 0.82;
      setBox({ x: (CROP_SZ - s) / 2, y: (CROP_SZ - s) / 2, size: s });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const onDown = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = { mode, mx: e.clientX, my: e.clientY, bx: box.x, by: box.y, bs: box.size };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = dragging.current;
    if (!d) return;
    const dx = e.clientX - d.mx, dy = e.clientY - d.my;
    if (d.mode === 'move') {
      setBox(b => ({ ...b, x: clamp(d.bx + dx, 0, CROP_SZ - b.size), y: clamp(d.by + dy, 0, CROP_SZ - b.size) }));
    } else {
      const ns = clamp(d.bs + Math.max(dx, dy), 40, CROP_SZ - Math.max(d.bx, d.by));
      setBox(b => ({ ...b, size: ns }));
    }
  };

  const confirm = () => {
    if (!img) return;
    const scale = Math.max(CROP_SZ / img.naturalWidth, CROP_SZ / img.naturalHeight);
    const rw = img.naturalWidth * scale, rh = img.naturalHeight * scale;
    const ox = (CROP_SZ - rw) / 2, oy = (CROP_SZ - rh) / 2;
    const sx = (box.x - ox) / scale, sy = (box.y - oy) / scale;
    const sw = box.size / scale;
    const off = document.createElement('canvas');
    off.width = Math.round(sw); off.height = Math.round(sw);
    off.getContext('2d')!.drawImage(img, sx, sy, sw, sw, 0, 0, off.width, off.height);
    off.toBlob(blob => { if (blob) onCrop(new File([blob], file.name, { type: 'image/jpeg' })); }, 'image/jpeg', 0.92);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ color: 'white', fontWeight: 800, fontSize: 15, fontFamily: theme.fontFamily }}>✂️ {tRaw('ปรับตัดรูป', 'Crop artwork')}</div>
      <div style={{ position: 'relative', width: CROP_SZ, height: CROP_SZ, background: '#111', overflow: 'hidden', borderRadius: 12, userSelect: 'none' }}
        onPointerMove={onMove} onPointerUp={() => { dragging.current = null; }}>
        {img && <img src={img.src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <defs><mask id="cm-hole"><rect width={CROP_SZ} height={CROP_SZ} fill="white" /><rect x={box.x} y={box.y} width={box.size} height={box.size} fill="black" /></mask></defs>
          <rect width={CROP_SZ} height={CROP_SZ} fill="rgba(0,0,0,0.55)" mask="url(#cm-hole)" />
          <rect x={box.x} y={box.y} width={box.size} height={box.size} fill="none" stroke="white" strokeWidth={2} strokeDasharray="6 3" />
          {([[box.x,box.y],[box.x+box.size-14,box.y],[box.x,box.y+box.size-14],[box.x+box.size-14,box.y+box.size-14]] as [number,number][]).map(([cx,cy],i) => (
            <rect key={i} x={cx} y={cy} width={14} height={14} fill="none" stroke="white" strokeWidth={3} />
          ))}
        </svg>
        <div onPointerDown={e => onDown(e, 'move')} style={{ position: 'absolute', left: box.x + 2, top: box.y + 2, width: box.size - 20, height: box.size - 20, cursor: 'move' }} />
        <div onPointerDown={e => onDown(e, 'resize')} style={{ position: 'absolute', left: box.x + box.size - 18, top: box.y + box.size - 18, width: 18, height: 18, background: p, borderRadius: 4, cursor: 'se-resize', opacity: 0.9 }} />
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: theme.fontFamily }}>{tRaw('ลากเพื่อย้าย · ลากมุมขวาล่างเพื่อปรับขนาด', 'Drag to move · drag corner to resize')}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{ padding: '10px 22px', borderRadius: 22, border: '2px solid rgba(255,255,255,0.5)', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 700, fontFamily: theme.fontFamily }}>{tRaw('ยกเลิก', 'Cancel')}</button>
        <button onClick={confirm} style={{ padding: '10px 24px', borderRadius: 22, border: 'none', background: p, color: 'white', cursor: 'pointer', fontWeight: 800, fontFamily: theme.fontFamily }}>✂️ {tRaw('ตัดรูป', 'Crop & use')}</button>
      </div>
    </div>
  );
}

// ── Upload form ───────────────────────────────────────────────────────────────
function UploadForm({ theme, p, tRaw, onPosted }: any) {
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [bookMode, setBookMode] = useState<'product' | 'external'>('product');
  const [prodQuery, setProdQuery] = useState('');
  const [prodResults, setProdResults] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selProduct, setSelProduct] = useState<any>(null);
  const [extTitle, setExtTitle] = useState('');
  const [extAuthor, setExtAuthor] = useState('');
  const [mediums, setMediums] = useState<string[]>([]);
  const [markers, setMarkers] = useState<string[]>([]);
  const [palettes, setPalettes] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { api.getProducts().then((d: any) => setAllProducts(Array.isArray(d) ? d : [])); }, []);
  useEffect(() => {
    const q = prodQuery.trim().toLowerCase();
    if (!q) { setProdResults([]); return; }
    setProdResults(allProducts.filter(pr => (pr.title || '').toLowerCase().includes(q)).slice(0, 6));
  }, [prodQuery, allProducts]);

  const pickFile = (f: File) => { setFile(f); setPreview(URL.createObjectURL(f)); };
  const fld = { width: '100%', padding: '10px 13px', borderRadius: 10, border: `1.5px solid ${p}30`, fontSize: 14, outline: 'none', fontFamily: theme.fontFamily, boxSizing: 'border-box' as const };

  const submit = async () => {
    setErr('');
    if (!file) { setErr(tRaw('กรุณาเลือกรูปผลงาน', 'Please choose your artwork image.')); return; }
    setBusy(true);
    try {
      const { full, thumb } = await makeImageVariants(file);
      const [up, upT] = await Promise.all([api.uploadFile(full, 'community'), api.uploadFile(thumb, 'community')]);
      if (up?.error) { setErr(up.error); setBusy(false); return; }
      const res = await api.createCommunityPost({
        artwork_url: up.publicUrl, thumb_url: upT?.publicUrl || up.publicUrl,
        product_id: bookMode === 'product' ? (selProduct?.id || null) : null,
        external_book_title: bookMode === 'external' ? extTitle.trim() || null : null,
        external_book_author: bookMode === 'external' ? extAuthor.trim() || null : null,
        mediums, markers, palettes, caption: caption.trim(),
      });
      if (res?.error) { setErr(res.error); setBusy(false); return; }
      onPosted(res);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };

  return (
    <>
    {cropFile && <CropModal file={cropFile} theme={theme} p={p} tRaw={tRaw} onCrop={f => { pickFile(f); setCropFile(null); }} onCancel={() => setCropFile(null)} />}
    <div style={{ background: 'white', borderRadius: 18, padding: 20, boxShadow: '0 2px 14px rgba(0,0,0,0.06)', margin: '0 0 24px', border: `1.5px solid ${p}15` }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>🎨 {tRaw('แบ่งปันผลงานของคุณ', 'Share your artwork')}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 18 }} className="cm-form">
        <style>{`@media(max-width:640px){.cm-form{grid-template-columns:1fr!important}}`}</style>
        {/* Left: artwork upload */}
        <div>
          <label style={{ display: 'block', cursor: 'pointer' }}>
            <div style={{ aspectRatio: '4/5', borderRadius: 14, border: `2px dashed ${p}40`, background: preview ? '#000' : p + '08', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {preview ? <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ color: p, fontWeight: 700, fontSize: 13, textAlign: 'center', padding: 16 }}>🖼️ {tRaw('แตะเพื่ออัปโหลดรูปผลงาน', 'Tap to upload artwork')}</span>}
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ''; }} />
          </label>
          {preview && <button onClick={() => { setFile(null); setPreview(''); }} style={{ marginTop: 6, width: '100%', background: 'none', border: `1px solid #e5e7eb`, borderRadius: 8, padding: '5px', fontSize: 12, color: '#94a3b8', cursor: 'pointer', fontFamily: theme.fontFamily }}>✕ {tRaw('เลือกรูปใหม่', 'Change image')}</button>}
        </div>
        {/* Right: metadata */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 6 }}>📚 {tRaw('หนังสือที่ใช้', 'Book used')}</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {(['product', 'external'] as const).map(m => (
              <button key={m} onClick={() => setBookMode(m)} style={{ flex: 1, padding: '7px', borderRadius: 9, border: `1.5px solid ${bookMode === m ? p : '#e5e7eb'}`, background: bookMode === m ? p + '12' : 'white', color: bookMode === m ? p : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: theme.fontFamily }}>
                {m === 'product' ? tRaw('สินค้า Fluffy Pub', 'Fluffy Pub product') : tRaw('หนังสือภายนอก', 'External book')}
              </button>
            ))}
          </div>
          {bookMode === 'product' ? (
            <div style={{ marginBottom: 12 }}>
              {selProduct ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: p + '10', borderRadius: 10, padding: '8px 12px' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: p, flex: 1 }}>📚 {selProduct.title}</span>
                  <button onClick={() => { setSelProduct(null); setProdQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12, fontWeight: 700 }}>✕</button>
                </div>
              ) : (
                <>
                  <input value={prodQuery} onChange={e => setProdQuery(e.target.value)} placeholder={tRaw('ค้นหาหนังสือ...', 'Search books...')} style={fld} />
                  {prodResults.map(pr => (
                    <button key={pr.id} onClick={() => { setSelProduct(pr); setProdResults([]); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'white', border: '1px solid #f1f5f9', cursor: 'pointer', padding: '8px 12px', fontSize: 13, fontFamily: theme.fontFamily, color: '#1e293b' }}>{pr.title}</button>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <input value={extTitle} onChange={e => setExtTitle(e.target.value)} placeholder={tRaw('ชื่อหนังสือ', 'Book title')} style={fld} />
              <input value={extAuthor} onChange={e => setExtAuthor(e.target.value)} placeholder={tRaw('ศิลปิน/สำนักพิมพ์', 'Artist / Publisher')} style={fld} />
            </div>
          )}

          <LibraryTagBlock type="medium" label={`🎨 ${tRaw('สื่อที่ใช้', 'Medium')}`} values={mediums} setValues={setMediums} addPh={tRaw('เพิ่มสื่อของคุณเอง...', 'Suggest a medium...')} theme={theme} p={p} fld={fld} tRaw={tRaw} />
          <LibraryTagBlock type="marker" label={`🖍️ ${tRaw('ปากกา/ชุดที่ใช้', 'Marker / set used')}`} values={markers} setValues={setMarkers} addPh={tRaw('เพิ่มชุดปากกา...', 'Suggest a marker set...')} theme={theme} p={p} fld={fld} tRaw={tRaw} />
          <LibraryTagBlock type="palette" label={`🌷 ${tRaw('พาเลตต์ที่ใช้', 'Palette used')}`} values={palettes} setValues={setPalettes} addPh={tRaw('เพิ่มพาเลตต์...', 'Suggest a palette...')} theme={theme} p={p} fld={fld} tRaw={tRaw} />

          <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', margin: '4px 0 6px' }}>✏️ {tRaw('คำบรรยาย', 'Caption')} <span style={{ color: '#9ca3af', fontWeight: 500 }}>({caption.length}/300)</span></div>
          <textarea value={caption} maxLength={300} onChange={e => setCaption(e.target.value)} rows={2} placeholder={tRaw('เล่าเกี่ยวกับผลงานชิ้นนี้...', 'Tell us about this piece...')} style={{ ...fld, resize: 'vertical' }} />

          {err && <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '8px 12px', marginTop: 10, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>⚠️ {err}</div>}
          <button onClick={submit} disabled={busy} style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 12, border: 'none', cursor: busy ? 'wait' : 'pointer', background: busy ? p + '88' : p, color: 'white', fontSize: 14, fontWeight: 800, fontFamily: theme.fontFamily }}>
            {busy ? tRaw('กำลังโพสต์...', 'Posting...') : `🌈 ${tRaw('แบ่งปัน', 'Share')}`}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// Tag block backed by the Tag Library — shows approved tags as chips.
// Typing a custom name and pressing + submits it as a pending tag suggestion.
function LibraryTagBlock({ type, label, values, setValues, addPh, theme, p, fld, tRaw }: any) {
  const [approved, setApproved] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getCommunityTags(type).then((d: any) => setApproved((d?.tags || []).map((t: any) => t.name))).catch(() => {});
  }, [type]);

  const toggle = (v: string) => setValues((prev: string[]) => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const submit = async () => {
    const v = custom.trim();
    if (!v) return;
    if (!values.includes(v)) setValues((prev: string[]) => [...prev, v]);
    setSubmitting(true);
    await api.submitCommunityTag(type, v).catch(() => {});
    setSubmitting(false);
    setCustom('');
  };

  const allOptions = [...approved, ...values.filter((v: string) => !approved.includes(v))];

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        {allOptions.map((o: string) => {
          const on = values.includes(o);
          const isPending = !approved.includes(o);
          return (
            <button key={o} onClick={() => toggle(o)} style={{ padding: '5px 11px', borderRadius: 18, border: `1.5px solid ${on ? p : '#e5e7eb'}`, background: on ? p + '15' : 'white', color: on ? p : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: theme.fontFamily }}>
              {o}{isPending && on ? ' ⏳' : on ? ' ✓' : ''}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} placeholder={addPh} style={{ ...fld, flex: 1, fontSize: 13 }} />
        <button onClick={submit} disabled={submitting} style={{ padding: '0 14px', borderRadius: 10, border: 'none', background: p, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: theme.fontFamily }}>+</button>
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{tRaw('ถ้าไม่พบรายการที่ต้องการ สามารถพิมพ์เพิ่มเองได้ (รอการอนุมัติจากแอดมิน)', 'Suggest new items — they will be reviewed before appearing for others')}</div>
    </div>
  );
}
