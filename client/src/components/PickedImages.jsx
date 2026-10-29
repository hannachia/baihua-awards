import { useEffect, useMemo } from 'react';
import { useLang } from '../i18n/LangContext.jsx';

// Small previews of the pictures chosen in the form. The first one is the cover.
export default function PickedImages({ files, onRemove }) {
  const { t } = useLang();
  const urls = useMemo(() => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)), [files]);
  useEffect(() => () => urls.forEach((u) => u && URL.revokeObjectURL(u)), [urls]);
  if (!urls.some(Boolean)) return null;
  return (
    <ul className="picked">
      {files.map((f, k) => urls[k] && (
        <li key={`${f.name}-${k}`}>
          <img src={urls[k]} alt="" />
          {k === 0 && <span className="picked-cover">{t('reg.cover')}</span>}
          <button type="button" onClick={() => onRemove(k)} aria-label={t('reg.remove')}>×</button>
        </li>
      ))}
    </ul>
  );
}
