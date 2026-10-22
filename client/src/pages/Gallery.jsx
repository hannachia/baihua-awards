import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Media from '../components/Media.jsx';
import { event } from '../data/event.js';
import { useLang } from '../i18n/LangContext.jsx';
import { compact, timeAgo } from '../utils/format.js';

export default function Gallery() {
  const { t, tr, lang } = useLang();
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState('votes');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null); setError('');
    const q = new URLSearchParams({ sort });
    if (cat) q.set('category', cat);
    api(`/gallery?${q}`).then((r) => r.json()).then(setData)
      .catch((e) => setError(tr(e.errors?.[0] || 'Could not reach the server.')));
  }, [cat, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const needle = search.trim().toLowerCase();
  const shown = data ? data.entries.filter((e) => !needle || `${e.workTitle} ${e.name} ${e.organization || ''}`.toLowerCase().includes(needle)) : [];

  return (
    <section className="page">
      <div className="wrap">
        <h2>{t('gallery.title')}</h2>
        <p className="lede">{t('gallery.lede')}</p>
        {data && !data.votingOpen && <p className="warn">{t('gallery.closed')}</p>}

        <div className="filters">
          <div className="chips">
            <button className={'chip' + (cat === '' ? ' on' : '')} onClick={() => setCat('')}>{t('gallery.all')}</button>
            {event.categories.map((k) => (
              <button key={k.id} className={'chip' + (cat === k.id ? ' on' : '')} onClick={() => setCat(k.id)}>{t(`cat.${k.id}.title`)}</button>
            ))}
          </div>
          <div className="chips">
            {[['votes', 'gallery.sort.votes'], ['views', 'gallery.sort.views'], ['new', 'gallery.sort.new']].map(([k, label]) => (
              <button key={k} className={'chip' + (sort === k ? ' on' : '')} onClick={() => setSort(k)}>{t(label)}</button>
            ))}
          </div>
        </div>
        <div className="gsearch">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('gallery.search')} aria-label={t('gallery.search')} />
        </div>

        {error && <div className="errors">{error}</div>}
        {!data && !error && <p>{t('gallery.loading')}</p>}
        {data && data.entries.length === 0 && <p>{t('gallery.empty')}</p>}
        {data && data.entries.length > 0 && shown.length === 0 && <p>{t('gallery.noresults')}</p>}
        {shown.length > 0 && (
          <div className="vgrid">
            {shown.map((e, i) => (
              <Link key={e.id} to={`/watch/${e.id}`} className="vcard">
                <div className="thumb"><Media entry={e} thumb />{sort === 'votes' && !needle && <span className="rank">#{i + 1}</span>}</div>
                <div className="vbody">
                  <h3>{e.workTitle}</h3>
                  <p>{e.name} · {t(`cat.${e.category}.title`)}</p>
                  <span className="vmeta">{t(e.viewCount === 1 ? 'watch.view1' : 'watch.views', { n: compact(e.viewCount, lang) })} · {timeAgo(e.publishedAt, lang)}</span>
                  <b>{compact(e.voteCount, lang)} {t('card.votes')}</b>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
