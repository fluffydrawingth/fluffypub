import React, { useState, useRef } from 'react';

// Swipeable image carousel with arrows + dots. Works for cards (cover) and detail (contain).
export default function ImageCarousel({
  images,
  fit = 'cover',
  ratio = '125%',          // padding-bottom for cover mode (4:5). Ignored when fit='contain' + auto height.
  rounded = 0,
  onImageClick,
  stopPropagation = false,
  thumbnails = false,
  priority = false,
}: {
  images: string[];
  fit?: 'cover' | 'contain';
  ratio?: string;
  rounded?: number;
  onImageClick?: () => void;
  stopPropagation?: boolean;
  thumbnails?: boolean;
  priority?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const touchX = useRef<number | null>(null);
  const list = images && images.length ? images : [];
  const n = list.length;
  const single = n <= 1;

  const go = (e: React.MouseEvent, dir: number) => {
    if (stopPropagation) e.stopPropagation();
    e.preventDefault();
    setIdx(i => (i + dir + n) % n);
  };

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null || single) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) setIdx(i => (i + (dx < 0 ? 1 : -1) + n) % n);
    touchX.current = null;
  };

  if (!n) return null;

  const arrowBtn = (side: 'left' | 'right', dir: number) => (
    <button
      onClick={(e) => go(e, dir)}
      aria-label={dir < 0 ? 'Previous' : 'Next'}
      style={{
        position: 'absolute', top: '50%', [side]: 8, transform: 'translateY(-50%)',
        width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'rgba(0,0,0,0.45)', color: 'white', fontSize: 15, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3,
      }}
    >{dir < 0 ? '‹' : '›'}</button>
  );

  if (fit === 'contain') {
    // Detail mode: natural height, single image visible, optional thumbnail strip (3+ images)
    return (
      <div>
        <div style={{ position: 'relative', width: '100%', borderRadius: rounded, overflow: 'hidden', background: '#0000000a' }}
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <img src={list[idx]} alt="" loading={priority ? 'eager' : 'lazy'} decoding="async" onClick={onImageClick} style={{ width: '100%', display: 'block', cursor: onImageClick ? 'zoom-in' : 'default' }} />
          {!single && <>
            {arrowBtn('left', -1)}
            {arrowBtn('right', 1)}
            <Dots n={n} idx={idx} />
            <Counter idx={idx} n={n} />
          </>}
        </div>
        {thumbnails && n >= 3 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {list.map((src, i) => (
              <button key={i} onClick={() => setIdx(i)} aria-label={`Image ${i + 1}`}
                style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 8, overflow: 'hidden', border: i === idx ? '2.5px solid #ec4899' : '1.5px solid #e5e7eb', cursor: 'pointer', padding: 0, background: 'none' }}>
                <img src={src} alt="" loading="lazy" decoding="async" width={56} height={56} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: i === idx ? 1 : 0.7 }} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Cover mode (cards): fixed ratio
  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: ratio, borderRadius: rounded, overflow: 'hidden' }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <img src={list[idx]} alt="" loading={priority ? 'eager' : 'lazy'} decoding="async" onClick={onImageClick} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      {!single && <>
        {arrowBtn('left', -1)}
        {arrowBtn('right', 1)}
        <Dots n={n} idx={idx} />
        <Counter idx={idx} n={n} />
      </>}
    </div>
  );
}

function Dots({ n, idx }: { n: number; idx: number }) {
  return (
    <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, zIndex: 3 }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === idx ? 'white' : 'rgba(255,255,255,0.5)', boxShadow: '0 0 2px rgba(0,0,0,0.4)' }} />
      ))}
    </div>
  );
}

function Counter({ idx, n }: { idx: number; n: number }) {
  return (
    <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, zIndex: 3 }}>
      {idx + 1}/{n}
    </div>
  );
}
