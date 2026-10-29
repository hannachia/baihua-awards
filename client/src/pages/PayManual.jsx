import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { bank, wechatQr } from '../data/payment.js';
import { event } from '../data/event.js';
import { useLang } from '../i18n/LangContext.jsx';
import { money } from '../money.js';
import Loader from '../components/Loader.jsx';

function CopyBtn({ text }) {
  const { t } = useLang();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setDone(true); setTimeout(() => setDone(false), 1800);
  };
  return <button type="button" className="link" onClick={copy}>{done ? t('manual.copied') : t('manual.copy')}</button>;
}

// Bank transfer instructions. An organizer marks the entry as paid after the money arrives.
export default function PayManual() {
  const { t, lang } = useLang();
  const [params] = useSearchParams();
  const entry = params.get('entry');
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!entry) return;
    api(`/payments/status/${entry}`).then((r) => r.json()).then(setInfo).catch(() => setError(true));
  }, [entry]);

  if (error || !entry) return <section className="page"><div className="wrap narrow"><p>{t('watch.notfound')}</p><Link to="/">{t('pay.back')}</Link></div></section>;
  if (!info) return <section className="page"><div className="wrap narrow"><Loader /></div></section>;

  const rows = [
    ['beneficiary', bank.beneficiaryName], ['account', bank.accountNumber], ['bankname', bank.bankName],
    ['bankaddr', bank.bankAddress], ['post', bank.postCode], ['swift', bank.swift]
  ];
  const amount = money(info.amount, info.currency, lang);

  return (
    <section className="page"><div className="wrap narrow">
      <h2>{t('manual.title')}</h2>
      {info.status === 'paid' ? (
        <>
          <p className="lede">{t('manual.paid')}</p>
          <Link className="btn" to="/">{t('pay.back')}</Link>
        </>
      ) : (
        <>
          <p className="lede">{t('manual.lede')}</p>
          <div className="card">
            <p className="muted small">{t('manual.amount')}</p>
            <p className="bigmoney">{amount} <small>{info.currency}</small></p>

            <p className="muted small">{t('manual.ref')}</p>
            <p className="refbox"><b>{info.reference}</b> <CopyBtn text={info.reference} /></p>

            <h3 style={{ marginTop: 28 }}>{t('manual.bank')}</h3>
            <dl className="bankdl">
              {rows.map(([k, v]) => (
                <div key={k}><dt>{t(`manual.${k}`)}</dt><dd>{v} <CopyBtn text={v} /></dd></div>
              ))}
            </dl>
            <p className="notice">{t('manual.fees')}</p>
          </div>

          {wechatQr.enabled && info.currency === 'CNY' && (
            <div className="card">
              <h3>{t('manual.wechat.title')}</h3>
              <img src={wechatQr.image} alt="WeChat Pay QR" className="wxqr" />
              <p className="muted small">{t('manual.wechat.note')}</p>
            </div>
          )}

          <p className="muted">{t('manual.wait')}</p>
          <p className="muted small">{t('manual.proof', { email: event.contact.email || t('contact.tba') })}</p>
          <Link className="btn ghost" to="/">{t('pay.back')}</Link>
        </>
      )}
    </div></section>
  );
}
