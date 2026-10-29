import { useEffect, useRef, useState } from 'react';
import { API_BASE } from '../api.js';
import { useLang } from '../i18n/LangContext.jsx';
import { clampRatio } from '../utils/media.js';
import { FullscreenIcon, ExitFullscreenIcon, ChevronLeft, ChevronRight } from './Icons.jsx';

// Several photos in one entry: swipe on a phone, arrows or the keyboard on a computer, dots and a counter.
export default function ImageCarousel({ entry }) {
  const { t } = useLang();
  const box = useRef(null);
  const track = useRef(null);
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  const n = entry.imageCount;
  const src = (k) => entry.demoImages?.[k] || `${API_BASE}/gallery/${entry.id}/image/${k}`;

  const go = (k) => {
    const el = track.current;
    if (el) el.scrollTo({ left: Math.max(0, Math.min(n - 1, k)) * el.clientWidth, behavior: 'smooth' });
  };
  const onScroll = () => { const el = track.current; if (el) setI(Math.round(el.scrollLeft / el.clientWidth)); };
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
  };
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else box.current?.requestFullscreen?.().catch(() => {});
  };
  useEffect(() => {
    const h = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  return (
    <div ref={box} className={'carousel' + (full ? ' full' : '')} style={{ '--ar': clampRatio(entry.ratio) }} tabIndex={0} onKeyDown={onKey}>
      <div ref={track} className="slides" onScroll={onScroll}>
        {Array.from({ length: n }, (_, k) => (
          <div className="slide" key={k} onDoubleClick={toggleFull}>
            <img src={src(k)} alt={`${entry.workTitle} ${k + 1}/${n}`} loading={k === 0 ? 'eager' : 'lazy'} draggable="false" />
          </div>
        ))}
      </div>
      <span className="car-count" aria-live="polite">{i + 1}/{n}</span>
      <button className="car-full" onClick={toggleFull} aria-label={t('carousel.full')}>{full ? <ExitFullscreenIcon /> : <FullscreenIcon />}</button>
      {i > 0 && <button className="car-arrow prev" onClick={() => go(i - 1)} aria-label={t('carousel.prev')}><ChevronLeft width="28" height="28" /></button>}
      {i < n - 1 && <button className="car-arrow next" onClick={() => go(i + 1)} aria-label={t('carousel.next')}><ChevronRight width="28" height="28" /></button>}
      <div className="car-dots">
        {Array.from({ length: n }, (_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => go(k)} aria-label={`${k + 1}/${n}`} />)}
      </div>
    </div>
  );
}
