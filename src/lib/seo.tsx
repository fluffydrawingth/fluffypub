import { useEffect } from 'react';

const SITE_NAME = 'Fluffy Pub';
const DEFAULT_DESCRIPTION = 'Cute coloring books, cozy coloring inspiration, artists, and creative community.';
const DEFAULT_IMAGE = '/og-default.png';

type JsonLd = Record<string, any> | Array<Record<string, any>>;

export type SEOInput = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  robots?: string;
  jsonLd?: JsonLd;
};

function origin() {
  return typeof window === 'undefined' ? 'https://fluffypub.com' : window.location.origin;
}

function cleanText(value?: string, fallback = '') {
  return String(value || fallback).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(url?: string) {
  if (!url) return `${origin()}${DEFAULT_IMAGE}`;
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin()}${url.startsWith('/') ? url : `/${url}`}`;
}

export function canonicalFor(path?: string) {
  const raw = path || (typeof window !== 'undefined' ? window.location.hash.slice(1) || '/' : '/');
  const clean = raw.startsWith('/') ? raw : `/${raw}`;
  return `${origin()}/#${clean}`;
}

function setTag(selector: string, create: () => HTMLMetaElement | HTMLLinkElement, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
}

export function useSEO(input: SEOInput) {
  useEffect(() => {
    const titleText = cleanText(input.title, SITE_NAME);
    const fullTitle = titleText.includes(SITE_NAME) ? titleText : `${titleText} | ${SITE_NAME}`;
    const description = cleanText(input.description, DEFAULT_DESCRIPTION).slice(0, 180) || DEFAULT_DESCRIPTION;
    const canonical = canonicalFor(input.path);
    const image = absoluteUrl(input.image);
    const robots = input.robots || 'index,follow';
    const type = input.type || 'website';

    document.title = fullTitle;
    setTag('meta[name="description"]', () => document.createElement('meta'), { name: 'description', content: description });
    setTag('link[rel="canonical"]', () => document.createElement('link'), { rel: 'canonical', href: canonical });
    setTag('meta[name="robots"]', () => document.createElement('meta'), { name: 'robots', content: robots });

    setTag('meta[property="og:site_name"]', () => document.createElement('meta'), { property: 'og:site_name', content: SITE_NAME });
    setTag('meta[property="og:title"]', () => document.createElement('meta'), { property: 'og:title', content: fullTitle });
    setTag('meta[property="og:description"]', () => document.createElement('meta'), { property: 'og:description', content: description });
    setTag('meta[property="og:image"]', () => document.createElement('meta'), { property: 'og:image', content: image });
    setTag('meta[property="og:url"]', () => document.createElement('meta'), { property: 'og:url', content: canonical });
    setTag('meta[property="og:type"]', () => document.createElement('meta'), { property: 'og:type', content: type });

    setTag('meta[name="twitter:card"]', () => document.createElement('meta'), { name: 'twitter:card', content: 'summary_large_image' });
    setTag('meta[name="twitter:title"]', () => document.createElement('meta'), { name: 'twitter:title', content: fullTitle });
    setTag('meta[name="twitter:description"]', () => document.createElement('meta'), { name: 'twitter:description', content: description });
    setTag('meta[name="twitter:image"]', () => document.createElement('meta'), { name: 'twitter:image', content: image });

    document.head.querySelectorAll('script[data-seo-jsonld="true"]').forEach(el => el.remove());
    const json = input.jsonLd ? (Array.isArray(input.jsonLd) ? input.jsonLd : [input.jsonLd]) : [];
    json.forEach(item => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seoJsonld = 'true';
      script.text = JSON.stringify(item);
      document.head.appendChild(script);
    });
  }, [input.title, input.description, input.path, input.image, input.type, input.robots, JSON.stringify(input.jsonLd || null)]);
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: origin(),
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: origin(),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: canonicalFor(item.path),
    })),
  };
}

export { cleanText, absoluteUrl };
