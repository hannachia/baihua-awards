import { useLang } from '../i18n/LangContext.jsx';
import { legal } from '../i18n/legal.js';

// kind = 'privacy' or 'terms'
export default function Legal({ kind }) {
  const { lang } = useLang();
  const text = legal[lang];
  const doc = text[kind];
  return (
    <section className="page"><div className="wrap narrow">
      <h2>{doc.title}</h2>
      <p className="warn">{text.draft}</p>
      {doc.sections.map(([heading, ...paragraphs]) => (
        <div key={heading} className="legal-sec">
          <h3>{heading}</h3>
          {paragraphs.map((p) => <p key={p}>{p}</p>)}
        </div>
      ))}
    </div></section>
  );
}
