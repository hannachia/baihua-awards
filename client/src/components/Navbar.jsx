import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLang } from '../i18n/LangContext.jsx';
import { useViewer } from '../ViewerContext.jsx';

export default function Navbar() {
  const { lang, setLang, t } = useLang();
  const { viewer, openSignIn, signOut } = useViewer();
  const navigate = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Scroll to a section of the home page (works with BrowserRouter and HashRouter)
  const go = (id) => (e) => {
    e.preventDefault();
    close();
    const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    if (loc.pathname === '/') scroll();
    else { navigate('/'); setTimeout(scroll, 80); }
  };

  const links = (
    <>
      <a href="#schedule" onClick={go('schedule')}>{t('nav.schedule')}</a>
      <a href="#categories" onClick={go('categories')}>{t('nav.categories')}</a>
      <a href="#awards" onClick={go('awards')}>{t('nav.awards')}</a>
      <Link to="/gallery" onClick={close}>{t('nav.gallery')}</Link>
      <a href="#contact" onClick={go('contact')}>{t('nav.contact')}</a>
    </>
  );
  const sign = viewer
    ? <button className="lang" onClick={() => { signOut(); close(); }} title={t('auth.signedin', { email: viewer.name || viewer.email })}>{t('auth.signout')}</button>
    : <button className="lang" onClick={() => { openSignIn(); close(); }}>{t('watch.signin')}</button>;
  const langBtn = <button className="lang" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} aria-label="Switch language">{lang === 'zh' ? 'EN' : '中文'}</button>;

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link className="brand" to="/" translate="no" onClick={close}>
          <span className="seal" aria-hidden="true">百<br />花</span>
          <span className="brand-text"><b>{t('hero.t1')}</b><small>{t('hero.t2')}</small></span>
        </Link>
        <nav aria-label="Main" className="desk">{links}</nav>
        <div className="nav-right">
          <span className="desk-only">{sign}{langBtn}</span>
          <Link className="btn sm" to="/register" onClick={close}>{t('nav.register')}</Link>
          <button className="burger" aria-label={t('menu')} aria-expanded={open} onClick={() => setOpen(!open)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
      {open && (
        <div className="mobile-menu">
          <nav aria-label="Mobile">{links}</nav>
          <div className="mobile-actions">{sign}{langBtn}</div>
        </div>
      )}
    </header>
  );
}
