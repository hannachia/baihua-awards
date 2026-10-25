import { Link } from 'react-router-dom';
import Rosette from '../components/Rosette.jsx';
import { event } from '../data/event.js';
import { useLang } from '../i18n/LangContext.jsx';

const range = (n) => Array.from({ length: n }, (_, i) => i);

export default function Home() {
  const { t } = useLang();
  const c = event.contact;
  const tba = t('contact.tba');
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">{t('hero.eyebrow')}</div>
            <h1 translate="no"><span className="h1-a">{t('hero.t1')}</span>{t('hero.t2') && <span className="h1-b">{t('hero.t2')}</span>}</h1>
            <p className="h1-sub" translate="no">{t('hero.subtitle')}</p>
            <p className="tag">{t('hero.tag')}</p>
            <p>{t('hero.intro')}</p>
            <div className="cta">
              <Link className="btn" to="/register">{t('hero.cta')}</Link>
              <Link className="btn ghost" to="/gallery">{t('nav.gallery')}</Link>
            </div>
            <div className="facts">
              {['deadline', 'venue', 'age'].map((k) => (
                <div key={k}><strong>{t(`facts.${k}.value`)}</strong>{t(`facts.${k}.label`)}</div>
              ))}
            </div>
          </div>
          <Rosette />
        </div>
      </section>

      <section className="how">
        <div className="wrap">
          <h2 className="sec">{t('how.title')}</h2>
          <ol className="how-steps">
            {[1, 2, 3].map((n) => (
              <li key={n}><span className="n">{n}</span><h3>{t(`how.${n}.title`)}</h3><p>{t(`how.${n}.text`)}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section id="schedule">
        <div className="wrap">
          <h2 className="sec">{t('schedule.title')}</h2>
          <p className="lede">{t('schedule.lede')}</p>
          <ol className="timeline">
            {range(event.scheduleCount).map((i) => (
              <li key={i}><h3>{t(`sched.${i}.title`)}</h3><small>{t(`sched.${i}.when`)}</small><p>{t(`sched.${i}.text`)}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section id="categories" className="alt">
        <div className="wrap">
          <h2 className="sec">{t('cats.title')}</h2>
          <p className="lede">{t('cats.lede')}</p>
          <div className={`cat-grid n${event.categories.length}`}>
            {event.categories.map((k) => (
              <article key={k.id} className="cat" style={{ '--c': k.color }}>
                <h3>{t(`cat.${k.id}.title`)}</h3><p>{t(`cat.${k.id}.text`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <h2 className="sec">{t('crit.title')}</h2>
          <ul className="list narrow">{range(event.criteriaCount).map((i) => <li key={i}>{t(`crit.${i}`)}</li>)}</ul>
        </div>
      </section>

      <section id="awards" className="dark">
        <div className="wrap">
          <h2 className="sec">{t('awards.title')}</h2>
          <p className="lede">{t('awards.lede')}</p>
          <div className="award-row">
            {range(event.awardCount).map((i) => (
              <div key={i} className={`award m${i}`}><div className="medal" /><h3>{t(`award.${i}.title`)}</h3><p>{t(`award.${i}.text`)}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="ctaband">
            <div><h2>{t('cta.title')}</h2><p>{t('cta.text', { deadline: t('facts.deadline.value') })}</p></div>
            <div className="cta" style={{ marginTop: 0 }}>
              <Link className="btn" to="/register">{t('hero.cta')}</Link>
              <Link className="btn ghost" to="/gallery">{t('nav.gallery')}</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="contact">
        <div className="wrap">
          <h2 className="sec">{t('contact.title')}</h2>
          <dl className="contact">
            {['email', 'wechat', 'person', 'phone', 'address'].map((k) => (
              <div key={k}><dt>{t(`contact.${k}`)}</dt><dd>{c[k] || tba}</dd></div>
            ))}
          </dl>
          <p className="warn">{t('contact.warn')}</p>
        </div>
      </section>
    </>
  );
}
