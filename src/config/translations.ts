// ─────────────────────────────────────────────────────────────────────────────
// Fluffy Pub — manual translation dictionary.
//
// Edit the Thai (`th`) values here whenever you want — no code logic to touch.
// `en` is the English label, `th` is the Thai label. The Community UI reads labels
// from here via `useT()` instead of auto-translating.
//
// Brand / medium names are NOT translated (see NO_TRANSLATE) — they always stay in
// English (Ohuhu, Copic, Marker, Acrylic, …).
// ─────────────────────────────────────────────────────────────────────────────

export const TRANSLATIONS: Record<string, { en: string; th: string }> = {
  // Sections / tabs
  all:               { en: 'All',            th: 'ทั้งหมด' },
  gallery:           { en: 'Gallery',        th: 'แกลเลอรีผลงาน' },
  tips_howto:        { en: 'Tips / How to',  th: 'เทคนิคและวิธีระบายสี' },
  cozy_picks:        { en: 'Cozy Picks',     th: 'Cozy Picks' },          // brand-y — keep English
  new_creations:     { en: 'New Creations',  th: 'ผลงานใหม่ล่าสุด' },
  explore:           { en: 'Explore',        th: 'สำรวจ' },
  you_may_also_like: { en: 'You may also like', th: 'คุณอาจชอบ' },
  featured_creators: { en: 'Featured Creators', th: 'ครีเอเตอร์แนะนำ' },

  // Post detail / form fields
  book_used:         { en: 'Book used',       th: 'หนังสือที่ใช้' },
  coloring_details:  { en: 'Coloring details', th: 'รายละเอียดการลงสี' },
  medium:            { en: 'Medium',          th: 'เทคนิคการลงสี' },
  marker_brand:      { en: 'Marker / Brand',  th: 'ยี่ห้ออุปกรณ์' },
  palette:           { en: 'Palette',         th: 'พาเลตต์สี' },
  caption:           { en: 'Caption',         th: 'คำบรรยาย' },
  keywords:          { en: 'Keywords',        th: 'คำค้นหา' },

  // Actions
  save:              { en: 'Save',            th: 'บันทึก' },
  share:             { en: 'Share',           th: 'แชร์' },
  load_more:         { en: 'Load more',       th: 'ดูเพิ่มเติม' },

  // Badges
  how_to:            { en: 'How to',          th: 'How to' },             // keep English
};

// Words that must NEVER be translated — brand & medium names always in English.
export const NO_TRANSLATE = [
  'Ohuhu', 'Copic', 'Prismacolor', 'Foxfeel',
  'Marker', 'Alcohol Marker', 'Acrylic', 'Watercolor', 'Gel Pen', 'Digital',
];

export type TKey = keyof typeof TRANSLATIONS;

import { useLang } from '../lib/lang';

// Hook: const t = useT();  t('cozy_picks') → label in the active language.
// Unknown keys return the key itself (so missing entries are obvious, never blank).
export function useT() {
  const { lang } = useLang();
  return (key: string): string => {
    const entry = (TRANSLATIONS as Record<string, { en: string; th: string }>)[key];
    if (!entry) return key;
    return lang === 'th' ? entry.th : entry.en;
  };
}
