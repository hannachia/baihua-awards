import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, downloadBlob, getToken, setToken } from '../api.js';
import { event } from '../data/event.js';
import { useLang } from '../i18n/LangContext.jsx';
import { money } from '../money.js';

const STATUSES = ['pending', 'shortlisted', 'rejected', 'awarded'];

export default function Admin() {
  const { t, tr, lang } = useLang();
  const [entries, setEntries] = useState(null);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    if (!getToken()) return nav('/admin/login');
    const q = new URLSearchParams();
    if (category) q.set('category', category);
    if (status) q.set('status', status);
    api(`/entries?${q}`, { auth: true })
      .then((r) => r.json())
      .then(setEntries)
      .catch((err) => {
        if (err.status === 401) { setToken(null); nav('/admin/login'); }
        else setError(err.errors?.[0] || 'Could not load entries.');
      });
  }, [category, status, nav]);

  async function changeStatus(id, value) {
    const res = await api(`/entries/${id}/status`, { method: 'PATCH', body: { status: value }, auth: true });
    const updated = await res.json();
    setEntries((list) => list.map((e) => (e._id === id ? { ...e, status: updated.status } : e)));
  }

  async function togglePublish(e) {
    setError('');
    try {
      const res = await api(`/entries/${e._id}/publish`, { method: 'PATCH', body: { published: !e.published }, auth: true });
      const d = await res.json();
      setEntries((list) => list.map((x) => (x._id === e._id ? { ...x, published: d.published } : x)));
    } catch (err) { setError(err.errors?.[0] || 'Could not update.'); }
  }

  async function markPaid(e) {
    if (!window.confirm(t('admin.markpaid.confirm'))) return;
    setError('');
    try {
      await api(`/entries/${e._id}/payment`, { method: 'PATCH', body: { status: 'paid' }, auth: true });
      setEntries((list) => list.map((x) => (x._id === e._id ? { ...x, paymentStatus: 'paid' } : x)));
    } catch (err) { setError(err.errors?.[0] || 'Could not update.'); }
  }

  const th = (k) => t(`admin.th.${k}`);
  const payCell = (e) => (
    <div>
      {e.paymentStatus === 'paid' ? t('admin.pay.paid')
        : e.paymentStatus === 'unpaid' ? <b className="unpaid">{t('admin.pay.unpaid')}</b> : t('admin.pay.free')}
      {e.amount > 0 && <><br /><small>{money(e.amount, e.currency || 'CNY', lang)}</small></>}
      {e.paymentStatus === 'unpaid' && (
        <>
          <br /><small>BH-{String(e._id).slice(-8).toUpperCase()}</small>
          <br /><button className="link" onClick={() => markPaid(e)}>{t('admin.markpaid')}</button>
        </>
      )}
    </div>
  );

  return (
    <section className="page"><div className="wrap wide">
      <div className="bar">
        <h2>{t('admin.title')} {entries && <small>({entries.length})</small>}</h2>
        <div className="bar-actions">
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t('admin.all.cat')}>
            <option value="">{t('admin.all.cat')}</option>
            {event.categories.map((k) => <option key={k.id} value={k.id}>{t(`cat.${k.id}.title`)}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('admin.all.status')}>
            <option value="">{t('admin.all.status')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
          <button className="btn ghost sm" onClick={() => downloadBlob('/entries/export.csv', 'entries.csv')}>{t('admin.export')}</button>
          <button className="btn ghost sm" onClick={() => { setToken(null); nav('/admin/login'); }}>{t('admin.logout')}</button>
        </div>
      </div>
      {error && <div className="errors">{tr(error)}</div>}
      {!entries ? <p>{t('admin.loading')}</p> : entries.length === 0 ? <p>{t('admin.empty')}</p> : (
        <div className="scroll">
          <table className="atable">
            <thead><tr>{['date', 'name', 'category', 'work', 'contact', 'file', 'payment', 'status', 'public', 'votes'].map((k) => <th key={k}>{th(k)}</th>)}</tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e._id}>
                  <td data-label={th('date')}>{new Date(e.createdAt).toLocaleDateString()}</td>
                  <td data-label={th('name')}><div>{e.name}<br /><small>{t(`reg.as.${e.projectType}`)}, {t('admin.age', { age: e.age })}</small></div></td>
                  <td data-label={th('category')}>{t(`cat.${e.category}.title`)}</td>
                  <td data-label={th('work')}>{e.workTitle}</td>
                  <td data-label={th('contact')}><div>{e.email}<br /><small>{e.phone}</small></div></td>
                  <td data-label={th('file')}>{e.file?.originalName
                    ? <button className="link" onClick={() => downloadBlob(`/entries/${e._id}/file`, e.file.originalName)}>{t('admin.download')}</button>
                    : '—'}</td>
                  <td data-label={th('payment')}>{payCell(e)}</td>
                  <td data-label={th('status')}>
                    <select value={e.status} onChange={(ev) => changeStatus(e._id, ev.target.value)} aria-label={`${th('status')}: ${e.name}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                    </select>
                  </td>
                  <td data-label={th('public')}>
                    <div>
                      <button className={'btn sm' + (e.published ? '' : ' ghost')} onClick={() => togglePublish(e)}>
                        {e.published ? t('admin.published') : t('admin.publish')}
                      </button>
                      {!e.publicConsent && <><br /><small>{t('admin.noconsent')}</small></>}
                    </div>
                  </td>
                  <td data-label={th('votes')}><div>{e.voteCount ?? 0}<br /><Link to={`/admin/entry/${e._id}`}>{t('admin.manage')}</Link></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div></section>
  );
}
