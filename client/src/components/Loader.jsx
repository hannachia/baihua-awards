import './Loader.css';
import { useLang } from '../i18n/LangContext.jsx';

// The small version of the loading logo, shown inside a page while its data arrives
export default function Loader({ label = true }) {
  const { t } = useLang();
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader-logo">
        <span className="loader-ring" />
        <span className="loader-seal">百<br />花</span>
      </span>
      {label && <span className="loader-text">{t('gallery.loading')}</span>}
    </div>
  );
}
