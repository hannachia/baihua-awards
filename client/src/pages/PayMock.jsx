import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLang } from '../i18n/LangContext.jsx';
import { money } from '../money.js';

// TEST payment page (PAYMENT_PROVIDER=mock). Replaced by Stripe's own page in production.
export default function PayMock() {
  const { t, tr, lang } = useLang();
  const [params] = useSearchParams();
  const entry = params.get('entry');
  const nav = useNavigate();
  const [info, setInfo] = useState({ amount: 0, currency: 'CNY' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api(`/payments/status/${entry}`).then((r) => r.json()).then(setInfo).catch(() => {}); }, [entry]);

  async function pay() {
    setBusy(true); setError('');
    try {
      await api('/payments/mock/confirm', { method: 'POST', body: { entryId: entry } });
      nav(`/payment/success?entry=${entry}`);
    } catch (err) { setError(tr(err.errors?.[0] || 'Could not reach the server.')); setBusy(false); }
  }

  return (
    <section className="page"><div className="wrap narrow">
      <h2>{t('pay.mock.title')}</h2>
      <p className="warn">{t('pay.mock.note')}</p>
      <div className="card">
        <p className="muted">{t('pay.mock.amount')}</p>
        <p style={{ font: '700 3rem var(--serif)', margin: '0 0 24px' }}>{money(info.amount, info.currency, lang)} <small style={{ fontSize: '1rem', color: 'var(--muted)' }}>{info.currency}</small></p>
        {error && <div className="errors" role="alert">{error}</div>}
        <div className="cta" style={{ marginTop: 0 }}>
          <button className="btn" onClick={pay} disabled={busy}>{t('pay.mock.wechat')}</button>
          <button className="btn ghost" onClick={pay} disabled={busy}>{t('pay.mock.card')}</button>
        </div>
      </div>
    </div></section>
  );
}
