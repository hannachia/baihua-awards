import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, getViewerToken } from '../api.js';
import Media from '../components/Media.jsx';
import Loader from '../components/Loader.jsx';
import Related from '../components/Related.jsx';
import Comments from '../components/Comments.jsx';
import ShareModal from '../components/ShareModal.jsx';
import { ThumbUp, ThumbDown, ShareIcon } from '../components/Icons.jsx';
import { useLang } from '../i18n/LangContext.jsx';
import { useViewer } from '../ViewerContext.jsx';
import { compact, timeAgo } from '../utils/format.js';

// Where the "Up next" list sits on wide screens: 'left' or 'right' (YouTube uses the right).
const REC_SIDE = 'left';

// The address people share. The preview file opens from disk, so it uses a # address.
const shareUrl = (id) => (import.meta.env.MODE === 'single'
  ? `${window.location.href.split('#')[0]}#/watch/${id}`
  : `${window.location.origin}/watch/${id}`);

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, tr, lang } = useLang();
  const { viewer, openSignIn, signOut } = useViewer();
  const [entry, setEntry] = useState(null);
  const [missing, setMissing] = useState(false);
  const [all, setAll] = useState([]);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [autoplay, setAutoplayState] = useState(() => {
    try { return localStorage.getItem('baihua_autoplay') !== 'off'; } catch { return true; }
  });
  const [theater, setTheater] = useState(() => {
    try { return localStorage.getItem('baihua_theater') === 'on'; } catch { return false; }
  });
  const toggleTheater = () => setTheater((v) => {
    try { localStorage.setItem('baihua_theater', v ? 'off' : 'on'); } catch { /* ignore */ }
    return !v;
  });
  const setAutoplay = (v) => {
    setAutoplayState(v);
    try { localStorage.setItem('baihua_autoplay', v ? 'on' : 'off'); } catch { /* ignore */ }
  };

  // Load the entry. A page visit counts as one view (the server also ignores repeats within 30 minutes,
  // per signed-in account or per visitor). Signing in on this same page does not count a second view.
  const counted = useRef('');
  useEffect(() => {
    setEntry(null); setMissing(false); setError('');
    window.scrollTo(0, 0);
    const viewDone = counted.current === id
      ? Promise.resolve()
      : api(`/gallery/${id}/view`, { method: 'POST', auth: getViewerToken() ? 'viewer' : undefined }).catch(() => {});
    counted.current = id;
    viewDone
      .then(() => api(`/gallery/${id}`, { auth: getViewerToken() ? 'viewer' : undefined }))
      .then((r) => r.json()).then(setEntry).catch(() => setMissing(true));
  }, [id, viewer?.email]);

  // Recommendations: same category first, then the rest, best-voted first
  useEffect(() => {
    api('/gallery?sort=votes').then((r) => r.json()).then((d) => setAll(d.entries)).catch(() => {});
  }, []);
  const others = all.filter((e) => e.id !== id);
  const related = [...others.filter((e) => e.category === entry?.category), ...others.filter((e) => e.category !== entry?.category)].slice(0, 12);

  async function react(kind) { // kind: 'vote' (like) or 'dislike'
    if (!viewer) return openSignIn();
    setError('');
    const active = kind === 'vote' ? entry.hasVoted : entry.hasDisliked;
    try {
      const res = await api(`/gallery/${id}/${kind}`, { method: active ? 'DELETE' : 'POST', auth: 'viewer' });
      const d = await res.json();
      setEntry((e) => ({ ...e, voteCount: d.voteCount, hasVoted: d.hasVoted, hasDisliked: d.hasDisliked }));
    } catch (err) {
      if (err.status === 401) { signOut(); openSignIn(); return; }
      setError(tr(err.errors?.[0] || 'Could not reach the server.'));
    }
  }

  if (missing) return <section className="page"><div className="wrap"><p>{t('watch.notfound')}</p><Link to="/gallery">{t('watch.back')}</Link></div></section>;
  if (!entry) return <section className="page"><div className="wrap"><Loader /></div></section>;

  const open = entry.votingOpen;
  const views = t(entry.viewCount === 1 ? 'watch.view1' : 'watch.views', { n: compact(entry.viewCount, lang) });

  return (
    <section className="page">
      <div className={`wrap wide wlayout rec-${REC_SIDE}${theater ? ' theater' : ''}`}>
        <div className="wmain">
          <Link to="/gallery" className="back">{t('watch.back')}</Link>
          <div className="player">
            <Media entry={entry} autoPlay={!!location.state?.autoplay} theater={theater} onTheater={toggleTheater}
              nextUp={autoplay && related[0] ? { id: related[0].id, title: related[0].workTitle, go: () => navigate(`/watch/${related[0].id}`, { state: { autoplay: true } }) } : null} />
          </div>

          <h2 className="wtitle">{entry.workTitle}</h2>

          <div className="actionbar">
            <div className="chan">
              <span className="avatar lg" aria-hidden="true">{entry.name.slice(0, 1).toUpperCase()}</span>
              <div><b>{entry.name}</b><small>{entry.organization ? `${entry.organization} · ` : ''}{t(`cat.${entry.category}.title`)}</small></div>
            </div>
            <div className="acts">
              <button className={'pill-btn like' + (entry.hasVoted ? ' on' : '')} onClick={() => react('vote')} disabled={!open} aria-pressed={entry.hasVoted}>
                <ThumbUp /> <span>{entry.hasVoted ? t('watch.voted') : t('watch.vote')}</span> <b>{compact(entry.voteCount, lang)}</b>
              </button>
              <button className={'pill-btn' + (entry.hasDisliked ? ' on' : '')} onClick={() => react('dislike')} disabled={!open} aria-pressed={entry.hasDisliked} aria-label={t('watch.dislike')}>
                <ThumbDown />
              </button>
              <button className="pill-btn" onClick={() => setSharing(true)}><ShareIcon /> {t('watch.share')}</button>
            </div>
          </div>
          {error && <div className="errors" role="alert">{error}</div>}
          {!viewer && <p className="notice">{t('watch.needsignin')} <button className="link" onClick={openSignIn}>{t('watch.signin')}</button></p>}

          <div className="infobox">
            <b>{views} · {t('watch.published', { when: timeAgo(entry.publishedAt, lang) })}</b>
            <p className="muted small">{open ? t('watch.likes.hint') : t('watch.closed')}</p>
          </div>
        </div>

        <div className="wcomments"><Comments entryId={id} /></div>
        <Related items={related} autoplay={autoplay} setAutoplay={setAutoplay} />
      </div>

      {sharing && <ShareModal url={shareUrl(id)} title={`${entry.workTitle} · ${t('hero.title')}`} onClose={() => setSharing(false)} />}
    </section>
  );
}
