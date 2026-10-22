import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';
import { useLang } from '../i18n/LangContext.jsx';

export default function AdminLogin() {
  const { t, tr } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await api('/auth/login', { method: 'POST', body: { email, password } });
      setToken((await res.json()).token);
      nav('/admin');
    } catch (err) {
      setError(tr(err.errors?.[0] || 'Could not reach the server.'));
    }
  }

  return (
    <section className="page"><div className="wrap narrow">
      <h2>{t('login.title')}</h2>
      <form className="card" onSubmit={submit}>
        {error && <div className="errors" role="alert">{error}</div>}
        <label>{t('login.email')}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>{t('login.password')}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="btn">{t('login.submit')}</button>
      </form>
    </div></section>
  );
}
