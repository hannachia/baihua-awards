import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getToken, setToken } from '../api.js';
import { useLang } from '../i18n/LangContext.jsx';
import Loader from '../components/Loader.jsx';

// Organizer tools for one entry: see who voted, remove suspicious votes, hide comments
export default function AdminEntry() {
  const { id } = useParams();
  const { t, tr } = useLang();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const fail = (err) => {
    if (err.status === 401) { setToken(null); nav('/admin/login'); }
    else setError(err.errors?.[0] || 'Something went wrong.');
  };

  useEffect(() => {
    if (!getToken()) return nav('/admin/login');
    api(`/moderation/entries/${id}`, { auth: true }).then((r) => r.json()).then(setData).catch(fail);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function removeVote(voteId) {
    try {
      const res = await api(`/moderation/votes/${voteId}`, { method: 'DELETE', auth: true });
      const d = await res.json();
      setData((x) => ({ ...x, entry: { ...x.entry, voteCount: d.voteCount }, votes: x.votes.filter((v) => v.id !== voteId) }));
    } catch (err) { fail(err); }
  }

  async function toggleHidden(c) {
    try {
      await api(`/moderation/comments/${c.id}`, { method: 'PATCH', body: { hidden: !c.hidden }, auth: true });
      setData((x) => ({ ...x, comments: x.comments.map((k) => (k.id === c.id ? { ...k, hidden: !k.hidden } : k)) }));
    } catch (err) { fail(err); }
  }

  if (error) return <section className="page"><div className="wrap wide"><div className="errors">{tr(error)}</div><Link to="/admin">{t('ae.back')}</Link></div></section>;
  if (!data) return <section className="page"><div className="wrap wide"><Loader /></div></section>;

  return (
    <section className="page"><div className="wrap wide">
      <Link to="/admin">{t('ae.back')}</Link>
      <h2 style={{ marginTop: 16 }}>{data.entry.workTitle}</h2>
      <p className="lede">{data.entry.name} · {t(`cat.${data.entry.category}.title`)} · {data.entry.voteCount} {t('card.votes')} · {data.entry.dislikeCount || 0} {t('ae.dislikes')} · {data.entry.viewCount || 0} {t('ae.views')}</p>

      <h3 style={{ marginTop: 40, marginBottom: 14 }}>{t('ae.votes')} ({data.votes.length})</h3>
      <div className="scroll"><table className="atable">
        <thead><tr><th>{t('ae.viewer')}</th><th>{t('ae.date')}</th><th /></tr></thead>
        <tbody>
          {data.votes.map((v) => (
            <tr key={v.id}>
              <td data-label={t('ae.viewer')}>{v.email}</td>
              <td data-label={t('ae.date')}>{new Date(v.createdAt).toLocaleString()}</td>
              <td><button className="link" onClick={() => removeVote(v.id)}>{t('ae.remove')}</button></td>
            </tr>
          ))}
          {data.votes.length === 0 && <tr><td colSpan="3">{t('ae.novotes')}</td></tr>}
        </tbody>
      </table></div>

      <h3 style={{ marginTop: 40, marginBottom: 14 }}>{t('ae.comments')} ({data.comments.length})</h3>
      <div className="scroll"><table className="atable">
        <thead><tr><th>{t('ae.viewer')}</th><th>{t('ae.comment')}</th><th>{t('ae.date')}</th><th>{t('ae.reports')}</th><th /></tr></thead>
        <tbody>
          {data.comments.map((c) => (
            <tr key={c.id} className={c.hidden ? 'dim' : ''}>
              <td data-label={t('ae.viewer')}>{c.name ? `${c.name} · ` : ''}{c.email}</td>
              <td data-label={t('ae.comment')}>{c.isReply && <small>↳ {t('ae.reply')} </small>}{c.text}</td>
              <td data-label={t('ae.date')}>{new Date(c.createdAt).toLocaleString()}</td>
              <td data-label={t('ae.reports')}>{c.reports > 0 ? <b className="unpaid">{c.reports}</b> : '—'}</td>
              <td><button className="link" onClick={() => toggleHidden(c)}>{c.hidden ? t('ae.show') : t('ae.hide')}</button></td>
            </tr>
          ))}
          {data.comments.length === 0 && <tr><td colSpan="5">{t('ae.nocomments')}</td></tr>}
        </tbody>
      </table></div>
    </div></section>
  );
}
