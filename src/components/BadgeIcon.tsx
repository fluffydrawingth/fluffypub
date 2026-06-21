import React from 'react';
import { useTheme } from '../lib/theme';

// Admin-configurable community badge: 🌷 Fluffy Creator / 👤 Community Member.
// Set via Admin → Theme & CMS → Page Sections → Community Badges (emoji or uploaded image).
// An uploaded image overrides the emoji.
export default function BadgeIcon({ affiliate, size = 14 }: { affiliate?: boolean; size?: number }) {
  const { theme } = useTheme();
  const L: any = theme.labels || {};
  const img = affiliate ? L.creator_badge_img : L.customer_badge_img;
  const emoji = (affiliate ? L.creator_badge : L.customer_badge) || (affiliate ? '🌷' : '👤');
  if (img) return <img src={img} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'inline-block', verticalAlign: 'middle' }} />;
  return <span style={{ fontSize: size }}>{emoji}</span>;
}
