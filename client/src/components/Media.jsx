import { event } from '../data/event.js';
import { API_BASE } from '../api.js';
import VideoPlayer from './VideoPlayer.jsx';

// Shows an entry's video or image from the public API.
// thumb = small picture for lists. Otherwise the full player (with theater/next-up options).
export default function Media({ entry, thumb = false, autoPlay = false, theater = false, onTheater, nextUp }) {
  if (entry.mediaType === 'demo') {
    const k = event.categories.find((c) => c.id === entry.category);
    return <div className="media-demo" style={{ background: k?.color }}><span>{k?.glyph}</span></div>;
  }
  const src = entry.demoSrc || `${API_BASE}/gallery/${entry.id}/file`;
  if (entry.mediaType === 'video') {
    return thumb
      ? <video src={`${src}#t=0.5`} preload="metadata" muted playsInline />
      : <VideoPlayer src={src} autoPlay={autoPlay} theater={theater} onTheater={onTheater} nextUp={nextUp} />;
  }
  if (entry.mediaType === 'image') return <img src={src} alt={entry.workTitle} loading={thumb ? 'lazy' : undefined} />;
  return <div className="media-other">{entry.workTitle}</div>;
}
