// Generate a downscaled thumbnail (and a size-capped full image) entirely in the
// browser, so the community grid loads small images and storage stays cheap even with
// thousands of posts. No server-side processing required.

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function resizeToFile(img: HTMLImageElement, maxEdge: number, name: string, quality = 0.82): Promise<File> {
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) { ctx.drawImage(img, 0, 0, w, h); }
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(new File([blob || file2blob(name)], name, { type: 'image/jpeg' })),
      'image/jpeg',
      quality,
    );
  });
}
function file2blob() { return new Blob([], { type: 'image/jpeg' }); }

/**
 * Returns a { full, thumb } pair of JPEG Files derived from the chosen image.
 *  - full : capped to ~1600px longest edge (keeps detail, avoids huge originals)
 *  - thumb: ~480px longest edge for grids
 * Falls back to the original file for `full` if anything goes wrong.
 */
export async function makeImageVariants(file: File): Promise<{ full: File; thumb: File }> {
  try {
    const img = await loadImage(file);
    const base = (file.name.replace(/\.[^.]+$/, '') || 'art').slice(0, 40);
    const [full, thumb] = await Promise.all([
      resizeToFile(img, 1600, `${base}.jpg`, 0.85),
      resizeToFile(img, 480, `${base}-thumb.jpg`, 0.8),
    ]);
    URL.revokeObjectURL(img.src);
    return { full, thumb };
  } catch {
    return { full: file, thumb: file };
  }
}
