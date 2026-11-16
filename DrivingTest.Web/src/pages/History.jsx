import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { examApi, statsApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import Pagination from '../components/Pagination';
import { Empty, ErrorBox, ProgressBar, Spinner } from '../components/Feedback';
import { TOPIC_ICONS, formatDateTime, formatDuration } from '../utils/format';

export default function History() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [page, setPage] = useState(1);

  const stats = useAsync(() => statsApi.me(), [lang]);
  const history = useAsync(() => examApi.history({ page, pageSize: 10 }), [page]);
  const s = stats.data;
  const h = history.data;

  const statusLabel = (a) => (a.status === 'Expired' ? t('history.expired') : a.passed ? t('history.passed') : t('history.failed'));

  return (
    <div className="container page">
      <header className="page-head">
        <h1>{t('history.title')}</h1>
        <p className="muted">{t('history.subtitle')}</p>
      </header>

      {stats.loading && !s && <Spinner />}
      {stats.error && <ErrorBox error={stats.error} onRetry={stats.reload} />}

      {s && (
        <>
          <section className="kpis">
            <div className="kpi"><span>{t('history.attempts')}</span><strong>{s.totalAttempts}</strong></div>
            <div className="kpi"><span>{t('history.passRate')}</span><strong>{s.passRate}%</strong></div>
            <div className="kpi"><span>{t('history.avgScore')}</span><strong>{s.averageScore}</strong></div>
            <div className="kpi"><span>{t('history.bestScore')}</span><strong>{s.bestScore}</strong></div>
          </section>

          <section className="section">
            <div className="card">
              <h3>{t('history.learning')}</h3>
              <div className="learning">
                <div>
                  <ProgressBar value={s.studiedQuestions} max={s.totalQuestions} label={t('history.studied', { done: s.studiedQuestions, total: s.totalQuestions })} />
                  <small className="muted">{t('history.studied', { done: s.studiedQuestions, total: s.totalQuestions })}</small>
                </div>
                <div>
                  <ProgressBar value={s.masteredQuestions} max={s.totalQuestions} tone="success" label={t('history.mastered', { done: s.masteredQuestions, total: s.totalQuestions })} />
                  <small className="muted">{t('history.mastered', { done: s.masteredQuestions, total: s.totalQuestions })}</small>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <h2>{t('history.topicTitle')}</h2>
            <div className="topic-progress">
              {s.topics.map((topic) => (
                <div key={topic.topicId} className="card tp">
                  <div className="tp-head">
                    <span className="topic-icon sm">{TOPIC_ICONS[topic.code] ?? '📗'}</span>
                    <strong>{topic.name}</strong>
                  </div>
                  <div className="tp-row">
                    <span>{t('history.topicLegendStudied')}</span>
                    <small>{topic.studiedQuestions}/{topic.totalQuestions}</small>
                  </div>
                  <ProgressBar value={topic.studiedQuestions} max={topic.totalQuestions} label={t('history.topicLegendStudied')} />
                  <div className="tp-row">
                    <span>{t('history.topicLegendMastered')}</span>
                    <small>{topic.masteredQuestions}/{topic.totalQuestions}</small>
                  </div>
                  <ProgressBar value={topic.masteredQuestions} max={topic.totalQuestions} tone="success" label={t('history.topicLegendMastered')} />
                  <small className="muted">
                    {topic.examQuestions > 0
                      ? t('history.examAccuracy', { correct: topic.examCorrect, total: topic.examQuestions })
                      : t('history.noExam')}
                  </small>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="section">
        <h2>{t('history.recent')}</h2>
        {history.loading && !h && <Spinner />}
        {history.error && <ErrorBox error={history.error} onRetry={history.reload} />}
        {h && h.items.length === 0 && (
          <Empty>
            <p>{t('history.empty')}</p>
            <Link to="/thi" className="btn btn-primary">{t('history.startExam')}</Link>
          </Empty>
        )}
        {h && h.items.length > 0 && (
          <>
            <ul className="attempts">
              {h.items.map((a) => (
                <li key={a.attemptId}>
                  <Link to={`/ket-qua/${a.attemptId}`} className="attempt">
                    <span className={`badge ${a.passed ? 'badge-success' : 'badge-danger'}`}>{statusLabel(a)}</span>
                    <strong className="attempt-score">{a.score ?? 0}/{a.totalQuestions}</strong>
                    <span className="muted">{formatDateTime(a.startedAt, lang)}</span>
                    <span className="muted">⏱ {formatDuration(a.durationSeconds)}</span>
                    <span className="spacer" />
                    <span className="link">{t('history.detail')} →</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={h.page} totalPages={h.totalPages} onChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
