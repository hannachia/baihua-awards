import { useLang } from '../i18n/LangContext.jsx';

const cols = ['#C8102E', '#9C7424', '#1F6F6B', '#3C5E9A', '#7A4A8C'];

export default function Rosette() {
  const { t } = useLang();
  return (
    <svg className="rosette" viewBox="0 0 400 400" role="img" aria-label={t('rosette.label')}>
      {Array.from({ length: 12 }, (_, i) => (
        <g key={i} className="petal" style={{ '--i': i, '--r': i * 30 }} transform={`rotate(${i * 30} 200 200)`}>
          <path d="M200 188 C170 140 175 70 200 28 C225 70 230 140 200 188Z" fill={cols[i % 5]} opacity=".9" />
          <path d="M200 175 L200 60" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
        </g>
      ))}
      <circle cx="200" cy="200" r="22" fill="var(--gold)" />
      <circle cx="200" cy="200" r="9" fill="var(--bg)" />
    </svg>
  );
}
