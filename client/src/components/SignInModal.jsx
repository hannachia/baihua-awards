import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLang } from '../i18n/LangContext.jsx';

// Email + 6-digit code sign-in (no password), then a one-time display name
export default function SignInModal({ start = 'email', onSignedIn, onName, onClose }) {
  const { t, tr } = useLang();
  const [step, setStep] = useState(start);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (start === 'name') setStep('name'); }, [start]);

  async function run(fn) {
    setError(''); setBusy(true);
    try { await fn(); } catch (err) { setError(tr(err.errors?.[0] || 'Could not reach the server.')); } finally { setBusy(false); }
  }

  const sendCode = (e) => { e.preventDefault(); run(async () => { await api('/viewers/request-code', { method: 'POST', body: { email } }); setStep('code'); }); };
  const verify = (e) => {
    e.preventDefault();
    run(async () => {
      const data = await (await api('/viewers/verify', { method: 'POST', body: { email, code } })).json();
      onSignedIn(data.email, data.token, data.name);
    });
  };
  const saveName = (e) => {
    e.preventDefault();
    run(async () => {
      const data = await (await api('/viewers/name', { method: 'POST', body: { name }, auth: 'viewer' })).json();
      onName(data.name);
    });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t('auth.title')} onClick={(e) => e.stopPropagation()}>
        <h3>{step === 'name' ? t('auth.name.title') : t('auth.title')}</h3>
        {error && <div className="errors" role="alert">{error}</div>}
        {step === 'email' && (
          <form onSubmit={sendCode}>
            <p className="muted">{t('auth.text')}</p>
            <label>{t('auth.email')}<input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <button className="btn" disabled={busy}>{busy ? t('auth.sending') : t('auth.send')}</button>
          </form>
        )}
        {step === 'code' && (
          <form onSubmit={verify}>
            <p className="muted">{t('auth.sent', { email })}</p>
            <label>{t('auth.code')}<input inputMode="numeric" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value)} /></label>
            <button className="btn" disabled={busy}>{t('auth.verify')}</button>
            <button type="button" className="link" style={{ marginLeft: 16 }} onClick={() => { setStep('email'); setCode(''); setError(''); }}>{t('auth.change')}</button>
          </form>
        )}
        {step === 'name' && (
          <form onSubmit={saveName}>
            <p className="muted">{t('auth.name.text')}</p>
            <label>{t('auth.name')}<input autoFocus maxLength={30} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <button className="btn" disabled={busy || name.trim().length < 2}>{t('auth.name.save')}</button>
          </form>
        )}
        <button type="button" className="modal-x" onClick={onClose} aria-label={t('auth.close')}>×</button>
      </div>
    </div>
  );
}
