import { useEffect, useState } from 'react';
import { useLang } from '../i18n/LangContext.jsx';
import { CloseIcon } from './Icons.jsx';

const enc = encodeURIComponent;

// Copy link + the apps people actually use. Instagram has no web share link, and WeChat only
// works by scanning a QR code, so those two are handled differently (see the notes in the window).
export default function ShareModal({ url, title, onClose }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState('');
  const [showQr, setShowQr] = useState(false);
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  useEffect(() => {
    if (!showQr || qr) return;
    import('qrcode').then((m) => m.toDataURL(url, { margin: 1, width: 220 })).then(setQr).catch(() => {});
  }, [showQr, qr, url]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea'); // older browsers / non-secure pages
      ta.value = url; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const apps = [
    ['facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`],
    ['x', `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`],
    ['whatsapp', `https://wa.me/?text=${enc(`${title} ${url}`)}`],
    ['telegram', `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`],
    ['weibo', `https://service.weibo.com/share/share.php?url=${enc(url)}&title=${enc(title)}`],
    ['email', `mailto:?subject=${enc(title)}&body=${enc(url)}`]
  ];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal share" role="dialog" aria-modal="true" aria-label={t('share.title')} onClick={(e) => e.stopPropagation()}>
        <h3>{t('share.title')}</h3>
        <button type="button" className="modal-x" onClick={onClose} aria-label={t('auth.close')}><CloseIcon /></button>

        <div className="copybox">
          <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label={t('share.copy')} />
          <button className="btn sm" onClick={copy}>{copied ? t('share.copied') : t('share.copy')}</button>
        </div>

        <div className="appgrid">
          {apps.map(([id, href]) => (
            <a key={id} className="appbtn" href={href} target="_blank" rel="noopener noreferrer">{t(`share.${id}`)}</a>
          ))}
          <button type="button" className={'appbtn' + (showQr ? ' on' : '')} onClick={() => setShowQr(!showQr)}>{t('share.wechat')}</button>
          {canNativeShare && (
            <button type="button" className="appbtn" onClick={() => navigator.share({ title, url }).catch(() => {})}>{t('share.more')}</button>
          )}
        </div>

        {showQr && (
          <div className="qrbox">
            {qr ? <img src={qr} alt="QR code" width="180" height="180" /> : <p className="muted">…</p>}
            <p className="muted">{t('share.qr')}</p>
          </div>
        )}
        <p className="muted small">{t('share.instagram')}</p>
      </div>
    </div>
  );
}
