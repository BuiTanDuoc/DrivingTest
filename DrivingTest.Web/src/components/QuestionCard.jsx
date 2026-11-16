import { useTranslation } from 'react-i18next';

/**
 * Dùng chung cho 3 chế độ:
 *  - Thi: chỉ có selectedId (không biết đáp án đúng).
 *  - Học: sau khi kiểm tra có correctId + explanation.
 *  - Xem lại kết quả: correctId + explanation + status.
 */
export default function QuestionCard({
  id, index, question, selectedId, correctId, onSelect, disabled, explanation, status,
  flagged, onToggleFlag, bookmarked, onToggleBookmark, busy
}) {
  const { t } = useTranslation();
  const revealed = correctId != null;
  const critical = question.isCritical;

  const answerClass = (a) => {
    if (revealed) {
      if (a.id === correctId) return 'correct';
      if (a.id === selectedId) return 'wrong';
      return '';
    }
    return a.id === selectedId ? 'selected' : '';
  };

  return (
    <article id={id} className={`qcard ${critical ? 'critical' : ''} ${flagged ? 'flagged' : ''}`}>
      <header className="qcard-head">
        <span className="qnum">{t('question.number', { n: index })}</span>
        {critical && <span className="badge badge-danger">{t('question.critical')}</span>}
        {status && (
          <span className={`badge ${status === 'correct' ? 'badge-success' : status === 'wrong' ? 'badge-danger' : 'badge-muted'}`}>
            {t(`question.${status === 'skipped' ? 'skipped' : status}`)}
          </span>
        )}
        <span className="spacer" />
        {onToggleFlag && (
          <button className={`icon-btn ${flagged ? 'on' : ''}`} onClick={onToggleFlag} aria-pressed={!!flagged}
            title={flagged ? t('question.unflag') : t('question.flag')} aria-label={flagged ? t('question.unflag') : t('question.flag')}>
            🚩
          </button>
        )}
        {onToggleBookmark && (
          <button className={`icon-btn ${bookmarked ? 'on' : ''}`} onClick={onToggleBookmark} aria-pressed={!!bookmarked}
            title={bookmarked ? t('question.unbookmark') : t('question.bookmark')} aria-label={bookmarked ? t('question.unbookmark') : t('question.bookmark')}>
            {bookmarked ? '★' : '☆'}
          </button>
        )}
      </header>

      <p className="qtext">{question.text}</p>
      {question.imageUrl && <img className="qimg" src={question.imageUrl} alt="" loading="lazy" />}

      <ul className="answers" role="radiogroup">
        {question.answers.map((a, i) => (
          <li key={a.id}>
            <button
              type="button"
              role="radio"
              aria-checked={a.id === selectedId}
              className={`answer ${answerClass(a)}`}
              disabled={disabled || busy || revealed}
              onClick={() => onSelect?.(a.id)}
            >
              <span className="key">{i + 1}</span>
              <span className="answer-text">{a.text}</span>
              {revealed && a.id === correctId && <span className="mark">✓</span>}
              {revealed && a.id === selectedId && a.id !== correctId && <span className="mark">✗</span>}
            </button>
          </li>
        ))}
      </ul>

      {explanation && (
        <div className="explain">
          <strong>{t('learn.explanation')}</strong>
          <p>{explanation}</p>
        </div>
      )}
    </article>
  );
}
