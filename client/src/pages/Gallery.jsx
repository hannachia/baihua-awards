import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import FeedCard from '../components/FeedCard.jsx';
import { SearchIcon } from '../components/Icons.jsx';
import { event } from '../data/event.js';
import { useLang } from '../i18n/LangContext.jsx';
import { clampRatio } from '../utils/media.js';

const columnsFor = (w) => (w < 520 ? 2 : w < 700 ? 3 : 5);

function useWidth() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return w;
}

// Phones: a photo feed. Each card goes into the shortest column, so the order still reads left to right
function distribute(items, n) {
  const cols = Array.from({ length: n }, () => ({ h: 0, list: [] }));
  items.forEach((item, index) => {
    const col = cols.reduce((a, b) => (b.h < a.h ? b : a));
    col.list.push({ item, index });
    col.h += 1 / clampRatio(item.ratio) + 0.55; // picture height + about the height of the text below it
  });
  return cols.map((c) => c.list);
}

export default function Gallery() {
  const { t, tr, lang } = useLang();
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState('votes');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const width = useWidth();
  const desktop = width >= 700;
  const cols = columnsFor(width);

  useEffect(() => {
    setData(null); setError('');
    const q = new URLSearchParams({ sort });
    if (cat) q.set('category', cat);
    api(`/gallery?${q}`).then((r) => r.json()).then(setData)
      .catch((e) => setError(tr(e.errors?.[0] || 'Could not reach the server.')));
  }, [cat, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const needle = search.trim().toLowerCase();
  const shown = useMemo(
    () => (data ? data.entries.filter((e) => !needle || `${e.workTitle} ${e.name} ${e.organization || ''}`.toLowerCase().includes(needle)) : []),
    [data, needle]
  );
  const columns = useMemo(() => distribute(shown, cols), [shown, cols]);
  const showRank = sort === 'votes' && !needle;
  const card = (item, index) => <FeedCard key={item.id} e={item} rank={showRank && index < 3 ? index + 1 : null} lang={lang} t={t} />;

  return (
    <section className="page feed">
      <div className="wrap wide">
        <h2 className="feed-title">{t('gallery.title')}</h2>
        <p className="lede feed-lede">{t('gallery.lede')}</p>
        {data && !data.votingOpen && <p className="warn">{t('gallery.closed')}</p>}

        <div className="feed-top">
          <div className="tabs" role="tablist">
            {[{ id: '', label: t('gallery.all') }, ...event.categories.map((k) => ({ id: k.id, label: t(`cat.${k.id}.title`) }))].map((tab) => (
              <button key={tab.id || 'all'} role="tab" aria-selected={cat === tab.id} className={'tab' + (cat === tab.id ? ' on' : '')} onClick={() => setCat(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>
          <button className={'icon-btn' + (searchOpen ? ' on' : '')} onClick={() => { setSearchOpen((o) => !o); if (searchOpen) setSearch(''); }} aria-label={t('gallery.search')} aria-pressed={searchOpen}>
            <SearchIcon />
          </button>
        </div>

        {searchOpen && (
          <div className="gsearch">
            <input type="search" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('gallery.search')} aria-label={t('gallery.search')} />
          </div>
        )}

        <div className="subsort">
          {[['votes', 'gallery.sort.votes'], ['views', 'gallery.sort.views'], ['new', 'gallery.sort.new']].map(([k, label]) => (
            <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{t(label)}</button>
          ))}
        </div>

        {error && <div className="errors">{error}</div>}
        {!data && !error && (
          desktop ? (
            <div className="pcgrid" aria-busy="true">
              {Array.from({ length: 10 }, (_, i) => <div key={i} className="fc fc-skel"><div className="fc-cover" /><div className="fc-body"><span className="skel-line" /><span className="skel-line short" /></div></div>)}
            </div>
          ) : (
            <div className="masonry" aria-busy="true">
              {Array.from({ length: cols }, (_, i) => (
                <div className="mcol" key={i}>
                  {[0.75, 1, 0.8].map((r, j) => <div key={j} className="fc fc-skel"><div className="fc-cover" style={{ aspectRatio: r + (i % 2 ? 0.2 : 0) }} /><div className="fc-body"><span className="skel-line" /><span className="skel-line short" /></div></div>)}
                </div>
              ))}
            </div>
          )
        )}
        {data && data.entries.length === 0 && <p>{t('gallery.empty')}</p>}
        {data && data.entries.length > 0 && shown.length === 0 && <p>{t('gallery.noresults')}</p>}
        {shown.length > 0 && (desktop
          ? <div className="pcgrid">{shown.map((item, index) => card(item, index))}</div>
          : (
            <div className="masonry">
              {columns.map((col, i) => <div className="mcol" key={i}>{col.map(({ item, index }) => card(item, index))}</div>)}
            </div>
          ))}
      </div>
    </section>
  );
}
