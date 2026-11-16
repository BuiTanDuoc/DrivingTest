import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { catalogApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { useCountUp } from '../hooks/useCountUp';
import { ErrorBox, Spinner } from '../components/Feedback';
import { TOPIC_ICONS, formatNumber } from '../utils/format';

function Car() {
  return (
    <svg className="car" viewBox="0 0 220 90" aria-hidden="true">
      <path d="M12 60l16-30c3-6 8-9 15-9h74c6 0 12 3 16 8l22 22c14 2 26 5 40 8v14H12z" fill="var(--primary)" />
      <path d="M44 28h34v24H34zM86 28h32c4 0 7 2 10 5l14 19H86z" fill="rgba(255,255,255,.85)" />
      <circle cx="58" cy="72" r="14" fill="#1f2937" /><circle cx="58" cy="72" r="6" fill="#cbd5e1" />
      <circle cx="162" cy="72" r="14" fill="#1f2937" /><circle cx="162" cy="72" r="6" fill="#cbd5e1" />
      <rect x="196" y="52" width="14" height="7" rx="3" fill="#fde047" />
    </svg>
  );
}

function Stat({ value, label, lang }) {
  const shown = useCountUp(value);
  return (
    <div className="stat">
      <div className="stat-value">{formatNumber(shown, lang)}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const stats = useAsync(() => catalogApi.homeStats(), []);
  const topics = useAsync(() => catalogApi.topics(), [lang]);
  const info = useAsync(() => catalogApi.examInfo(), []);
  const s = stats.data;

  return (
    <>
      <section className="hero">
        <div className="road" aria-hidden="true"><div className="road-lines" /></div>
        <div className="container hero-inner">
          <div className="hero-copy fade-up">
            <h1>{t('home.heroTitle')}</h1>
            <p>{t('home.heroSubtitle')}</p>
            <div className="hero-cta">
              <Link to="/hoc" className="btn btn-light btn-lg">{t('home.ctaLearn')}</Link>
              <Link to="/thi" className="btn btn-outline-light btn-lg">{t('home.ctaExam')}</Link>
            </div>
          </div>
          <Car />
        </div>
      </section>

      <div className="container">
        <section className="stats fade-up">
          <Stat value={s?.totalQuestions ?? 0} label={t('home.statsQuestions')} lang={lang} />
          <Stat value={s?.totalAttempts ?? 0} label={t('home.statsAttempts')} lang={lang} />
          <Stat value={s?.totalUsers ?? 0} label={t('home.statsUsers')} lang={lang} />
        </section>

        <section className="section">
          <h2>{t('home.topicsTitle')}</h2>
          <p className="muted">{t('home.topicsSubtitle')}</p>
          {topics.loading && !topics.data && <Spinner />}
          {topics.error && <ErrorBox error={topics.error} onRetry={topics.reload} />}
          <div className="topic-grid">
            {topics.data?.map((topic, i) => (
              <Link key={topic.id} to={`/hoc?topic=${topic.id}`} className="topic-card fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="topic-icon">{TOPIC_ICONS[topic.code] ?? '📗'}</span>
                <h3>{topic.name}</h3>
                <span className="muted">{t('home.questionsCount', { count: topic.questionCount })}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="card exam-info">
            <div>
              <h2>{t('home.examTitle')}</h2>
              <p className="muted">{t('home.examSubtitle')}</p>
            </div>
            {info.data ? (
              <ul className="check-list">
                <li>{t('home.examQuestions', { count: info.data.totalQuestions })}</li>
                <li>{t('home.examDuration', { count: info.data.durationMinutes })}</li>
                <li>{t('home.examPass', { pass: info.data.passScore, total: info.data.totalQuestions })}</li>
                {info.data.minCriticalQuestions > 0 && <li>{t('home.examCritical')}</li>}
                <li>{t('home.examAuto')}</li>
              </ul>
            ) : info.error ? <ErrorBox error={info.error} onRetry={info.reload} /> : <Spinner />}
            <Link to="/thi" className="btn btn-primary">{t('home.ctaExam')}</Link>
          </div>
        </section>
      </div>
    </>
  );
}
