import React, { useEffect, useMemo, useState } from 'react';
import '../color-lab/index.css';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';
import { useRouter } from '../lib/router';
import { useSEO } from '../lib/seo';
import { api } from '../lib/api';
import { setAdminCheck, setSignedInCheck, setSignInRequestHandler } from '../color-lab/adapters';
import { LocalizationContext, translate, type TranslationKey } from '../color-lab/localization';
import { ColorLabPage as ColorLabInner, loadImageFromUrl, type UploadedImage } from '../color-lab/features/color-lab';
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

/** Bridges Fluffy Pub's real sign-in state into favorite-palettes' AuthAccessAdapter — same pattern as useSyncAdminCheck. */
function useSyncAuthCheck() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  useEffect(() => {
    setSignedInCheck(() => !!user);
    setSignInRequestHandler(() => navigate('/login'));
  }, [user, navigate]);
}

function modeToTab(mode: string | undefined): ColorLabTab | undefined {
  if (mode === 'image') return 'from-image';
  if (mode === 'vibe') return 'generate';
  if (mode === 'random') return 'random';
  return undefined;
}

/**
 * Loads a Community post's photo into an UploadedImage when the route
 * carries ?post=<id> — this is the CommunityImageSourceAdapter
 * implementation fluffy-color-lab's docs/integration-with-fluffypub.md
 * anticipated: resolve the post id off the route via the existing
 * api.getCommunityPost(id), then build the UploadedImage with
 * loadImageFromUrl (crossOrigin: 'anonymous', works because Community
 * post photos already send permissive CORS headers — see
 * CommunityPostPage's own cross-origin canvas usage for watermarking).
 */
function useCommunityPostImage(postId: string | undefined) {
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      setImage(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setImage(null);
    setError(null);
    api
      .getCommunityPost(postId)
      .then((post: any) => {
        if (cancelled) return;
        const url = post?.artwork_urls?.[0] || post?.artwork_url;
        if (!url) throw new Error('That post has no photo to pull colors from.');
        return loadImageFromUrl(url, `community-post-${postId}`);
      })
      .then((loaded) => {
        if (cancelled || !loaded) return;
        setImage(loaded);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load that post’s photo.');
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return { image, error };
}

/**
 * Public route: /creative-tools/color-lab (optionally ?mode=image|vibe|random,
 * or ?post=<communityPostId> to jump straight into an auto-extracted palette
 * from that post's photo).
 * Bridges Fluffy Pub's own auth + language state into Color Lab's adapters
 * — see fluffy-color-lab's docs/integration-with-fluffypub.md and
 * docs/public-admin-separation.md for why this is the one integration
 * seam (AdminAccessAdapter + AuthAccessAdapter + LocalizationAdapter)
 * rather than a rewrite of the copied `src/color-lab/` tree.
 */
export default function ColorLabPage() {
  useSyncAdminCheck();
  useSyncAuthCheck();
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

  const postId: string | undefined = route.params?.post || undefined;
  const { image: postImage, error: postImageError } = useCommunityPostImage(postId);
  const initialTab = modeToTab(route.params?.mode);

  return (
    <div className="color-lab-root" style={{ minHeight: '60vh' }}>
      <LocalizationContext.Provider value={localizationValue}>
        {postId && !postImage && !postImageError && (
          <p style={{ textAlign: 'center', color: '#8a8290', fontSize: 14, padding: '12px 0' }}>
            Loading your post's photo…
          </p>
        )}
        {postImageError && (
          <p style={{ textAlign: 'center', color: '#c0392b', fontSize: 14, padding: '12px 0' }}>{postImageError}</p>
        )}
        <ColorLabInner initialTab={postImage ? 'from-image' : initialTab} initialImage={postImage ?? undefined} />
      </LocalizationContext.Provider>
    </div>
  );
}
