import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { isImageUrl } from '../lib/avatar';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';
import { makeImageVariants } from '../lib/imageThumb';
import CommunityCard from '../components/CommunityCard';

const PAGE = 20;
const GRID = [
  `.cm-grid{column-count:4;column-gap:16px}`,
  `@media(min-width:1600px){.cm-grid{column-count:5}}`,
  `@media(min-width:1400px) and (max-width:1599px){.cm-grid{column-count:4}}`,
  `@media(min-width:1000px) and (max-width:1399px){.cm-grid{column-count:3}}`,
  `@media(min-width:768px) and (max-width:999px){.cm-grid{column-count:2;column-gap:12px}}`,
  `@media(max-width:767px){.cm-grid{column-count:1}}`,
  `.cm-grid>div{margin-bottom:16px}`,
  // Cozy Picks row: centered when it fits, always horizontally swipeable (esp. mobile)
  `.cozy-row{display:flex;gap:14px;padding-bottom:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;justify-content:center}`,
  `.cozy-row.many{justify-content:flex-start}`,
  `@media(max-width:760px){.cozy-row{justify-content:flex-start}}`,
].join('');

type Filter = { kind: 'all' | 'palette' | 'marker' | 'medium' | 'month' | 'product'; value?: string; label?: string };

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
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [searchQ, setSearchQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [exploreQ, setExploreQ] = useState('');
  const [cozy, setCozy] = useState<any[]>([]);
  const [curation, setCuration] = useState<{ featured_books: any[]; featured_creators: any[] }>({ featured_books: [], featured_creators: [] });
  const [facets, setFacets] = useState<{ palettes: any[]; markers: any[]; mediums: any[]; books: any[]; externalBooks: any[] }>({ palettes: [], markers: [], mediums: [], books: [], externalBooks: [] });
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCommunityCozyPicks().then((d: any) => setCozy(d?.posts || [])).catch(() => {});
    api.getCommunityCuration().then((d: any) => setCuration({ featured_books: d?.featured_books || [], featured_creators: d?.featured_creators || [] })).catch(() => {});
    api.getCommunityFacets().then((d: any) => setFacets({ palettes: d?.palettes || [], markers: d?.markers || [], mediums: d?.mediums || [], books: d?.books || [], externalBooks: d?.externalBooks || [] })).catch(() => {});
  }, []);

  const loadPage = useCallback((pg: number, f: Filter, q: string) => {
    setLoading(true);
    const done = (d: any) => {
      const list = d?.posts || [];
      setPosts(prev => pg === 0 ? list : [...prev, ...list]);
      setHasMore(!!d?.hasMore);
      setLoading(false);
    };
    // Universal search overrides tag filters
    if (q && q.trim()) {
      api.searchCommunity(q.trim(), pg).then(done).catch(() => setLoading(false));
      return;
    }
    const opts: any = { page: pg, limit: PAGE };
    if (f.kind === 'palette') opts.palette = f.value;
    if (f.kind === 'marker') opts.marker = f.value;
    if (f.kind === 'medium') opts.medium = f.value;
    if (f.kind === 'month') opts.month = f.value;
    if (f.kind === 'product') opts.product_id = f.value;
    api.getCommunityPosts(opts).then(done).catch(() => setLoading(false));
  }, []);

  // Debounce the search input
  useEffect(() => { const t = setTimeout(() => setDebouncedQ(searchQ), 300); return () => clearTimeout(t); }, [searchQ]);
  useEffect(() => { setPage(0); loadPage(0, filter, debouncedQ); }, [filter, debouncedQ, loadPage]);

  const onPosted = (post: any) => { setShowForm(false); setPosts(prev => [post, ...prev]); };
  const searching = debouncedQ.trim().length > 0;
  const isAll = filter.kind === 'all' && !searching;
  const choose = (f: Filter) => { setSearchQ(''); setDebouncedQ(''); setFilter(f); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const browseAll = () => { setSearchQ(''); setDebouncedQ(''); setFilter({ kind: 'all' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{GRID}</style>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 16px 60px' }}>

        {/* Header — centered */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, color: theme.textColor, margin: '0 0 4px' }}>{tRaw('แบ่งปันโลกสีสันของคุณ', 'Share Your Colorful World')} 🌈</h1>
          <p style={{ color: theme.textColor + '88', fontSize: 13, margin: '0 0 14px' }}>{tRaw('พื้นที่อบอุ่นสำหรับแบ่งปันผลงาน เคล็ดลับ และเครื่องมือที่ชอบ', 'A cozy place to share artwork, coloring tips and favorite tools.')}</p>
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

        {showForm && user && <UploadForm theme={theme} p={p} tRaw={tRaw} onPosted={onPosted} user={user} />}

        {/* 🔎 Universal search — searches captions, books, creators, markers, mediums, palettes */}
        <div style={{ maxWidth: 620, margin: '0 auto 22px' }}>
          <div style={{ position: 'relative' }}>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder={tRaw('🔎 ค้นหาผลงาน หนังสือ ครีเอเตอร์ ปากกา หรือคำบรรยาย…', '🔎 Search creations, books, creators, markers or captions…')}
              style={{ width: '100%', padding: '12px 40px 12px 16px', borderRadius: 24, border: `1.5px solid ${p}30`, fontSize: 14, outline: 'none', fontFamily: theme.fontFamily, boxSizing: 'border-box', background: 'white' }}
              onFocus={e => e.currentTarget.style.borderColor = p}
              onBlur={e => e.currentTarget.style.borderColor = p + '30'}
            />
            {searchQ && <button onClick={() => { setSearchQ(''); setDebouncedQ(''); }} aria-label="Clear" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8' }}>✕</button>}
          </div>
        </div>

        {/* 1. 🌷 Cozy Picks — uses the same wording as the homepage (theme labels). */}
        {isAll && cozy.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: theme.textColor, margin: '0 0 2px' }}>{tRaw(theme.labels?.community_title_th || '🌈 แต่งแต้มโลกของคุณ', theme.labels?.community_title || '🌈 Color Your World')}</h2>
              <p style={{ fontSize: 12.5, color: theme.textColor + '88', margin: 0 }}>{tRaw(theme.labels?.community_subtitle_th || 'ผลงานระบายสีจริงจากชุมชนของเรา', theme.labels?.community_subtitle || 'Real coloring results from our community')}</p>
            </div>
            <div className={'cozy-row' + (cozy.length > 6 ? ' many' : '')}>
              {cozy.map(post => (
                <div key={'c' + post.id} style={{ width: 204, flexShrink: 0 }}>
                  <CommunityCard post={post} compact />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. 🆕 New Creations / Search results */}
        <SectionHead theme={theme} title={
          searching ? `🔎 ${tRaw('ผลการค้นหา', 'Results for')} “${debouncedQ.trim()}”`
            : isAll ? `🆕 ${tRaw('ผลงานใหม่ล่าสุด', 'New Creations')}`
            : filter.kind === 'palette' ? `🌷 ${filter.value}`
            : filter.kind === 'marker' ? `🖍️ ${filter.value}`
            : filter.kind === 'medium' ? `🎨 ${filter.value}`
            : filter.kind === 'product' ? `📚 ${filter.label || tRaw('จากเล่มนี้', 'This book')}`
            : `📅 ${filter.value}`
        } onClear={(!isAll || searching) ? browseAll : undefined} clearLabel={tRaw('ล้าง', 'Clear')} />

        {!loading && posts.length === 0 ? (
          <Empty theme={theme} tRaw={tRaw} isAll={isAll} />
        ) : (
          <>
            <div className="cm-grid">{posts.map(post => <div key={post.id}><CommunityCard post={post} /></div>)}</div>
            {loading && <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 26 }}>⏳</div>}
            {hasMore && !loading && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button onClick={() => { const np = page + 1; setPage(np); loadPage(np, filter, debouncedQ); }} style={{ background: 'transparent', border: `2px solid ${p}`, color: p, cursor: 'pointer', padding: '10px 28px', borderRadius: 22, fontSize: 13.5, fontWeight: 800, fontFamily: theme.fontFamily }}>{tRaw('ดูเพิ่มเติม', 'Load more')}</button>
              </div>
            )}
          </>
        )}

        {/* 5. 🔎 Explore — advanced filters, collapsed by default, at the bottom */}
        {isAll && (facets.books.length || facets.externalBooks.length || facets.markers.length || facets.mediums.length || facets.palettes.length) ? (
          <div style={{ background: 'white', borderRadius: 16, padding: '12px 16px', margin: '32px 0 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', border: `1px solid ${p}10` }}>
            <button onClick={() => setShowFilters(s => !s)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: theme.fontFamily }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: theme.textColor }}>🔎 {tRaw('สำรวจ (ตัวกรองขั้นสูง)', 'Explore (advanced filters)')}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: p, whiteSpace: 'nowrap', marginLeft: 10 }}>{showFilters ? `▲ ${tRaw('ซ่อน', 'Hide')}` : `▼ ${tRaw('แสดง', 'Show')}`}</span>
            </button>
            {showFilters && (
              <div style={{ marginTop: 14 }}>
                <input value={exploreQ} onChange={e => setExploreQ(e.target.value)} placeholder={tRaw('ค้นหาหนังสือ ปากกา เทคนิค หรือพาเลตต์…', 'Search books, markers, mediums or palettes…')} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${p}25`, fontSize: 13, outline: 'none', fontFamily: theme.fontFamily, boxSizing: 'border-box', marginBottom: 12 }} />
                {(() => {
                  const fq = exploreQ.trim().toLowerCase();
                  const fb = (arr: any[], key: string) => fq ? arr.filter(x => String(x[key] || '').toLowerCase().includes(fq)) : arr;
                  const books = fb(facets.books, 'title'), ext = fb(facets.externalBooks, 'title'), mk = fb(facets.markers, 'name'), md = fb(facets.mediums, 'name'), pl = fb(facets.palettes, 'name');
                  return <>
                    {books.length > 0 && <ChipRow theme={theme} p={p} title={`📚 ${tRaw('หนังสือ Fluffy Pub', 'Fluffy Pub Books')}`} items={books.map(b => ({ key: b.id, label: b.title, count: b.count }))} onPick={(it) => choose({ kind: 'product', value: it.key, label: it.label })} />}
                    {ext.length > 0 && <ChipRow theme={theme} p={p} title={`📖 ${tRaw('หนังสืออื่น ๆ / จากชุมชน', 'Other / Community Books')}`} items={ext.map(b => ({ key: b.slug, label: b.author ? `${b.title} · ${b.author}` : b.title, count: b.count }))} onPick={(it) => navigate(`/community/book/${it.key}`)} />}
                    {mk.length > 0 && <ChipRow theme={theme} p={p} title={`🖍️ ${tRaw('ปากกา / ชุดสี', 'Markers')}`} items={mk.map(t => ({ key: t.name, label: t.name, count: t.count }))} onPick={(it) => choose({ kind: 'marker', value: it.key })} />}
                    {md.length > 0 && <ChipRow theme={theme} p={p} title={`🎨 ${tRaw('เทคนิค', 'Mediums')}`} items={md.map(t => ({ key: t.name, label: t.name, count: t.count }))} onPick={(it) => choose({ kind: 'medium', value: it.key })} />}
                    {pl.length > 0 && <ChipRow theme={theme} p={p} title={`🌷 ${tRaw('พาเลตต์', 'Palettes')}`} items={pl.map(t => ({ key: t.name, label: t.name, count: t.count }))} onPick={(it) => choose({ kind: 'palette', value: it.key })} />}
                  </>;
                })()}
              </div>
            )}
          </div>
        ) : null}

        {/* 4. Featured Creators (admin-curated) */}
        {isAll && curation.featured_creators.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <SectionHead theme={theme} title={`🌷 ${tRaw('ครีเอเตอร์แนะนำ', 'Featured Creators')}`} />
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
              {curation.featured_creators.map((c: any) => (
                <button key={c.id} onClick={() => navigate(`/creator/${c.id}`)}
                  style={{ background: 'white', border: `1.5px solid ${p}15`, borderRadius: 16, padding: '16px 14px', cursor: 'pointer', minWidth: 130, textAlign: 'center', fontFamily: theme.fontFamily, flexShrink: 0 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: p + '20', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                    {isImageUrl(c.avatar_url) ? <img src={c.avatar_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (c.avatar_url || (c.affiliate_enabled ? '🌷' : '👤'))}
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

function CropModal({ file, theme, p, tRaw, onCrop, onSkip, onCancel }: {
  file: File; theme: any; p: string; tRaw: any;
  onCrop: (f: File) => void; onSkip: () => void; onCancel: () => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  // box is in canvas display coords; width and height are independent (free aspect ratio)
  const [box, setBox] = useState({ x: 20, y: 20, w: CROP_SZ - 40, h: CROP_SZ - 40 });
  // The displayed image's rect within the CROP_SZ square (objectFit:contain letterbox)
  const rect = useRef({ x: 0, y: 0, w: CROP_SZ, h: CROP_SZ });
  const dragging = useRef<{ mode: 'move' | 'resize'; mx: number; my: number; bx: number; by: number; bw: number; bh: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      // Compute the contain-fit rect; default crop = the FULL image (so "use whole" = exact image)
      const scale = Math.min(CROP_SZ / image.naturalWidth, CROP_SZ / image.naturalHeight);
      const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
      const x = (CROP_SZ - w) / 2, y = (CROP_SZ - h) / 2;
      rect.current = { x, y, w, h };
      setBox({ x, y, w, h });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const onDown = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = { mode, mx: e.clientX, my: e.clientY, bx: box.x, by: box.y, bw: box.w, bh: box.h };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = dragging.current;
    if (!d) return;
    const r = rect.current;
    const dx = e.clientX - d.mx, dy = e.clientY - d.my;
    if (d.mode === 'move') {
      // Clamp movement within the image rect
      setBox(b => ({ ...b, x: clamp(d.bx + dx, r.x, r.x + r.w - b.w), y: clamp(d.by + dy, r.y, r.y + r.h - b.h) }));
    } else {
      // Clamp resize within the image rect (right/bottom edges)
      const nw = clamp(d.bw + dx, 40, r.x + r.w - d.bx);
      const nh = clamp(d.bh + dy, 40, r.y + r.h - d.by);
      setBox(b => ({ ...b, w: nw, h: nh }));
    }
  };

  const confirm = () => {
    if (!img) return;
    // Display uses objectFit:contain → scale by MIN so crop coords map to source correctly.
    const scale = Math.min(CROP_SZ / img.naturalWidth, CROP_SZ / img.naturalHeight);
    const rw = img.naturalWidth * scale, rh = img.naturalHeight * scale;
    const ox = (CROP_SZ - rw) / 2, oy = (CROP_SZ - rh) / 2;
    const sx = (box.x - ox) / scale, sy = (box.y - oy) / scale;
    const sw = box.w / scale, sh = box.h / scale;
    const off = document.createElement('canvas');
    off.width = Math.round(sw); off.height = Math.round(sh);
    off.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, off.width, off.height);
    off.toBlob(blob => { if (blob) onCrop(new File([blob], file.name, { type: 'image/jpeg' })); }, 'image/jpeg', 0.92);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 16 }}>
      <div style={{ color: 'white', fontWeight: 800, fontSize: 15, fontFamily: theme.fontFamily }}>✂️ {tRaw('ปรับตัดรูป', 'Crop artwork')}</div>
      <div style={{ position: 'relative', width: CROP_SZ, height: CROP_SZ, background: '#111', overflow: 'hidden', borderRadius: 12, userSelect: 'none', flexShrink: 0 }}
        onPointerMove={onMove} onPointerUp={() => { dragging.current = null; }}>
        {img && <img src={img.src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <defs><mask id="cm-hole"><rect width={CROP_SZ} height={CROP_SZ} fill="white" /><rect x={box.x} y={box.y} width={box.w} height={box.h} fill="black" /></mask></defs>
          <rect width={CROP_SZ} height={CROP_SZ} fill="rgba(0,0,0,0.55)" mask="url(#cm-hole)" />
          <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke="white" strokeWidth={2} strokeDasharray="6 3" />
          {([[box.x,box.y],[box.x+box.w-14,box.y],[box.x,box.y+box.h-14],[box.x+box.w-14,box.y+box.h-14]] as [number,number][]).map(([cx,cy],i) => (
            <rect key={i} x={cx} y={cy} width={14} height={14} fill="none" stroke="white" strokeWidth={3} />
          ))}
        </svg>
        <div onPointerDown={e => onDown(e, 'move')} style={{ position: 'absolute', left: box.x + 2, top: box.y + 2, width: box.w - 20, height: box.h - 20, cursor: 'move' }} />
        <div onPointerDown={e => onDown(e, 'resize')} style={{ position: 'absolute', left: box.x + box.w - 18, top: box.y + box.h - 18, width: 18, height: 18, background: p, borderRadius: 4, cursor: 'se-resize', opacity: 0.9 }} />
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: theme.fontFamily }}>{tRaw('ลากเพื่อย้าย · ลากมุมขวาล่างเพื่อปรับขนาด (อิสระ)', 'Drag to move · drag corner to resize freely')}</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onCancel} style={{ padding: '10px 22px', borderRadius: 22, border: '2px solid rgba(255,255,255,0.5)', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 700, fontFamily: theme.fontFamily }}>{tRaw('ยกเลิก', 'Cancel')}</button>
        <button onClick={onSkip} style={{ padding: '10px 22px', borderRadius: 22, border: '2px solid rgba(255,255,255,0.5)', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 700, fontFamily: theme.fontFamily }}>🖼️ {tRaw('ใช้รูปต้นฉบับ', 'Use original')}</button>
        <button onClick={confirm} style={{ padding: '10px 24px', borderRadius: 22, border: 'none', background: p, color: 'white', cursor: 'pointer', fontWeight: 800, fontFamily: theme.fontFamily }}>✂️ {tRaw('ตัดรูป', 'Crop & use')}</button>
      </div>
    </div>
  );
}

// ── Upload form ───────────────────────────────────────────────────────────────
type UpImg = { file: File; preview: string };
function UploadForm({ theme, p, tRaw, onPosted, user }: any) {
  const [images, setImages] = useState<UpImg[]>([]);            // cropped/final images to upload (max 10)
  const [cropRaw, setCropRaw] = useState<File | null>(null);    // raw file awaiting crop
  const [cropIdx, setCropIdx] = useState<number | null>(null);  // index being re-cropped (null = adding new)
  const [bookMode, setBookMode] = useState<'product' | 'external'>('product');
  const [prodQuery, setProdQuery] = useState('');
  const [prodResults, setProdResults] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selProduct, setSelProduct] = useState<any>(null);
  const [extTitle, setExtTitle] = useState('');
  const [extAuthor, setExtAuthor] = useState('');
  const [extResults, setExtResults] = useState<any[]>([]);
  const [authorResults, setAuthorResults] = useState<string[]>([]);
  const [authorFocus, setAuthorFocus] = useState(false);
  const [details, setDetails] = useState<{ medium: string; brand: string }[]>([{ medium: '', brand: '' }]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [palettes, setPalettes] = useState<string[]>([]);
  const [tools, setTools] = useState<{ name: string; url: string }[]>([]);
  const [postType, setPostType] = useState<'artwork' | 'tip' | 'tools'>('artwork');
  const canAffiliate = !!(user?.affiliate_enabled || user?.role === 'admin');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { api.getProducts().then((d: any) => setAllProducts(Array.isArray(d) ? d : [])); }, []);
  useEffect(() => {
    const q = prodQuery.trim().toLowerCase();
    if (!q) { setProdResults([]); return; }
    setProdResults(allProducts.filter(pr => (pr.title || '').toLowerCase().includes(q)).slice(0, 6));
  }, [prodQuery, allProducts]);
  // External book autocomplete (debounced)
  useEffect(() => {
    const q = extTitle.trim();
    if (q.length < 2) { setExtResults([]); return; }
    const t = setTimeout(() => { api.getExternalBooks(q).then((d: any) => setExtResults(d?.books || [])).catch(() => {}); }, 250);
    return () => clearTimeout(t);
  }, [extTitle]);
  // External author / brand autocomplete (debounced)
  useEffect(() => {
    if (!authorFocus) return;
    const t = setTimeout(() => { api.getExternalAuthors(extAuthor.trim()).then((d: any) => setAuthorResults(d?.authors || [])).catch(() => {}); }, 250);
    return () => clearTimeout(t);
  }, [extAuthor, authorFocus]);

  const fld = { width: '100%', padding: '10px 13px', borderRadius: 10, border: `1.5px solid ${p}30`, fontSize: 14, outline: 'none', fontFamily: theme.fontFamily, boxSizing: 'border-box' as const };

  // Crop flow: pick raw → modal → apply (replace if re-cropping, else append)
  const onPickRaw = (f: File) => { setCropRaw(f); setCropIdx(null); };
  const applyCropped = (f: File) => {
    const img = { file: f, preview: URL.createObjectURL(f) };
    setImages(prev => cropIdx != null ? prev.map((x, i) => i === cropIdx ? img : x) : [...prev, img]);
    setCropRaw(null); setCropIdx(null);
  };
  const recrop = (i: number) => { setCropRaw(images[i].file); setCropIdx(i); };
  const removeImg = (i: number) => setImages(prev => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    setErr('');
    if (!images.length) { setErr(tRaw('กรุณาเลือกรูปผลงาน', 'Please choose your artwork image.')); return; }
    setBusy(true);
    try {
      // Upload each image's full variant; thumb from the first (cover)
      const fulls: string[] = [];
      let coverThumb = '';
      for (let i = 0; i < images.length; i++) {
        const { full, thumb } = await makeImageVariants(images[i].file);
        const [up, upT] = await Promise.all([api.uploadFile(full, 'community'), i === 0 ? api.uploadFile(thumb, 'community') : Promise.resolve(null)]);
        if (up?.error) { setErr(up.error); setBusy(false); return; }
        fulls.push(up.publicUrl);
        if (i === 0) coverThumb = upT?.publicUrl || up.publicUrl;
      }
      const res = await api.createCommunityPost({
        artwork_url: fulls[0], artwork_urls: fulls, thumb_url: coverThumb,
        product_id: bookMode === 'product' ? (selProduct?.id || null) : null,
        external_book_title: bookMode === 'external' ? extTitle.trim() || null : null,
        external_book_author: bookMode === 'external' ? extAuthor.trim() || null : null,
        // Structured medium+brand rows; also derive flat arrays for Explore filters/search
        coloring_details: details.filter(d => d.medium.trim()).map(d => ({ medium: d.medium.trim(), brand: d.brand.trim() })),
        mediums: [...new Set(details.map(d => d.medium.trim()).filter(Boolean))],
        markers: [...new Set(details.map(d => d.brand.trim()).filter(Boolean))],
        palettes,
        keywords,
        caption: caption.trim(),
        post_type: postType,
        recommended_tools: canAffiliate ? tools.filter(t => t.name.trim()) : [],
      });
      if (res?.error) { setErr(res.error); setBusy(false); return; }
      onPosted(res);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };

  return (
    <>
    {cropRaw && (
      <CropModal
        file={cropRaw} theme={theme} p={p} tRaw={tRaw}
        onCrop={f => applyCropped(f)}
        onSkip={() => applyCropped(cropRaw)}
        onCancel={() => { setCropRaw(null); setCropIdx(null); }}
      />
    )}
    <div style={{ background: 'white', borderRadius: 18, padding: 20, boxShadow: '0 2px 14px rgba(0,0,0,0.06)', margin: '0 0 24px', border: `1.5px solid ${p}15` }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '0 0 12px' }}>🎨 {tRaw('แบ่งปันกับชุมชน', 'Share with the community')}</h3>
      {/* 📝 Post type */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 6 }}>📝 {tRaw('ประเภทโพสต์', 'Post type')}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([['artwork', `🎨 ${tRaw('ผลงาน', 'Artwork')}`], ['tip', `✨ ${tRaw('เคล็ดลับ/เทคนิค', 'Tip / Technique')}`], ['tools', `🛍️ ${tRaw('เครื่องมือที่ชอบ', 'Favorite Tools')}`]] as const).map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setPostType(k)} style={{ padding: '7px 14px', borderRadius: 18, border: `1.5px solid ${postType === k ? p : '#e5e7eb'}`, background: postType === k ? p + '12' : 'white', color: postType === k ? p : '#64748b', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: theme.fontFamily }}>{lbl}</button>
          ))}
        </div>
        {postType === 'tip' && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{tRaw('มินิทูทอเรียล: 1–5 รูป + คำบรรยายสั้น ๆ', 'Mini tutorial: 1–5 images + a short caption.')}</div>}
        {postType === 'tools' && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{tRaw('แนะนำเครื่องมือที่คุณชอบ (ใส่ลิงก์ได้)', 'Recommend tools you love (links allowed).')}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 18 }} className="cm-form">
        <style>{`@media(max-width:640px){.cm-form{grid-template-columns:1fr!important}}`}</style>
        {/* Left: artwork upload — multiple images */}
        <div>
          {images.length === 0 ? (
            <label style={{ display: 'block', cursor: 'pointer' }}>
              <div style={{ aspectRatio: '4/5', borderRadius: 14, border: `2px dashed ${p}40`, background: p + '08', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: p, fontWeight: 700, fontSize: 13, textAlign: 'center', padding: 16 }}>🖼️ {tRaw('แตะเพื่ออัปโหลดรูปผลงาน', 'Tap to upload artwork')}</span>
              </div>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onPickRaw(f); e.target.value = ''; }} />
            </label>
          ) : (
            <>
              {/* Cover preview */}
              <div style={{ aspectRatio: '4/5', borderRadius: 14, overflow: 'hidden', background: '#f8fafc', border: `1.5px solid ${p}20` }}>
                <img src={images[0].preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              {/* Thumbnail strip */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {images.map((im, i) => (
                  <div key={i} style={{ position: 'relative', width: 52, height: 52, borderRadius: 8, overflow: 'hidden', border: i === 0 ? `2px solid ${p}` : '1.5px solid #e5e7eb' }}>
                    <img src={im.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {i === 0 && <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: p, color: 'white', fontSize: 8, fontWeight: 800, textAlign: 'center' }}>{tRaw('ปก', 'Cover')}</span>}
                    <button onClick={() => removeImg(i)} style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: '0 0 0 6px', border: 'none', background: 'rgba(220,38,38,0.9)', color: 'white', fontSize: 10, cursor: 'pointer', lineHeight: 1 }}>✕</button>
                  </div>
                ))}
                {images.length < 10 && (
                  <label style={{ width: 52, height: 52, borderRadius: 8, border: `1.5px dashed ${p}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: p, fontSize: 20, fontWeight: 700 }}>
                    +
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onPickRaw(f); e.target.value = ''; }} />
                  </label>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={() => recrop(0)} style={{ flex: 1, background: 'none', border: `1px solid ${p}40`, borderRadius: 8, padding: '5px', fontSize: 12, color: p, cursor: 'pointer', fontWeight: 700, fontFamily: theme.fontFamily }}>✂️ {tRaw('แก้ไขการตัดรูปปก', 'Edit cover crop')}</button>
                <button onClick={() => setImages([])} style={{ flex: 1, background: 'none', border: `1px solid #e5e7eb`, borderRadius: 8, padding: '5px', fontSize: 12, color: '#94a3b8', cursor: 'pointer', fontFamily: theme.fontFamily }}>✕ {tRaw('ล้างทั้งหมด', 'Clear all')}</button>
              </div>
              {images.length > 1 && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>{tRaw('รูปแรกคือภาพปก', 'First image is the cover')}</div>
              )}
            </>
          )}
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
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, position: 'relative' }}>
                <input value={extTitle} onChange={e => setExtTitle(e.target.value)} placeholder={tRaw('ชื่อหนังสือ', 'Book title')} style={fld} />
                <div style={{ position: 'relative' }}>
                  <input value={extAuthor} onChange={e => setExtAuthor(e.target.value)} onFocus={() => setAuthorFocus(true)} onBlur={() => setTimeout(() => setAuthorFocus(false), 150)} placeholder={tRaw('ศิลปิน/สำนักพิมพ์', 'Author / Brand')} style={{ ...fld, width: '100%' }} />
                  {authorFocus && authorResults.filter(a => a.toLowerCase() !== extAuthor.trim().toLowerCase()).length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'white', border: '1px solid #f1f5f9', borderRadius: 10, marginTop: 4, overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.1)' }}>
                      {authorResults.filter(a => a.toLowerCase() !== extAuthor.trim().toLowerCase()).map((a: string) => (
                        <button key={a} onMouseDown={() => { setExtAuthor(a); setAuthorFocus(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'white', border: 'none', borderBottom: '1px solid #f8fafc', cursor: 'pointer', padding: '8px 12px', fontSize: 13, fontFamily: theme.fontFamily, color: '#1e293b' }}>👤 {a}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {extResults.length > 0 && (
                <div style={{ border: '1px solid #f1f5f9', borderRadius: 10, marginTop: 4, overflow: 'hidden' }}>
                  {extResults.map((bk: any) => (
                    <button key={bk.id} onClick={() => { setExtTitle(bk.title); setExtAuthor(bk.author || ''); setExtResults([]); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'white', border: 'none', borderBottom: '1px solid #f8fafc', cursor: 'pointer', padding: '8px 12px', fontSize: 13, fontFamily: theme.fontFamily, color: '#1e293b' }}>
                      📖 {bk.title}{bk.author ? <span style={{ color: '#94a3b8' }}> by {bk.author}</span> : ''} <span style={{ color: '#cbd5e1', fontSize: 11 }}>· {bk.post_count}</span>
                    </button>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{tRaw('เลือกจากรายการเพื่อไม่ให้ซ้ำ หรือพิมพ์ชื่อใหม่', 'Pick from the list to avoid duplicates, or type a new one')}</div>
            </div>
          )}

          <StructuredMediumBlock details={details} setDetails={setDetails} theme={theme} p={p} fld={fld} tRaw={tRaw} />
          <LibraryTagBlock type="palette" label={`🌷 ${tRaw('พาเลตต์ที่ใช้', 'Palette used')}`} values={palettes} setValues={setPalettes} addPh={tRaw('เพิ่มพาเลตต์...', 'Suggest a palette...')} theme={theme} p={p} fld={fld} tRaw={tRaw} />
          <KeywordsBlock keywords={keywords} setKeywords={setKeywords} theme={theme} p={p} fld={fld} tRaw={tRaw} />

          {/* Recommended tools — Fluffy Creators only (affiliate links allowed, max 2) */}
          {canAffiliate && <RecommendedToolsBlock tools={tools} setTools={setTools} theme={theme} p={p} fld={fld} tRaw={tRaw} />}

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

const MEDIUM_OPTIONS = ['Alcohol Marker', 'Acrylic', 'Colored Pencil', 'Watercolor', 'Gel Pen', 'Crayon', 'Digital', 'Other'];

// Structured coloring rows: Medium (dropdown) + Brand/set (optional autocomplete). Repeatable.
export function StructuredMediumBlock({ details, setDetails, theme, p, fld, tRaw }: any) {
  const [brandSugg, setBrandSugg] = useState<string[]>([]);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  useEffect(() => { api.getCommunityTags('marker').then((d: any) => setBrandSugg((d?.tags || []).map((t: any) => t.name))).catch(() => {}); }, []);
  const upd = (i: number, k: string, v: string) => setDetails(details.map((d: any, idx: number) => idx === i ? { ...d, [k]: v } : d));
  const add = () => { if (details.length < 10) setDetails([...details, { medium: '', brand: '' }]); };
  const remove = (i: number) => setDetails(details.length > 1 ? details.filter((_: any, idx: number) => idx !== i) : [{ medium: '', brand: '' }]);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 6 }}>🎨 {tRaw('สื่อ + ยี่ห้อ/ชุดที่ใช้', 'Medium + brand / set used')}</div>
      {details.map((row: any, i: number) => {
        const sugg = row.brand.trim() ? brandSugg.filter(b => b.toLowerCase().includes(row.brand.toLowerCase()) && b.toLowerCase() !== row.brand.toLowerCase()).slice(0, 6) : [];
        return (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'flex-start' }}>
            <select value={row.medium} onChange={e => upd(i, 'medium', e.target.value)} style={{ ...fld, flex: 1, fontSize: 13, padding: '9px 10px' }}>
              <option value="">{tRaw('เลือกสื่อ...', 'Select medium...')}</option>
              {MEDIUM_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div style={{ flex: 1, position: 'relative' }}>
              <input value={row.brand} onChange={e => upd(i, 'brand', e.target.value)} onFocus={() => setFocusIdx(i)} onBlur={() => setTimeout(() => setFocusIdx(f => f === i ? null : f), 150)} placeholder={tRaw('ยี่ห้อ/ชุด (ไม่บังคับ)', 'Brand / set (optional)')} style={{ ...fld, width: '100%', fontSize: 13 }} />
              {focusIdx === i && sugg.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'white', border: '1px solid #f1f5f9', borderRadius: 10, marginTop: 2, overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.1)' }}>
                  {sugg.map(b => <button key={b} onMouseDown={() => { upd(i, 'brand', b); setFocusIdx(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'white', border: 'none', cursor: 'pointer', padding: '7px 11px', fontSize: 13, fontFamily: theme.fontFamily, color: '#1e293b' }}>{b}</button>)}
                </div>
              )}
            </div>
            <button onClick={() => remove(i)} style={{ padding: '0 11px', borderRadius: 10, border: '1px solid #fca5a5', background: 'white', color: '#dc2626', cursor: 'pointer', fontWeight: 700, alignSelf: 'stretch' }}>✕</button>
          </div>
        );
      })}
      {details.length < 10 && <button onClick={add} style={{ padding: '6px 14px', borderRadius: 10, border: `1.5px dashed ${p}50`, background: 'white', color: p, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: theme.fontFamily }}>+ {tRaw('เพิ่มสื่ออีก', 'Add another medium')}</button>}
    </div>
  );
}

// Keywords — search-only, never shown publicly. Max 5, ≤20 chars, lowercased, deduped.
export function KeywordsBlock({ keywords, setKeywords, theme, p, fld, tRaw }: any) {
  const [val, setVal] = useState('');
  const addKw = () => {
    const v = val.trim().toLowerCase().slice(0, 20);
    if (v && keywords.length < 5 && !keywords.includes(v)) setKeywords([...keywords, v]);
    setVal('');
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 2 }}>🔑 {tRaw('คำค้นหา (ไม่บังคับ)', 'Keywords (optional)')} <span style={{ fontWeight: 500, color: '#9ca3af' }}>({keywords.length}/5)</span></div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>{tRaw('ช่วยให้ค้นหาเจอง่ายขึ้น — ไม่แสดงต่อสาธารณะ', 'Helps people find your post in search — never shown publicly.')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
        {keywords.map((k: string) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: p + '12', color: p, borderRadius: 16, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{k}
            <button onClick={() => setKeywords(keywords.filter((x: string) => x !== k))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p, fontWeight: 800 }}>✕</button>
          </span>
        ))}
      </div>
      {keywords.length < 5 && <input value={val} onChange={e => setVal(e.target.value.slice(0, 20))} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKw(); } }} onBlur={addKw} placeholder={tRaw('เช่น cozy, pink, school', 'e.g. cozy, pink, school')} style={{ ...fld, fontSize: 13 }} />}
    </div>
  );
}

// Recommended coloring tools (Fluffy Creators only). Max 2, name + optional affiliate link.
export function RecommendedToolsBlock({ tools, setTools, theme, p, fld, tRaw }: any) {
  const add = () => { if (tools.length >= 2) return; setTools([...tools, { name: '', url: '' }]); };
  const upd = (i: number, k: string, v: string) => setTools(tools.map((t: any, idx: number) => idx === i ? { ...t, [k]: v } : t));
  const remove = (i: number) => setTools(tools.filter((_: any, idx: number) => idx !== i));
  return (
    <div style={{ marginBottom: 12, background: p + '06', border: `1px solid ${p}18`, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 2 }}>🌷 {tRaw('เครื่องมือที่แนะนำ', 'Recommended tools')} <span style={{ fontWeight: 500, color: '#9ca3af' }}>({tools.length}/2)</span></div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>{tRaw('เฉพาะอุปกรณ์ระบายสี · ใส่ลิงก์พันธมิตรได้', 'Coloring tools only · affiliate links allowed')}</div>
      {tools.map((t: any, i: number) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input value={t.name} onChange={e => upd(i, 'name', e.target.value)} placeholder={tRaw('เช่น Ohuhu Pastel 48', 'e.g. Ohuhu Pastel 48')} style={{ ...fld, flex: 1, fontSize: 13 }} />
          <input value={t.url} onChange={e => upd(i, 'url', e.target.value)} placeholder={tRaw('ลิงก์ (ไม่บังคับ)', 'Link (optional)')} style={{ ...fld, flex: 1, fontSize: 13 }} />
          <button onClick={() => remove(i)} style={{ padding: '0 12px', borderRadius: 10, border: '1px solid #fca5a5', background: 'white', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      ))}
      {tools.length < 2 && <button onClick={add} style={{ padding: '7px 14px', borderRadius: 10, border: `1.5px dashed ${p}50`, background: 'white', color: p, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: theme.fontFamily }}>+ {tRaw('เพิ่มเครื่องมือ', 'Add tool')}</button>}
    </div>
  );
}

// Tag block backed by the Tag Library — shows approved tags as chips.
// Typing a custom name and pressing + submits it as a pending tag suggestion.
const DEFAULT_TAGS: Record<string, string[]> = {
  medium: ['Alcohol Marker', 'Acrylic', 'Colored Pencil', 'Watercolor', 'Gel Pen', 'Crayon', 'Digital', 'Other'],
  marker: ['Ohuhu Pastel 48', 'Ohuhu Midtone 48', 'Ohuhu Kaala B Series', 'Copic Sketch', 'Prismacolor'],
  palette: [],
};

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

  // Merge: defaults first, then any extra approved tags from DB, then custom selections not in either
  const defaults = DEFAULT_TAGS[type] || [];
  const dbExtra = approved.filter(a => !defaults.includes(a));
  const knownOptions = [...defaults, ...dbExtra];
  const allOptions = [...knownOptions, ...values.filter((v: string) => !knownOptions.includes(v))];

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
