import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLang } from '../i18n/LangContext.jsx';

// Where the payment page sends people back to: /payment/success and /payment/cancel
export default function PaymentResult({ cancelled = false }) {
  const { t, tr, lang } = useLang();
  const [params] = useSearchParams();
  const entry = params.get('entry');
  const [status, setStatus] = useState(cancelled ? 'unpaid' : 'checking');
  const [error, setError] = useState('');

  const [attempt, setAttempt] = useState(0); // raise it to check again
  const [bank, setBank] = useState(false);
  useEffect(() => {
    if (entry) api(`/payments/status/${entry}`).then((r) => r.json()).then((d) => setBank(!!d.bankTransfer)).catch(() => {});
  }, [entry]);

  // After paying, the provider confirms to our server a moment later. Check for about a minute.
  // "stop" makes sure only ONE polling loop runs (React runs effects twice in development).
  useEffect(() => {
    if (cancelled || !entry) return undefined;
    let stop = false;
    let timer;
    let tries = 0;
    setStatus('checking');
    const check = async () => {
      if (stop) return;
      try {
        const d = await (await api(`/payments/status/${entry}`)).json();
        if (stop) return;
        if (d.status === 'paid' || d.status === 'not_required') { setStatus('paid'); return; }
      } catch { /* keep trying */ }
      tries += 1;
      if (tries >= 20) { if (!stop) setStatus('unpaid'); }
      else timer = setTimeout(check, 3000);
    };
    check();
    return () => { stop = true; clearTimeout(timer); };
  }, [cancelled, entry, attempt]);

  async function retry() {
    setError('');
    try {
      const res = await api('/payments/retry', { method: 'POST', body: { entryId: entry, lang } });
      window.location.href = (await res.json()).url;
    } catch (err) { setError(tr(err.errors?.[0] || 'Could not reach the server.')); }
  }

  return (
    <section className="page"><div className="wrap narrow">
      {status === 'checking' && <><h2>{t('pay.success.title')}</h2><p className="lede">{t('pay.waiting')}</p></>}
      {status === 'paid' && (
        <>
          <h2>{t('pay.success.title')}</h2>
          <p className="lede">{t('pay.success.text')}</p>
          <p className="muted">{t('done.before')} <b>{entry}</b></p>
          <Link className="btn" to="/">{t('pay.back')}</Link>
        </>
      )}
      {status === 'unpaid' && (
        <>
          <h2>{cancelled ? t('pay.cancel.title') : t('pay.pending.title')}</h2>
          <p className="lede">{cancelled ? t('pay.cancel.text') : t('pay.pending')}</p>
          {error && <div className="errors" role="alert">{error}</div>}
          <div className="cta">
            {!cancelled && <button className="btn" onClick={() => setAttempt((a) => a + 1)}>{t('pay.recheck')}</button>}
            <button className={cancelled ? 'btn' : 'btn ghost'} onClick={retry}>{t('pay.retry')}</button>
            {bank && <Link className="btn ghost" to={`/pay/manual?entry=${entry}`}>{t('manual.alt')}</Link>}
            <Link className="btn ghost" to="/">{t('pay.back')}</Link>
          </div>
        </>
      )}
    </div></section>
  );
}
