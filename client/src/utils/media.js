// Makes a small cover picture in the browser, so the gallery has a real picture for every entry
// (many phones show a blank box for a video until it plays). Returns { blob, ratio } or null.
const MAX_WIDTH = 720;

const toJpeg = (source, w, h) => {
  const scale = Math.min(1, MAX_WIDTH / w);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
};

function fromImage(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      const blob = await toJpeg(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(url);
      resolve(blob ? { blob, ratio: img.naturalWidth / img.naturalHeight } : null);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function fromVideo(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    let done = false;
    const finish = (result) => { if (done) return; done = true; URL.revokeObjectURL(url); resolve(result); };
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.onloadedmetadata = () => { v.currentTime = Math.max(0.1, Math.min(1, (v.duration || 2) * 0.1)); };
    v.onseeked = async () => {
      try {
        const blob = await toJpeg(v, v.videoWidth, v.videoHeight);
        finish(blob ? { blob, ratio: v.videoWidth / v.videoHeight } : null);
      } catch { finish(null); }
    };
    v.onerror = () => finish(null);
    setTimeout(() => finish(null), 8000); // never block the form
    v.src = url;
  });
}

export function makePoster(file) {
  if (!file) return Promise.resolve(null);
  if (file.type.startsWith('image/')) return fromImage(file);
  if (file.type.startsWith('video/')) return fromVideo(file);
  return Promise.resolve(null); // PDF: no cover, the gallery shows a placeholder
}

// Keeps card shapes sensible: not thinner than 9:16-ish, not wider than about 16:9
export const clampRatio = (r) => Math.min(1.8, Math.max(0.55, r || 0.75));
