import { event } from '../data/event.js';
import { API_BASE } from '../api.js';
import VideoPlayer from './VideoPlayer.jsx';
import ImageCarousel from './ImageCarousel.jsx';

// Shows an entry's video or image from the public API.
// thumb = small picture for lists. Otherwise the full player (with theater/next-up options).
export default function Media({ entry, thumb = false, autoPlay = false, theater = false, onTheater, nextUp }) {
  if (entry.mediaType === 'demo') {
    const k = event.categories.find((c) => c.id === entry.category);
    return <div className="media-demo" style={{ background: k?.color }}><span>{k?.glyph}</span></div>;
  }
  const src = entry.demoSrc || `${API_BASE}/gallery/${entry.id}/file`;
  const poster = entry.demoPoster || (entry.hasPoster ? `${API_BASE}/gallery/${entry.id}/poster` : undefined);
  if (entry.mediaType === 'video') {
    if (thumb) return poster ? <img src={poster} alt="" loading="lazy" /> : <video src={`${src}#t=0.5`} preload="metadata" muted playsInline />;
    return <VideoPlayer src={src} poster={poster} autoPlay={autoPlay} theater={theater} onTheater={onTheater} nextUp={nextUp} />;
  }
  if (entry.mediaType === 'image' && entry.imageCount > 1 && !thumb) return <ImageCarousel entry={entry} />;
  if (entry.mediaType === 'image') return <img src={thumb && poster ? poster : src} alt={entry.workTitle} loading={thumb ? 'lazy' : undefined} />;
  return <div className="media-other">{entry.workTitle}</div>;
}
