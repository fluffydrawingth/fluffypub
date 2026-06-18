import { useState, useEffect } from 'react';
import { api } from './api';

// Guidelines = the short bullet list shown before submitting an artist/affiliate request.
// They are stored as a Legal Page (Admin → Legal Pages) keyed by slug, with ONE bullet
// per line in the page's `content`. Admins can edit wording, add / remove / reorder
// bullets by simply editing those lines — no code changes needed.
//
// A built-in default list is used as a fallback whenever the Legal Page doesn't exist
// yet or is unpublished, so the request pages never break or show an empty section.

export type GuidelineSlug = 'artist-guidelines' | 'affiliate-guidelines';

// Strip a leading bullet marker (✓ ✔ - * •) and surrounding whitespace from a line.
function cleanBullet(line: string): string {
  return line.replace(/^\s*[✓✔\-*•]\s*/, '').trim();
}

// Parse a Legal Page's content into bullet strings (one per non-empty line).
export function parseBullets(content: string | null | undefined): string[] {
  if (!content) return [];
  return content
    .split(/\r?\n/)
    .map(cleanBullet)
    .filter(Boolean);
}

/**
 * Load guideline bullets from the CMS Legal Page for `slug`.
 * Falls back to `defaults` when the page is missing, unpublished, or empty.
 * Returns the resolved bullets plus a `loaded` flag.
 */
export function useGuidelines(slug: GuidelineSlug, defaults: string[]) {
  const [bullets, setBullets] = useState<string[]>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    api.getLegalPage(slug)
      .then((page: any) => {
        if (!alive) return;
        const parsed = page && !page.error ? parseBullets(page.content) : [];
        setBullets(parsed.length ? parsed : defaults);
        setLoaded(true);
      })
      .catch(() => { if (alive) { setBullets(defaults); setLoaded(true); } });
    return () => { alive = false; };
  // defaults is a stable literal at call sites; slug drives the fetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return { bullets, loaded };
}
