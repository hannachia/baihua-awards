import { useEffect, useState } from 'react';
import { api, getViewerToken } from '../api.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useViewer } from '../ViewerContext.jsx';
import { timeAgo } from '../utils/format.js';
import { ThumbUp, ThumbDown } from './Icons.jsx';

function Avatar({ name }) {
  return <span className="avatar" aria-hidden="true">{(name || '?').slice(0, 1).toUpperCase()}</span>;
}

// One comment (top level or reply) with like, dislike, reply, report and delete
function Comment({ c, lang, t, onReact, onReply, onDelete, onReport, reported }) {
  return (
    <div className="cm">
      <Avatar name={c.author} />
      <div className="cm-body">
        <div className="cm-head"><b>{c.author}</b> <small>{timeAgo(c.createdAt, lang)}</small></div>
        <p>{c.replyTo && <span className="at">@{c.replyTo} </span>}{c.text}</p>
        <div className="cm-actions">
          <button className={'ico' + (c.myReaction === 1 ? ' on' : '')} onClick={() => onReact(c, c.myReaction === 1 ? 0 : 1)} aria-pressed={c.myReaction === 1} aria-label="Like">
            <ThumbUp width="16" height="16" /> {c.likeCount > 0 && <span>{c.likeCount}</span>}
          </button>
          <button className={'ico' + (c.myReaction === -1 ? ' on' : '')} onClick={() => onReact(c, c.myReaction === -1 ? 0 : -1)} aria-pressed={c.myReaction === -1} aria-label={t('watch.dislike')}>
            <ThumbDown width="16" height="16" />
          </button>
          <button className="textbtn" onClick={() => onReply(c)}>{t('comments.reply')}</button>
          {c.mine
            ? <button className="textbtn" onClick={() => onDelete(c)}>{t('comments.delete')}</button>
            : <button className="textbtn" onClick={() => onReport(c)} disabled={reported}>{reported ? t('comments.reported') : t('comments.report')}</button>}
        </div>
      </div>
    </div>
  );
}

export default function Comments({ entryId }) {
  const { t, tr, lang } = useLang();
  const { viewer, openSignIn, openSetName, signOut } = useViewer();
  const [list, setList] = useState([]);
  const [sort, setSort] = useState('top');
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id (top-level or reply), rootId, author }
  const [replyText, setReplyText] = useState('');
  const [open, setOpen] = useState({});          // which threads show their replies
  const [reported, setReported] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const auth = getViewerToken() ? 'viewer' : undefined;

  function load() {
    api(`/gallery/${entryId}/comments?sort=${sort}`, { auth }).then((r) => r.json()).then(setList).catch(() => {});
  }
  useEffect(load, [entryId, sort, viewer?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  function authError(err) {
    if (err.status === 401) { signOut(); openSignIn(); return; }
    setError(tr(err.errors?.[0] || 'Could not reach the server.'));
  }
  const needSignIn = () => {
    if (!viewer) { openSignIn(); return true; }
    if (!viewer.name) { openSetName(); return true; } // sign-ins from before display names existed
    return false;
  };

  async function post(body, after) {
    if (needSignIn()) return;
    setError(''); setBusy(true);
    try {
      await api(`/gallery/${entryId}/comments`, { method: 'POST', body, auth: 'viewer' });
      after();
      load();
    } catch (err) { authError(err); } finally { setBusy(false); }
  }

  const submitTop = (e) => { e.preventDefault(); post({ text }, () => setText('')); };
  const submitReply = (e) => {
    e.preventDefault();
    post({ text: replyText, parent: replyTo.id }, () => {
      setOpen((o) => ({ ...o, [replyTo.rootId]: true }));
      setReplyTo(null); setReplyText('');
    });
  };

  async function react(c, value) {
    if (needSignIn()) return;
    try {
      await api(`/gallery/comments/${c.id}/react`, { method: 'POST', body: { value }, auth: 'viewer' });
      load();
    } catch (err) { authError(err); }
  }
  async function remove(c) {
    if (!window.confirm(t('comments.confirmDelete'))) return;
    try { await api(`/gallery/comments/${c.id}`, { method: 'DELETE', auth: 'viewer' }); load(); } catch (err) { authError(err); }
  }
  async function report(c) {
    if (needSignIn()) return;
    try { await api(`/gallery/comments/${c.id}/report`, { method: 'POST', auth: 'viewer' }); setReported((r) => ({ ...r, [c.id]: true })); }
    catch (err) { authError(err); }
  }

  const total = list.reduce((n, c) => n + 1 + c.replies.length, 0);
  const startReply = (c, root) => {
    if (needSignIn()) return;
    setReplyTo({ id: c.id, rootId: root.id, author: c.author });
    setReplyText('');
  };

  return (
    <div className="comments-wrap">
      <div className="cm-top">
        <h3>{t('comments.title')} ({total})</h3>
        <div className="chips">
          <button className={'chip' + (sort === 'top' ? ' on' : '')} onClick={() => setSort('top')}>{t('comments.sort.top')}</button>
          <button className={'chip' + (sort === 'new' ? ' on' : '')} onClick={() => setSort('new')}>{t('comments.sort.new')}</button>
        </div>
      </div>

      <form onSubmit={submitTop} className="cform">
        <Avatar name={viewer?.name || viewer?.email} />
        <div className="cform-main">
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={2}
            placeholder={viewer ? t('comments.placeholder') : t('comments.signin')} onFocus={() => { needSignIn(); }} />
          <div className="cform-row"><small className="muted">{text.length}/500</small>
            <button className="btn sm" disabled={busy || !text.trim()}>{t('comments.post')}</button></div>
        </div>
      </form>
      {error && <div className="errors" role="alert">{error}</div>}

      {list.length === 0 && <p className="muted">{t('comments.empty')}</p>}
      {list.map((c) => (
        <div key={c.id} className="thread">
          <Comment c={c} lang={lang} t={t} reported={!!reported[c.id]} onReact={react} onReply={(x) => startReply(x, c)} onDelete={remove} onReport={report} />

          {replyTo?.rootId === c.id && replyTo.id === c.id && (
            <ReplyForm t={t} replyTo={replyTo} text={replyText} setText={setReplyText} onSubmit={submitReply} onCancel={() => setReplyTo(null)} busy={busy} />
          )}

          {c.replies.length > 0 && (
            <button className="textbtn toggle" onClick={() => setOpen((o) => ({ ...o, [c.id]: !o[c.id] }))}>
              {open[c.id] ? '▲ ' + t('comments.hideReplies') : '▼ ' + (c.replies.length === 1 ? t('comments.replies1') : t('comments.replies', { n: c.replies.length }))}
            </button>
          )}
          {open[c.id] && (
            <div className="replies">
              {c.replies.map((r) => (
                <div key={r.id}>
                  <Comment c={r} lang={lang} t={t} reported={!!reported[r.id]} onReact={react} onReply={(x) => startReply(x, c)} onDelete={remove} onReport={report} />
                  {replyTo?.id === r.id && (
                    <ReplyForm t={t} replyTo={replyTo} text={replyText} setText={setReplyText} onSubmit={submitReply} onCancel={() => setReplyTo(null)} busy={busy} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ReplyForm({ t, replyTo, text, setText, onSubmit, onCancel, busy }) {
  return (
    <form onSubmit={onSubmit} className="reply-form">
      <small className="muted">{t('comments.replyto', { name: replyTo.author })}</small>
      <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={2} placeholder={t('comments.placeholder')} />
      <div className="cform-row">
        <button type="button" className="textbtn" onClick={onCancel}>{t('comments.cancel')}</button>
        <button className="btn sm" disabled={busy || !text.trim()}>{t('comments.reply')}</button>
      </div>
    </form>
  );
}
