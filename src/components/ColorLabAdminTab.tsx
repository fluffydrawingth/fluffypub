import React, { useEffect, useMemo, useState } from 'react';
import '../color-lab/index.css';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';
import { setAdminCheck } from '../color-lab/adapters';
import { LocalizationContext, translate, type TranslationKey } from '../color-lab/localization';
import { MarkerReferenceAdmin, MarkerSetAdmin, CuratedPaletteAdmin } from '../color-lab/features/color-lab/admin';

const ADMIN_EMAIL = 'fluffydrawing.th@gmail.com';

type ColorLabAdminSection = 'marker-reference' | 'marker-sets' | 'curated-palettes';

const SECTIONS: { id: ColorLabAdminSection; label: string }[] = [
  { id: 'marker-reference', label: 'Marker Reference' },
  { id: 'marker-sets', label: 'Marker Sets' },
  { id: 'curated-palettes', label: 'Curated Palettes' },
];

/**
 * Admin tab content for AdminPage's "🎨 Color Lab" entry — one tab, not
 * three, with its own internal 3-way sub-nav (Color Lab already has this
 * exact nav shape from its own standalone admin area). Mounting here
 * sits behind AdminPage's own admin redirect (see AdminPage.tsx's
 * top-of-file check), so it's really admin-gated regardless of the
 * `setAdminCheck` sync below — that sync is for consistency with Color
 * Lab's own internal `AdminAccessAdapter` gating (e.g. "Save as curated
 * palette" appearing in the public result panel), not the only line of
 * defense. See fluffy-color-lab's docs/public-admin-separation.md.
 */
export default function ColorLabAdminTab() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [section, setSection] = useState<ColorLabAdminSection>('marker-reference');

  useEffect(() => {
    setAdminCheck(() => user?.role === 'admin' && user?.email === ADMIN_EMAIL);
  }, [user]);

  const localizationValue = useMemo(
    () => ({
      language: lang,
      t: (key: TranslationKey, variables?: Record<string, string | number>) => translate(lang, key, variables),
    }),
    [lang],
  );

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: section === s.id ? 'none' : '1px solid #e5e7eb',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'inherit',
              background: section === s.id ? '#f472b6' : 'white',
              color: section === s.id ? 'white' : '#6b7280',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="color-lab-root">
        <LocalizationContext.Provider value={localizationValue}>
          {section === 'marker-reference' && <MarkerReferenceAdmin onBack={() => {}} />}
          {section === 'marker-sets' && <MarkerSetAdmin />}
          {section === 'curated-palettes' && <CuratedPaletteAdmin />}
        </LocalizationContext.Provider>
      </div>
    </div>
  );
}
