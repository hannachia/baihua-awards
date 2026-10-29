import { Link } from 'react-router-dom';
import Media from './Media.jsx';
import { PlayIcon, HeartIcon, StackIcon } from './Icons.jsx';
import { event } from '../data/event.js';
import { clampRatio } from '../utils/media.js';
import { compact } from '../utils/format.js';

// A steady colour for each person's initial, so the same name always gets the same colour
const avatarColor = (name = '') => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 45% 45%)`;
};

// One card in the photo-feed style gallery: cover, small category tag, title, author and hearts
export default function FeedCard({ e, rank, lang, t }) {
  const to = `/watch/${e.id}`;
  const cat = event.categories.find((c) => c.id === e.category);
  const isVideo = e.mediaType === 'video' || e.mediaType === 'demo';
  return (
    <article className="fc">
      <Link to={to} className="fc-cover" style={{ aspectRatio: clampRatio(e.ratio) }} aria-label={e.workTitle}>
        <Media entry={e} thumb />
        {e.imageCount > 1
          ? <span className="fc-play fc-multi" aria-hidden="true"><StackIcon /> {e.imageCount}</span>
          : isVideo && <span className="fc-play" aria-hidden="true"><PlayIcon /></span>}
        <span className="fc-like-ov"><HeartIcon /> {compact(e.voteCount, lang)}</span>
        {rank && <span className="fc-rank">#{rank}</span>}
      </Link>
      <div className="fc-body">
        <span className="fc-tag"><i style={{ background: cat?.color || '#888' }} />{t(`cat.${e.category}.title`)}</span>
        <Link to={to} className="fc-title">{e.workTitle}</Link>
        <div className="fc-foot">
          <span className="fc-user">
            <span className="fc-av" style={{ background: avatarColor(e.name) }} aria-hidden="true">{e.name.slice(0, 1).toUpperCase()}</span>
            <span className="fc-name">{e.name}</span>
          </span>
          <span className="fc-like"><HeartIcon /> {compact(e.voteCount, lang)}</span>
        </div>
      </div>
    </article>
  );
}
