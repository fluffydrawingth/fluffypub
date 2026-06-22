import { useState, useEffect } from 'react';
import { api } from './api';
import { useLang } from './lang';

// Guidelines = the short bullet list shown before submitting an artist/affiliate request.
// They are stored as a Legal Page (Admin → Legal Pages) keyed by slug, with ONE bullet
// per line in the page's `content`. Admins can edit wording, add / remove / reorder
// bullets by simply editing those lines — no code changes needed.
//
// A built-in default list is used as a fallback whenever the Legal Page doesn't exist
// yet or is unpublished, so the request pages never break or show an empty section.

export type GuidelineSlug = 'artist-guidelines' | 'affiliate-guidelines';

// Decode the few HTML entities the rich-text editor commonly emits, and drop tags.
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')          // remove any tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

// Strip a leading bullet marker (✓ ✔ - * •) and surrounding whitespace.
function cleanBullet(line: string): string {
  return line.replace(/^\s*[✓✔\-*•]\s*/, '').trim();
}

// Parse a Legal Page's content into bullet strings. The CMS editor may save EITHER
// plain text (one bullet per line) OR rich HTML (<ul><li>…</li></ul>). Handle both,
// so guidelines always render as clean bullets — never raw markup.
export function parseBullets(content: string | null | undefined): string[] {
  if (!content) return [];

  // HTML list: pull the text out of each <li>.
  if (/<li[\s>]/i.test(content)) {
    const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    return items.map(li => cleanBullet(stripHtml(li))).filter(Boolean);
  }

  // Any other HTML (e.g. <p>…</p> or <br>): split on block tags, then strip.
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return content
      .replace(/<\/(p|div|h[1-6])>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .split(/\r?\n/)
      .map(line => cleanBullet(stripHtml(line)))
      .filter(Boolean);
  }

  // Plain text: one bullet per non-empty line.
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
  const { lang } = useLang();
  const [bullets, setBullets] = useState<string[]>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    // Per-language editable CMS: Thai = "<slug>", English = "<slug>-en".
    // If the language page is empty/missing, fall back to the (already language-correct) defaults.
    const wanted = lang === 'en' ? `${slug}-en` : slug;
    api.getLegalPage(wanted)
      .then((page: any) => {
        if (!alive) return;
        const parsed = page && !page.error ? parseBullets(page.content) : [];
        setBullets(parsed.length ? parsed : defaults);
        setLoaded(true);
      })
      .catch(() => { if (alive) { setBullets(defaults); setLoaded(true); } });
    return () => { alive = false; };
  // defaults is a stable literal at call sites; slug + lang drive the fetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, lang]);

  return { bullets, loaded };
}
