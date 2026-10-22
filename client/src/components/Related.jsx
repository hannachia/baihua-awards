import { Link } from 'react-router-dom';
import Media from './Media.jsx';
import { useLang } from '../i18n/LangContext.jsx';
import { compact, timeAgo } from '../utils/format.js';

// "Up next" list with the autoplay switch
export default function Related({ items, autoplay, setAutoplay }) {
  const { t, lang } = useLang();
  return (
    <aside className="wrec" aria-label={t('watch.upnext')}>
      <div className="wrec-head">
        <h3>{t('watch.upnext')}</h3>
        <label className="switch">
          <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} />
          <span>{t('watch.autoplay')}</span>
        </label>
      </div>
      {items.length === 0 && <p className="muted">{t('watch.noreco')}</p>}
      {items.map((e) => (
        <Link key={e.id} to={`/watch/${e.id}`} className="rec">
          <div className="rec-thumb"><Media entry={e} thumb /></div>
          <div className="rec-info">
            <b>{e.workTitle}</b>
            <span>{e.name}</span>
            <span>{t(e.viewCount === 1 ? 'watch.view1' : 'watch.views', { n: compact(e.viewCount, lang) })} · {timeAgo(e.publishedAt, lang)}</span>
          </div>
        </Link>
      ))}
    </aside>
  );
}
