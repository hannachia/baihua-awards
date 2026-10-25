import { Link } from 'react-router-dom';
import { useLang } from '../i18n/LangContext.jsx';

export default function Footer() {
  const { t } = useLang();
  return (
    <footer>
      <div className="wrap foot">
        <div>
          <div className="brand foot-brand" translate="no">
            <span className="seal" aria-hidden="true">百<br />花</span>
            <span className="brand-text"><b>{t('brand.main')}</b><small>{t('brand.sub')}</small></span>
          </div>
          {t('footer.org')}
        </div>
        <div>{t('footer.place')}<br />
          <Link to="/terms">{t('legal.terms')}</Link> · <Link to="/privacy">{t('legal.privacy')}</Link> · <Link to="/admin/login">{t('footer.login')}</Link></div>
      </div>
    </footer>
  );
}
