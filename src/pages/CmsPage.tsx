import React, { useEffect, useState } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';

export default function CmsPage({ slug }: { slug: string }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pages?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => { setPage(d.error ? null : d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>⏳</div>
  );

  if (!page) return (
    <div style={{ fontFamily: theme.fontFamily, textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>😢</div>
      <h1 style={{ color: theme.textColor, fontSize: 28, fontWeight: 900 }}>404 — Page not found</h1>
      <p style={{ color: theme.textColor + '88', marginBottom: 24 }}>This page doesn't exist or isn't published.</p>
      <button onClick={() => navigate('/')}
        style={{ background: theme.primaryColor, color: 'white', border: 'none', cursor: 'pointer', padding: '12px 28px', borderRadius: 24, fontSize: 15, fontWeight: 700, fontFamily: theme.fontFamily }}>
        Go Home
      </button>
    </div>
  );

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 60px' }}>
        {page.image_url && (
          <img src={page.image_url} alt={page.title}
            style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 16, marginBottom: 32 }} />
        )}
        <h1 style={{ fontSize: 32, fontWeight: 900, color: theme.textColor, margin: '0 0 8px' }}>{page.title}</h1>
        <div style={{ fontSize: 12, color: theme.textColor + '55', marginBottom: 32 }}>
          {new Date(page.updated_at || page.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div style={{ fontSize: 16, lineHeight: 1.9, color: theme.textColor + 'dd', whiteSpace: 'pre-wrap' as const }}>
          {page.content}
        </div>
      </div>
    </div>
  );
}
