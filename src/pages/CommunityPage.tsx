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
const PAGE = 12;

export default function CommunityPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { user } = useAuth();
  const { tRaw } = useLang();
  const p = theme.primaryColor;

  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadPage = useCallback((pg: number) => {
    setLoading(true);
    api.getCommunityPosts({ page: pg, limit: PAGE }).then((d: any) => {
      const list = d?.posts || [];
      setPosts(prev => pg === 0 ? list : [...prev, ...list]);
      setHasMore(!!d?.hasMore);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadPage(0); }, [loadPage]);

  const onPosted = (post: any) => { setShowForm(false); setPosts(prev => [post, ...prev]); };

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{`.cm-grid{column-count:4;column-gap:16px}@media(max-width:1100px){.cm-grid{column-count:3}}@media(max-width:760px){.cm-grid{column-count:2;column-gap:10px}}@media(max-width:420px){.cm-grid{column-count:1}}.cm-grid>div{margin-bottom:16px}`}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, padding: '40px 24px 32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900, color: theme.textColor, margin: '0 0 10px' }}>
          {tRaw('แบ่งปันโลกสีสันของคุณ', 'Share Your Colorful World')} 🌈
        </h1>
        <p style={{ color: theme.textColor + '99', fontSize: 15, margin: '0 0 20px', maxWidth: 540, marginInline: 'auto' }}>
          {tRaw('อวดผลงานระบายสีของคุณ ค้นหาแรงบันดาลใจ และเชื่อมต่อกับเพื่อนนักระบายสี', 'Show off your finished pages, find inspiration, and connect with fellow colorists.')}
        </p>
        {user ? (
          <button onClick={() => setShowForm(s => !s)} style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '12px 28px', borderRadius: 28, fontSize: 15, fontWeight: 800, boxShadow: `0 8px 24px ${p}44`, fontFamily: theme.fontFamily }}>
            {showForm ? tRaw('ปิด', 'Close') : `🎨 ${tRaw('แบ่งปันผลงานของคุณ', 'Share your artwork')}`}
          </button>
        ) : (
          <button onClick={() => navigate('/login')} style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '12px 28px', borderRadius: 28, fontSize: 15, fontWeight: 800, fontFamily: theme.fontFamily }}>
            {tRaw('เข้าสู่ระบบเพื่อแบ่งปัน', 'Log in to share')}
          </button>
        )}
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 60px' }}>
        {showForm && user && <UploadForm theme={theme} p={p} tRaw={tRaw} onPosted={onPosted} />}

        {/* New creations */}
        <h2 style={{ fontSize: 20, fontWeight: 900, color: theme.textColor, margin: '8px 0 16px' }}>🆕 {tRaw('ผลงานใหม่ล่าสุด', 'New Creations')}</h2>

        {!loading && posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: theme.textColor + '88' }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>🎨</div>
            <h3 style={{ fontWeight: 800, color: theme.textColor }}>{tRaw('ยังไม่มีผลงาน', 'No creations yet')}</h3>
            <p>{tRaw('เป็นคนแรกที่แบ่งปันผลงานระบายสีของคุณ!', 'Be the first to share your colored page!')}</p>
          </div>
        ) : (
          <>
            <div className="cm-grid">
              {posts.map(post => <CommunityCard key={post.id} post={post} />)}
            </div>
            {loading && <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 28 }}>⏳</div>}
            {hasMore && !loading && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button onClick={() => { const np = page + 1; setPage(np); loadPage(np); }}
                  style={{ background: 'transparent', border: `2px solid ${p}`, color: p, cursor: 'pointer', padding: '11px 30px', borderRadius: 24, fontSize: 14, fontWeight: 800, fontFamily: theme.fontFamily }}>
                  {tRaw('ดูเพิ่มเติม', 'View more')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
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
        artwork_url: up.publicUrl,
        thumb_url: upT?.publicUrl || up.publicUrl,
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
    <div style={{ background: 'white', borderRadius: 18, padding: 20, boxShadow: '0 2px 14px rgba(0,0,0,0.06)', marginBottom: 28, border: `1.5px solid ${p}15` }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>🎨 {tRaw('แบ่งปันผลงานของคุณ', 'Share your artwork')}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 18 }} className="cm-form">
        <style>{`@media(max-width:640px){.cm-form{grid-template-columns:1fr!important}}`}</style>

        {/* Left: image */}
        <div>
          <label style={{ display: 'block', cursor: 'pointer' }}>
            <div style={{ aspectRatio: '1', borderRadius: 14, border: `2px dashed ${p}40`, background: preview ? '#000' : p + '08', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {preview ? <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ color: p, fontWeight: 700, fontSize: 13, textAlign: 'center', padding: 16 }}>🖼️ {tRaw('แตะเพื่ออัปโหลดรูปผลงาน', 'Tap to upload artwork')}</span>}
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
          </label>
        </div>

        {/* Right: details */}
        <div>
          {/* Book used */}
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

          {/* Mediums */}
          <TagBlock label={`🎨 ${tRaw('สื่อที่ใช้', 'Medium')}`} options={MEDIUMS} values={mediums} setValues={setMediums} toggle={toggle} addPh={tRaw('เพิ่มสื่อของคุณเอง', 'Add your own medium')} theme={theme} p={p} fld={fld} />
          {/* Markers */}
          <TagBlock label={`🖍️ ${tRaw('ปากกา/ชุดที่ใช้', 'Marker / set used')}`} options={MARKER_EXAMPLES} values={markers} setValues={setMarkers} toggle={toggle} addPh={tRaw('เพิ่มชุดปากกา', 'Add a marker set')} theme={theme} p={p} fld={fld} />
          {/* Palettes */}
          <TagBlock label={`🌷 ${tRaw('พาเลตต์ที่ใช้', 'Palette used')}`} options={PALETTE_EXAMPLES} values={palettes} setValues={setPalettes} toggle={toggle} addPh={tRaw('เพิ่มพาเลตต์', 'Add a palette')} theme={theme} p={p} fld={fld} />

          {/* Caption */}
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

// Predefined chips (multi-select) + custom add input → tag list
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
        {/* custom values not in options */}
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
