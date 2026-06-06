import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTheme } from '../lib/theme';

export interface CropSettings {
  imageUrl: string;
  cropX: number;      // 0-1 normalized
  cropY: number;      // 0-1 normalized
  zoom: number;       // 1 = original, 2 = 2x zoom
  aspectRatio: number; // width/height, e.g. 16/9
  focalPointX: number; // 0-1 normalized
  focalPointY: number; // 0-1 normalized
  croppedDataUrl?: string; // final output
}

interface Props {
  title: string;
  hint?: string;
  value: CropSettings | null;
  aspectRatio?: number;   // default 16/9
  onChange: (settings: CropSettings | null) => void;
}

const DEFAULT_ASPECT = 16 / 9;

export default function ImageCropEditor({ title, hint, value, aspectRatio = DEFAULT_ASPECT, onChange }: Props) {
  const { theme } = useTheme();
  const [mode, setMode] = useState<'idle' | 'cropping'>('idle');
  const [rawImage, setRawImage] = useState<string | null>(value?.imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop state
  const [zoom, setZoom] = useState(value?.zoom || 1);
  const [offsetX, setOffsetX] = useState(value?.cropX || 0.5);
  const [offsetY, setOffsetY] = useState(value?.cropY || 0.5);
  const [focalX, setFocalX] = useState(value?.focalPointX || 0.5);
  const [focalY, setFocalY] = useState(value?.focalPointY || 0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewW = 480;
  const previewH = Math.round(previewW / aspectRatio);

  // Draw the crop preview onto canvas
  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !rawImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    if (!img || !img.complete) return;

    ctx.clearRect(0, 0, previewW, previewH);

    // The scaled image size at current zoom
    const scaledW = img.naturalWidth * zoom;
    const scaledH = img.naturalHeight * zoom;

    // The offset so that (offsetX, offsetY) is at center of the canvas
    const drawX = previewW / 2 - offsetX * scaledW;
    const drawY = previewH / 2 - offsetY * scaledH;

    ctx.drawImage(img, drawX, drawY, scaledW, scaledH);

    // Draw focal point indicator
    const fpx = offsetX * scaledW + drawX - (focalX - offsetX) * scaledW;
    const fpy = offsetY * scaledH + drawY - (focalY - offsetY) * scaledH;
    // Actually just show focal at the center crosshair
    const cfx = previewW / 2 + (focalX - offsetX) * scaledW;
    const cfy = previewH / 2 + (focalY - offsetY) * scaledH;

    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    // Horizontal
    ctx.beginPath(); ctx.moveTo(cfx - 12, cfy); ctx.lineTo(cfx + 12, cfy); ctx.stroke();
    // Vertical
    ctx.beginPath(); ctx.moveTo(cfx, cfy - 12); ctx.lineTo(cfx, cfy + 12); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(cfx, cfy, 4, 0, Math.PI * 2); ctx.fill();

    // Grid overlay
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(previewW * i / 3, 0); ctx.lineTo(previewW * i / 3, previewH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, previewH * i / 3); ctx.lineTo(previewW, previewH * i / 3); ctx.stroke();
    }
  }, [rawImage, zoom, offsetX, offsetY, focalX, focalY, aspectRatio, previewW, previewH]);

  useEffect(() => {
    if (!rawImage) return;
    if (!imgRef.current) {
      const img = new Image();
      img.onload = () => { imgRef.current = img; drawPreview(); };
      img.src = rawImage;
    } else {
      drawPreview();
    }
  }, [rawImage, drawPreview]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target?.result as string;
      setRawImage(url);
      imgRef.current = null;
      setZoom(1); setOffsetX(0.5); setOffsetY(0.5); setFocalX(0.5); setFocalY(0.5);
      setMode('cropping');
    };
    reader.readAsDataURL(file);
  };

  // Mouse drag to pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !imgRef.current) return;
    const dx = (e.clientX - dragStart.x) / (imgRef.current.naturalWidth * zoom);
    const dy = (e.clientY - dragStart.y) / (imgRef.current.naturalHeight * zoom);
    setOffsetX(prev => Math.max(0, Math.min(1, prev - dx)));
    setOffsetY(prev => Math.max(0, Math.min(1, prev - dy)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Click sets focal point
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging || !imgRef.current) return;
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const scaleX = previewW / rect.width;
    const scaleY = previewH / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const scaledW = imgRef.current.naturalWidth * zoom;
    const scaledH = imgRef.current.naturalHeight * zoom;
    const drawX = previewW / 2 - offsetX * scaledW;
    const drawY = previewH / 2 - offsetY * scaledH;

    const fx = (px - drawX) / scaledW;
    const fy = (py - drawY) / scaledH;
    setFocalX(Math.max(0, Math.min(1, fx)));
    setFocalY(Math.max(0, Math.min(1, fy)));
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(4, prev + delta)));
  };

  const generateCroppedImage = (): string => {
    const canvas = document.createElement('canvas');
    const img = imgRef.current;
    if (!img) return rawImage!;

    canvas.width = previewW;
    canvas.height = previewH;
    const ctx = canvas.getContext('2d')!;

    const scaledW = img.naturalWidth * zoom;
    const scaledH = img.naturalHeight * zoom;
    const drawX = previewW / 2 - offsetX * scaledW;
    const drawY = previewH / 2 - offsetY * scaledH;
    ctx.drawImage(img, drawX, drawY, scaledW, scaledH);

    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const handleSave = () => {
    const croppedDataUrl = generateCroppedImage();
    onChange({
      imageUrl: rawImage!,
      cropX: offsetX, cropY: offsetY,
      zoom, aspectRatio,
      focalPointX: focalX, focalPointY: focalY,
      croppedDataUrl,
    });
    setMode('idle');
  };

  const handleReset = () => {
    onChange(null);
    setRawImage(null);
    imgRef.current = null;
    setMode('idle');
  };

  const p = theme.primaryColor;

  if (mode === 'cropping' && rawImage) {
    return (
      <div style={{ border: `2px solid ${p}20`, borderRadius: 20, overflow: 'hidden', background: '#0f172a' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, color: 'white', fontSize: 15 }}>✂️ Crop — {title}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Drag to pan · Scroll to zoom · Click to set focal point</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMode('idle')} style={{ padding: '8px 16px', borderRadius: 10, background: 'transparent', border: '1px solid #475569', color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
            <button onClick={handleSave} style={{ padding: '8px 16px', borderRadius: 10, background: p, border: 'none', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>✓ Apply Crop</button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ position: 'relative', background: '#0f172a', display: 'flex', justifyContent: 'center', padding: 20 }}>
          <canvas
            ref={previewCanvasRef}
            width={previewW} height={previewH}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
            onWheel={handleWheel}
            style={{
              cursor: isDragging ? 'grabbing' : 'crosshair',
              borderRadius: 12,
              maxWidth: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              display: 'block',
            }}
          />
        </div>

        {/* Controls */}
        <div style={{ padding: '16px 24px 20px', background: '#1e293b', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Zoom: {zoom.toFixed(2)}×</label>
            <input type="range" min="0.5" max="4" step="0.05" value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: p }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Focal: ({(focalX * 100).toFixed(0)}%, {(focalY * 100).toFixed(0)}%)
            </label>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>Click canvas to set focal point. Used for responsive cropping.</div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pan X: {(offsetX * 100).toFixed(0)}%</label>
            <input type="range" min="0" max="1" step="0.01" value={offsetX}
              onChange={e => setOffsetX(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: p }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pan Y: {(offsetY * 100).toFixed(0)}%</label>
            <input type="range" min="0" max="1" step="0.01" value={offsetY}
              onChange={e => setOffsetY(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: p }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Idle / Display mode
  const displayImg = value?.croppedDataUrl || value?.imageUrl || rawImage;

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 }}>{title}</div>
      {hint && <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>{hint}</div>}

      {displayImg ? (
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
          <img src={displayImg} style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 12, display: 'block', border: `2px solid ${p}20` }} />
          {value && (
            <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.65)', borderRadius: 8, padding: '3px 8px', fontSize: 10, color: 'white', fontWeight: 600 }}>
              {value.zoom.toFixed(1)}× · {(value.focalPointX * 100).toFixed(0)},{(value.focalPointY * 100).toFixed(0)}
            </div>
          )}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
        <button onClick={() => fileInputRef.current?.click()} style={{
          padding: '9px 16px', borderRadius: 12,
          border: `2px dashed ${p}50`, background: p + '08',
          color: p, cursor: 'pointer', fontSize: 13, fontWeight: 700,
        }}>
          {displayImg ? '📁 Replace Image' : '📸 Upload Image'}
        </button>
        {displayImg && (
          <>
            <button onClick={() => { if (rawImage) setMode('cropping'); else { const img = new Image(); img.onload = () => { imgRef.current = img; setMode('cropping'); }; img.src = displayImg; setRawImage(displayImg); } }}
              style={{ padding: '9px 16px', borderRadius: 12, border: `1.5px solid ${p}30`, background: 'white', color: p, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              ✂️ Edit Crop
            </button>
            <button onClick={handleReset} style={{ padding: '9px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb', background: 'white', color: '#ef4444', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              🗑️ Remove
            </button>
          </>
        )}
      </div>

      {value && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 10, fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
          crop: ({(value.cropX * 100).toFixed(0)}%, {(value.cropY * 100).toFixed(0)}%) · zoom: {value.zoom.toFixed(2)}× · focal: ({(value.focalPointX * 100).toFixed(0)}%, {(value.focalPointY * 100).toFixed(0)}%)
        </div>
      )}
    </div>
  );
}

// Helper: render an image with saved crop/focal settings via CSS object-position
export function CroppedImage({
  settings, style, alt = '',
}: { settings: CropSettings | null; style?: React.CSSProperties; alt?: string }) {
  if (!settings) return null;

  const src = settings.croppedDataUrl || settings.imageUrl;
  const focalCss = `${(settings.focalPointX * 100).toFixed(0)}% ${(settings.focalPointY * 100).toFixed(0)}%`;

  return (
    <img
      src={src}
      alt={alt}
      style={{
        objectFit: 'cover',
        objectPosition: focalCss,
        ...style,
      }}
    />
  );
}
