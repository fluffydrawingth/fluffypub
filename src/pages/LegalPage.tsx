import React, { useEffect, useState } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';

export default function LegalPage({ slug }: { slug: string }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { lang } = useLang();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const p = theme.primaryColor;

  useEffect(() => {
    setLoading(true);
    // Per-language CMS: in English, prefer "<slug>-en"; fall back to the base page.
    const load = async () => {
      if (lang === 'en') {
        const en = await api.getLegalPage(`${slug}-en`).catch(() => null);
        if (en && !en.error) { setPage(en); setLoading(false); return; }
      }
      const base = await api.getLegalPage(slug).catch(() => null);
      setPage(base && !base.error ? base : null);
      setLoading(false);
    };
    load();
  }, [slug, lang]);

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>⏳</div>
  );

  if (!page) return (
    <div style={{ fontFamily: theme.fontFamily, textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>📄</div>
      <h1 style={{ color: theme.textColor, fontSize: 28, fontWeight: 900 }}>Page not found</h1>
      <p style={{ color: theme.textColor + '88', marginBottom: 24 }}>This page doesn't exist or isn't published yet.</p>
      <button onClick={() => navigate('/')}
        style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '12px 28px', borderRadius: 24, fontSize: 15, fontWeight: 700, fontFamily: theme.fontFamily }}>
        Go Home
      </button>
    </div>
  );

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 64px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: theme.textColor, margin: '0 0 32px', paddingBottom: 20, borderBottom: `2px solid ${p}18` }}>
          {page.title}
        </h1>
        <div
          className="legal-body"
          style={{ fontSize: 15, lineHeight: 1.9, color: theme.textColor + 'dd' }}
          dangerouslySetInnerHTML={{ __html: page.content || '' }}
        />
        <style>{`
          .legal-body img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
          .legal-body h1 { font-size: 24px; font-weight: 900; margin: 28px 0 12px; color: ${theme.textColor}; }
          .legal-body h2 { font-size: 20px; font-weight: 800; margin: 24px 0 10px; color: ${theme.textColor}; }
          .legal-body h3 { font-size: 17px; font-weight: 700; margin: 18px 0 8px; color: ${theme.textColor}; }
          .legal-body p { margin: 0 0 14px; }
          .legal-body ul, .legal-body ol { padding-left: 24px; margin: 10px 0 14px; }
          .legal-body li { margin: 6px 0; }
          .legal-body a { color: ${p}; }
          .legal-body strong { font-weight: 700; }
          .legal-body em { font-style: italic; }
          .legal-body hr { border: none; border-top: 1px solid ${theme.textColor}18; margin: 24px 0; }
        `}</style>
      </div>
    </div>
  );
}
