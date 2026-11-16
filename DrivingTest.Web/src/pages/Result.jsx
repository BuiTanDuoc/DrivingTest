import { useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { examApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import QuestionCard from '../components/QuestionCard';
import { Empty, ErrorBox, Spinner } from '../components/Feedback';
import { formatDateTime, formatDuration } from '../utils/format';

export default function Result() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [filter, setFilter] = useState('all');

  // Vừa nộp bài xong thì dùng luôn kết quả được truyền qua navigate state, tránh gọi API lần nữa.
  const preset = useRef(location.state?.result);
  const { data, error, loading, reload } = useAsync(() => {
    const p = preset.current;
    preset.current = null;
    return p && p.attemptId === id ? Promise.resolve(p) : examApi.result(id);
  }, [id, i18n.language]);

  if (loading && !data) return <div className="container page"><Spinner /></div>;
  if (error && !data) return <div className="container page"><ErrorBox error={error} onRetry={reload} /></div>;
  if (!data) return null;

  const r = data;
  const wrongOnly = filter === 'wrong';
  const items = r.questions.filter((q) => !wrongOnly || !q.isCorrect);

  const reason = r.passed
    ? null
    : r.failedByCritical
      ? t('result.failedCritical')
      : t('result.failedScore', { pass: r.passScore, total: r.totalQuestions });

  const statusOf = (q) => (q.selectedAnswerId == null ? 'skipped' : q.isCorrect ? 'correct' : 'wrong');

  return (
    <div className="container page">
      <section className={`result-hero ${r.passed ? 'pass' : 'fail'} fade-up`}>
        <div className="result-badge">{r.passed ? t('result.passed') : t('result.failed')}</div>
        <div className="result-score">
          <span className="big">{r.score}</span>
          <span className="of">/ {r.totalQuestions}</span>
        </div>
        <p className="result-need">{t('result.need', { pass: r.passScore, total: r.totalQuestions })}</p>
        {reason && <p className="result-reason">{reason}</p>}
        {r.status === 'Expired' && <p className="result-reason">{t('result.expired')}</p>}
        <dl className="result-meta">
          <div><dt>{t('result.time')}</dt><dd>{formatDuration(r.durationSeconds)}</dd></div>
          <div><dt>{t('result.date')}</dt><dd>{formatDateTime(r.startedAt, i18n.language)}</dd></div>
        </dl>
        <div className="result-actions">
          <Link to="/thi" className="btn btn-light">{t('result.retry')}</Link>
          <Link to="/lich-su" className="btn btn-outline-light">{t('result.toHistory')}</Link>
          <Link to="/hoc?tab=review" className="btn btn-outline-light">{t('result.toLearn')}</Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{t('result.review')}</h2>
          <div className="seg" role="group">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t('result.filterAll')}</button>
            <button className={filter === 'wrong' ? 'active' : ''} onClick={() => setFilter('wrong')}>{t('result.filterWrong')}</button>
          </div>
        </div>

        {items.length === 0 && <Empty>{t('result.noWrong')}</Empty>}
        <div className="qlist">
          {items.map((q) => (
            <QuestionCard
              key={q.questionId}
              index={q.position}
              question={{ ...q, id: q.questionId }}
              selectedId={q.selectedAnswerId}
              correctId={q.answers.find((a) => a.isCorrect)?.id}
              explanation={q.explanation}
              status={statusOf(q)}
              flagged={q.isFlagged}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
