import React from 'react';
import { useTheme } from '../lib/theme';

export default function MaintenancePage() {
  const { theme } = useTheme();
  const p = theme.primaryColor;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center', padding: '40px 24px',
      background: `linear-gradient(135deg, ${theme.bgColor} 0%, ${theme.bgColor2} 100%)`,
      fontFamily: theme.fontFamily,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32 }}>
        {theme.logoImageCrop?.croppedDataUrl
          ? <img src={theme.logoImageCrop.croppedDataUrl} alt="logo" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', boxShadow: `0 4px 20px ${p}33` }} />
          : <div style={{ fontSize: 64 }}>{theme.logoEmoji}</div>
        }
        <div style={{ fontSize: 22, fontWeight: 900, color: p, marginTop: 12, fontFamily: theme.fontFamily }}>
          {theme.logoText}
        </div>
      </div>

      {/* Icon */}
      <div style={{ fontSize: 72, marginBottom: 24 }}>🔧</div>

      {/* Title */}
      <h1 style={{ fontSize: 'clamp(22px,5vw,36px)', fontWeight: 900, color: theme.textColor, margin: '0 0 16px', lineHeight: 1.3 }}>
        เว็บไซต์กำลังอยู่ระหว่างปรับปรุง
      </h1>

      {/* Message */}
      <p style={{ fontSize: 'clamp(15px,2.5vw,18px)', color: theme.textColor + 'aa', margin: '0 0 32px', maxWidth: 420, lineHeight: 1.7 }}>
        กรุณากลับมาใหม่อีกครั้งในภายหลัง<br />
        ขอบคุณสำหรับความอดทนของคุณ 🌸
      </p>

      {/* Divider */}
      <div style={{ width: 48, height: 3, background: p, borderRadius: 99, marginBottom: 28, opacity: 0.5 }} />

      {/* Contact */}
      <p style={{ fontSize: 13, color: theme.textColor + '88', margin: 0 }}>
        ติดต่อเราได้ที่&nbsp;
        <a href="mailto:fluffydrawing.th@gmail.com" style={{ color: p, fontWeight: 700, textDecoration: 'none' }}>
          fluffydrawing.th@gmail.com
        </a>
      </p>
    </div>
  );
}
