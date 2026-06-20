import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';
import { makeImageVariants } from '../lib/imageThumb';
import CommunityCard from '../components/CommunityCard';

const MEDIUMS = ['Alcohol Marker', 'Colored Pencil', 'Watercolor', 'Gel Pen', 'Crayon', 'Other'];
const PALETTE_EXAMPLES = ['🍓 Strawberry Milk', '☕ Cozy Cafe', '🌷 Spring Garden', '🌙 Moonlight'];
const MARKER_EXAMPLES = ['Ohuhu Pastel 48', 'Ohuhu Midtone 48', 'Copic Sketch', 'Prismacolor'];
const PAGE = 16;
// Masonry tuned for ~280–320px columns: 4 / 3 / 2 / 1.
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
  const planner = (theme as any).community || {};

  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<Filter>(initialFilter);

  const [cozy, setCozy] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [facets, setFacets] = useState<{ palettes: any[]; markers: any[]; books: any[] }>({ palettes: [], markers: [], books: [] });

  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCommunityCozyPicks().then((d: any) => setCozy(d?.posts || [])).catch(() => {});
    api.getCommunityCreators(12).then((d: any) => setCreators(d?.creators || [])).catch(() => {});
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

        {/* Compact header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, color: theme.textColor, margin: 0 }}>{tRaw('แบ่งปันโลกสีสันของคุณ', 'Share Your Colorful World')} 🌈</h1>
            <p style={{ color: theme.textColor + '88', fontSize: 13, margin: '2px 0 0' }}>{tRaw('แรงบันดาลใจการระบายสีจากชุมชน', 'Coloring inspiration from the community')}</p>
          </div>
          {user ? (
            <button onClick={() => setShowForm(s => !s)} style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '9px 18px', borderRadius: 22, fontSize: 13.5, fontWeight: 800, fontFamily: theme.fontFamily, flexShrink: 0 }}>
              {showForm ? tRaw('ปิด', 'Close') : `🎨 ${tRaw('แบ่งปันผลงาน', 'Share artwork')}`}
            </button>
          ) : (
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: `1.5px solid ${p}40`, color: p, cursor: 'pointer', padding: '8px 16px', borderRadius: 22, fontSize: 13, fontWeight: 700, fontFamily: theme.fontFamily, flexShrink: 0 }}>
              {tRaw('เข้าสู่ระบบเพื่อแบ่งปัน', 'Log in to share')}
            </button>
          )}
        </div>

        {/* Weekly Planner banner */}
        {(planner.palette || planner.book || planner.marker) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, background: 'white', borderRadius: 14, padding: '10px 14px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', border: `1.5px solid ${p}12`, margin: '12px 0 18px' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', alignSelf: 'center' }}>{tRaw('สัปดาห์นี้', 'This week')}:</span>
            {planner.palette && <span style={{ fontSize: 12.5, fontWeight: 700, color: '#be185d', background: '#fce7f3', borderRadius: 14, padding: '4px 11px' }}>🌷 {planner.palette}</span>}
            {planner.book && <span style={{ fontSize: 12.5, fontWeight: 700, color: p, background: p + '12', borderRadius: 14, padding: '4px 11px' }}>📚 {planner.book}</span>}
            {planner.marker && <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: 14, padding: '4px 11px' }}>🖍️ {planner.marker}</span>}
          </div>
        )}

        {showForm && user && <UploadForm theme={theme} p={p} tRaw={tRaw} onPosted={onPosted} />}

        {/* 1. New Creations (main masonry) */}
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

        {/* 2. This Week's Cozy Picks (admin-curated) */}
        {isAll && cozy.length > 0 && (
          <div style={{ marginTop: 34 }}>
            <SectionHead theme={theme} title={`🌷 ${tRaw('คัดสรรอบอุ่นประจำสัปดาห์', "This Week's Cozy Picks")}`} />
            <div className="cm-grid">{cozy.map(post => <CommunityCard key={'c' + post.id} post={post} />)}</div>
          </div>
        )}

        {/* 3–5. Discover by Book / Palette / Marker (chip rows) */}
        {isAll && (facets.books.length || facets.palettes.length || facets.markers.length) ? (
          <div style={{ marginTop: 34 }}>
            {facets.books.length > 0 && <ChipRow theme={theme} p={p} title={`📚 ${tRaw('ตามหนังสือ', 'By Book')}`} items={facets.books.map(b => ({ key: b.id, label: b.title, count: b.count }))} onPick={(it) => choose({ kind: 'product', value: it.key, label: it.label })} />}
            {facets.palettes.length > 0 && <ChipRow theme={theme} p={p} title={`🎨 ${tRaw('ตามพาเลตต์', 'By Palette')}`} items={facets.palettes.map(t => ({ key: t.name, label: t.name, count: t.count }))} onPick={(it) => choose({ kind: 'palette', value: it.key })} />}
            {facets.markers.length > 0 && <ChipRow theme={theme} p={p} title={`🖍️ ${tRaw('ตามชุดปากกา', 'By Marker')}`} items={facets.markers.map(t => ({ key: t.name, label: t.name, count: t.count }))} onPick={(it) => choose({ kind: 'marker', value: it.key })} />}
          </div>
        ) : null}

        {/* 6. Featured Creators (bottom) */}
        {isAll && creators.length > 0 && (
          <div style={{ marginTop: 34 }}>
            <SectionHead theme={theme} title={`👤 ${tRaw('ครีเอเตอร์แนะนำ', 'Featured Creators')}`} />
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
              {creators.map(c => (
                <button key={c.id} onClick={() => navigate(`/creator/${c.id}`)} style={{ background: 'white', border: `1.5px solid ${p}15`, borderRadius: 16, padding: '14px 12px', cursor: 'pointer', minWidth: 96, textAlign: 'center', fontFamily: theme.fontFamily, flexShrink: 0 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', background: p + '20', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {c.avatar_url ? <img src={c.avatar_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.badge === 'artist' ? '🎨' : c.badge === 'creator' ? '🌷' : ''} {c.name}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{c.posts} {tRaw('โพสต์', 'posts')}</div>
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

// ── Upload form ───────────────────────────────────────────────────────────────
function UploadForm({ theme, p, tRaw, onPosted }: any) {
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
  const toggle = (arr: string[], set: any, v: string) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
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
    <div style={{ background: 'white', borderRadius: 18, padding: 20, boxShadow: '0 2px 14px rgba(0,0,0,0.06)', margin: '14px 0 24px', border: `1.5px solid ${p}15` }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>🎨 {tRaw('แบ่งปันผลงานของคุณ', 'Share your artwork')}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 18 }} className="cm-form">
        <style>{`@media(max-width:640px){.cm-form{grid-template-columns:1fr!important}}`}</style>
        <div>
          <label style={{ display: 'block', cursor: 'pointer' }}>
            <div style={{ aspectRatio: '1', borderRadius: 14, border: `2px dashed ${p}40`, background: preview ? '#000' : p + '08', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {preview ? <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ color: p, fontWeight: 700, fontSize: 13, textAlign: 'center', padding: 16 }}>🖼️ {tRaw('แตะเพื่ออัปโหลดรูปผลงาน', 'Tap to upload artwork')}</span>}
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
          </label>
        </div>
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

          <TagBlock label={`🎨 ${tRaw('สื่อที่ใช้', 'Medium')}`} options={MEDIUMS} values={mediums} setValues={setMediums} toggle={toggle} addPh={tRaw('เพิ่มสื่อของคุณเอง', 'Add your own medium')} theme={theme} p={p} fld={fld} />
          <TagBlock label={`🖍️ ${tRaw('ปากกา/ชุดที่ใช้', 'Marker / set used')}`} options={MARKER_EXAMPLES} values={markers} setValues={setMarkers} toggle={toggle} addPh={tRaw('เพิ่มชุดปากกา', 'Add a marker set')} theme={theme} p={p} fld={fld} />
          <TagBlock label={`🌷 ${tRaw('พาเลตต์ที่ใช้', 'Palette used')}`} options={PALETTE_EXAMPLES} values={palettes} setValues={setPalettes} toggle={toggle} addPh={tRaw('เพิ่มพาเลตต์', 'Add a palette')} theme={theme} p={p} fld={fld} />

          <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', margin: '4px 0 6px' }}>✏️ {tRaw('คำบรรยาย', 'Caption')} <span style={{ color: '#9ca3af', fontWeight: 500 }}>({caption.length}/300)</span></div>
          <textarea value={caption} maxLength={300} onChange={e => setCaption(e.target.value)} rows={2} placeholder={tRaw('เล่าเกี่ยวกับผลงานชิ้นนี้...', 'Tell us about this piece...')} style={{ ...fld, resize: 'vertical' }} />

          {err && <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '8px 12px', marginTop: 10, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>⚠️ {err}</div>}
          <button onClick={submit} disabled={busy} style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 12, border: 'none', cursor: busy ? 'wait' : 'pointer', background: busy ? p + '88' : p, color: 'white', fontSize: 14, fontWeight: 800, fontFamily: theme.fontFamily }}>
            {busy ? tRaw('กำลังโพสต์...', 'Posting...') : `🌈 ${tRaw('แบ่งปัน', 'Share')}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function TagBlock({ label, options, values, setValues, toggle, addPh, theme, p, fld }: any) {
  const [custom, setCustom] = useState('');
  const add = () => { const v = custom.trim(); if (v && !values.includes(v)) setValues([...values, v]); setCustom(''); };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        {options.map((o: string) => {
          const on = values.includes(o);
          return <button key={o} onClick={() => toggle(values, setValues, o)} style={{ padding: '5px 11px', borderRadius: 18, border: `1.5px solid ${on ? p : '#e5e7eb'}`, background: on ? p + '15' : 'white', color: on ? p : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: theme.fontFamily }}>{o}</button>;
        })}
        {values.filter((v: string) => !options.includes(v)).map((v: string) => (
          <button key={v} onClick={() => toggle(values, setValues, v)} style={{ padding: '5px 11px', borderRadius: 18, border: `1.5px solid ${p}`, background: p + '15', color: p, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: theme.fontFamily }}>{v} ✕</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={addPh} style={{ ...fld, flex: 1 }} />
        <button onClick={add} style={{ padding: '0 16px', borderRadius: 10, border: 'none', background: p, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: theme.fontFamily }}>+</button>
      </div>
    </div>
  );
}
