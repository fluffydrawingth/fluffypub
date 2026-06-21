// Avatar values can be either an uploaded image URL (Fluffy Creators) or a chosen
// emoji (customers). This helper tells them apart so components render correctly.
export function isImageUrl(v?: string | null): boolean {
  return !!v && /^https?:\/\//i.test(String(v));
}

// Cute emoji avatars customers can pick from.
export const AVATAR_EMOJIS = ['🌷', '🐰', '🐻', '🐱', '🦊', '🐼', '🧸', '🍓', '🌈', '☁️', '⭐️', '🌸'];
