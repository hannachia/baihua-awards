import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, upload } from '../api.js';
import { fileProblem, acceptFor } from '../fileCheck.js';
import { event } from '../data/event.js';
import { useLang } from '../i18n/LangContext.jsx';
import { money } from '../money.js';

const empty = {
  name: '', age: '', email: '', phone: '', category: 'singing', projectType: 'individual',
  workTitle: '', organization: '', instructor: '', guardianConsent: false, rulesAccepted: false, publicConsent: false
};

export default function Register() {
  const { t, tr, lang } = useLang();
  const [f, setF] = useState(empty);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [cfg, setCfg] = useState({ fees: {}, bankTransfer: false });
  const [currency, setCurrency] = useState('');
  const [pct, setPct] = useState(0);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    api('/config').then((r) => r.json()).then((c) => {
      setCfg(c);
      // Chinese visitors start on CNY, others on EUR if offered, otherwise the first currency
      setCurrency(lang === 'zh' && c.fees?.CNY ? 'CNY' : c.fees?.EUR ? 'EUR' : c.defaultCurrency || Object.keys(c.fees || {})[0] || '');
    }).catch(() => {});
  }, []);

  const codes = Object.keys(cfg.fees || {});
  const feeMinor = cfg.fees?.[currency] || 0;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const minor = f.age !== '' && Number(f.age) < 18;
  const accept = acceptFor(f.category);
  const problem = fileProblem(file, f.category);
  const showProblem = problem && (file || tried);

  async function submit(e) {
    e.preventDefault();
    setErrors([]);
    setTried(true);
    if (problem) { setErrors([t(problem)]); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setPct(0);
    setBusy(true);
    const form = new FormData();
    Object.entries(f).forEach(([k, v]) => form.append(k, v));
    form.append('lang', lang);
    if (currency) form.append('currency', currency);
    if (file) form.append('file', file);
    try {
      const data = await upload('/entries', form, setPct);
      if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; } // go pay
      setDone({ id: data.id, payError: !!data.paymentError });
    } catch (err) {
      setErrors(err.errors || ['Could not reach the server.']);
    } finally {
      setBusy(false);
    }
  }

  async function retryPay() {
    setErrors([]);
    try {
      const res = await api('/payments/retry', { method: 'POST', body: { entryId: done.id, lang } });
      window.location.href = (await res.json()).url;
    } catch (err) { setErrors(err.errors || ['Could not reach the server.']); }
  }

  if (done) {
    return (
      <section className="page"><div className="wrap narrow">
        <h2>{t('done.title')}</h2>
        {done.payError ? (
          <>
            <p className="lede">{t('pay.error')}</p>
            {errors.length > 0 && <div className="errors" role="alert">{errors.map((m) => <div key={m}>{tr(m)}</div>)}</div>}
            <button className="btn" onClick={retryPay}>{t('pay.retry')}</button>
            {cfg.bankTransfer && <Link className="btn ghost" style={{ marginLeft: 12 }} to={`/pay/manual?entry=${done.id}`}>{t('manual.alt')}</Link>}
          </>
        ) : (
          <>
            <p className="lede">{t('done.before')} <b>{done.id}</b>. {t('done.after')}</p>
            <Link className="btn" to="/">{t('done.back')}</Link>
          </>
        )}
      </div></section>
    );
  }

  return (
    <section className="page"><div className="wrap narrow">
      <h2>{t('reg.title')}</h2>
      <p className="lede">{t('reg.lede', { deadline: t('facts.deadline.value') })}</p>
      {feeMinor > 0 && <p className="notice">{t('reg.fee', { amount: money(feeMinor, currency, lang) })}</p>}
      <form className="card" onSubmit={submit} noValidate>
        {errors.length > 0 && <div className="errors" role="alert"><ul>{errors.map((m) => <li key={m}>{tr(m)}</li>)}</ul></div>}
        <div className="two">
          <label>{t('reg.name')}<input value={f.name} onChange={set('name')} /></label>
          <label>{t('reg.age')}<input type="number" min="1" value={f.age} onChange={set('age')} /></label>
          <label>{t('reg.email')}<input type="email" value={f.email} onChange={set('email')} /></label>
          <label>{t('reg.phone')}<input value={f.phone} onChange={set('phone')} /></label>
          <label>{t('reg.category')}
            <select value={f.category} onChange={set('category')}>
              {event.categories.map((k) => <option key={k.id} value={k.id}>{t(`cat.${k.id}.title`)}</option>)}
            </select>
          </label>
          <label>{t('reg.as')}
            <select value={f.projectType} onChange={set('projectType')}>
              {['individual', 'duo-ensemble', 'group', 'school'].map((x) => <option key={x} value={x}>{t(`reg.as.${x}`)}</option>)}
            </select>
          </label>
        </div>
        <label>{t('reg.workTitle')}<input value={f.workTitle} onChange={set('workTitle')} /></label>
        <div className="two">
          <label>{t('reg.organization')}<input value={f.organization} onChange={set('organization')} /></label>
          <label>{t('reg.instructor')}<input value={f.instructor} onChange={set('instructor')} /></label>
        </div>
        <label>
          {t('reg.file')}
          <input type="file" accept={accept} onChange={(e) => setFile(e.target.files[0] || null)} />
          <small>{t('reg.file.hint')}</small>
          {showProblem && <small className="field-error" role="alert">{t(problem)}</small>}
        </label>
        {minor && (
          <label className="check"><input type="checkbox" checked={f.guardianConsent} onChange={set('guardianConsent')} />
            {t('reg.guardian')}</label>
        )}
        <label className="check"><input type="checkbox" checked={f.rulesAccepted} onChange={set('rulesAccepted')} />{t('reg.rules')}</label>
        <label className="check"><input type="checkbox" checked={f.publicConsent} onChange={set('publicConsent')} />{t('reg.public')}</label>
        {codes.length > 1 && (
          <div className="group">
            <span className="gl">{t('reg.currency')}</span>
            <div className="chips">
              {codes.map((c) => (
                <button type="button" key={c} className={'chip' + (currency === c ? ' on' : '')} onClick={() => setCurrency(c)}>
                  {c} · {money(cfg.fees[c], c, lang)}
                </button>
              ))}
            </div>
          </div>
        )}
        {busy && (
          <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
            <div style={{ width: `${pct}%` }} />
            <span>{pct < 100 ? t('reg.progress', { pct }) : t('reg.processing')}</span>
          </div>
        )}
        <p className="muted legal-line">
          {t('reg.legal.pre')}<Link to="/terms">{t('legal.terms')}</Link>{t('reg.legal.mid')}<Link to="/privacy">{t('legal.privacy')}</Link>{t('reg.legal.post')}
        </p>
        <button className="btn" disabled={busy}>{busy ? t('reg.sending') : feeMinor > 0 ? t('reg.submit.pay') : t('reg.submit')}</button>
      </form>
    </div></section>
  );
}
