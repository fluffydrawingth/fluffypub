import React, { useEffect, useMemo } from 'react';
import '../color-lab/index.css';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';
import { useRouter } from '../lib/router';
import { useSEO } from '../lib/seo';
import { setAdminCheck } from '../color-lab/adapters';
import { LocalizationContext, translate, type TranslationKey } from '../color-lab/localization';
import { ColorLabPage as ColorLabInner } from '../color-lab/features/color-lab';
// ColorLabTab isn't re-exported from the public barrel (only the ColorLabPage
// component is) — import the type straight from the view module instead.
import type { ColorLabTab } from '../color-lab/app/views/ColorLabView';

const ADMIN_EMAIL = 'fluffydrawing.th@gmail.com';

/** Fluffy Pub's own admin check — the exact rule AdminPage.tsx and Navbar.tsx already use. */
function useSyncAdminCheck() {
  const { user } = useAuth();
  useEffect(() => {
    setAdminCheck(() => user?.role === 'admin' && user?.email === ADMIN_EMAIL);
  }, [user]);
}

function modeToTab(mode: string | undefined): ColorLabTab | undefined {
  if (mode === 'image') return 'from-image';
  if (mode === 'vibe') return 'generate';
  if (mode === 'random') return 'random';
  return undefined;
}

/**
 * Public route: /creative-tools/color-lab (optionally ?mode=image|vibe|random).
 * Bridges Fluffy Pub's own auth + language state into Color Lab's adapters
 * — see fluffy-color-lab's docs/integration-with-fluffypub.md and
 * docs/public-admin-separation.md for why this is the one integration
 * seam (AdminAccessAdapter + LocalizationAdapter) rather than a rewrite
 * of the copied `src/color-lab/` tree.
 */
export default function ColorLabPage() {
  useSyncAdminCheck();
  const { lang } = useLang();
  const { route } = useRouter();

  useSEO({
    title: 'Color Lab — Creative Tools',
    description: 'Extract a palette from a coloring page photo, generate one by vibe, or get a surprise random palette — then match it to your markers.',
    path: '/creative-tools/color-lab',
    type: 'website',
  });

  const localizationValue = useMemo(
    () => ({
      language: lang,
      t: (key: TranslationKey, variables?: Record<string, string | number>) => translate(lang, key, variables),
    }),
    [lang],
  );

  const initialTab = modeToTab(route.params?.mode);

  return (
    <div className="color-lab-root" style={{ minHeight: '60vh' }}>
      <LocalizationContext.Provider value={localizationValue}>
        <ColorLabInner initialTab={initialTab} />
      </LocalizationContext.Provider>
    </div>
  );
}
