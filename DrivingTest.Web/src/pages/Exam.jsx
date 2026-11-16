import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { catalogApi, examApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { useCountdown } from '../hooks/useCountdown';
import QuestionCard from '../components/QuestionCard';
import { ErrorBox, Spinner } from '../components/Feedback';
import { formatClock, parseUtc } from '../utils/format';

/* ------------------------------------------------------------------ */
/* Màn hình giới thiệu / bắt đầu                                       */
/* ------------------------------------------------------------------ */
export default function Exam() {
  const { t } = useTranslation();
  const toast = useToast();
  const info = useAsync(() => catalogApi.examInfo(), []);
  const active = useAsync(() => examApi.active(), []);
  const [exam, setExam] = useState(null);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    try {
      setExam(await examApi.start()); // nếu còn bài đang làm, backend trả lại chính bài đó
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setStarting(false);
    }
  };

  if (exam) return <ExamRunner initial={exam} />;

  const i = info.data;
  const a = active.data;
  const remaining = a ? Math.max(0, parseUtc(a.expiresAt).getTime() - (parseUtc(a.serverTime).getTime() - 0)) : 0;

  return (
    <div className="container page narrow">
      <header className="page-head">
        <h1>{t('exam.title')}</h1>
        <p className="muted">{t('exam.introSubtitle')}</p>
      </header>

      <div className="card">
        <h3>{t('exam.rules')}</h3>
        {info.loading && !i && <Spinner />}
        {info.error && <ErrorBox error={info.error} onRetry={info.reload} />}
        {i && (
          <ul className="check-list">
            <li>{t('home.examQuestions', { count: i.totalQuestions })}</li>
            <li>{t('home.examDuration', { count: i.durationMinutes })}</li>
            <li>{t('home.examPass', { pass: i.passScore, total: i.totalQuestions })}</li>
            {i.minCriticalQuestions > 0 && <li>{t('home.examCritical')}</li>}
            <li>{t('home.examAuto')}</li>
          </ul>
        )}

        {a && (
          <div className="notice">{t('exam.resumeHint', { time: formatClock(remaining) })}</div>
        )}

        <button className="btn btn-primary btn-lg" onClick={start} disabled={starting || active.loading}>
          {starting ? t('exam.starting') : a ? t('exam.resume') : t('exam.start')}
        </button>
        {active.error && <ErrorBox error={active.error} onRetry={active.reload} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Đang làm bài                                                        */
/* ------------------------------------------------------------------ */
function ExamRunner({ initial }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const questions = initial.questions;
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(questions.filter((q) => q.selectedAnswerId != null).map((q) => [q.questionId, q.selectedAnswerId]))
  );
  const [flags, setFlags] = useState(() => new Set(questions.filter((q) => q.isFlagged).map((q) => q.questionId)));
  const [current, setCurrent] = useState(0);
  const [view, setView] = useState('single'); // single | grid
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const answersRef = useRef(answers);
  const flagsRef = useRef(flags);
  answersRef.current = answers;
  flagsRef.current = flags;

  // Giờ server - giờ máy khách, tính một lần khi nhận đề.
  const offset = useMemo(() => parseUtc(initial.serverTime).getTime() - Date.now(), [initial.serverTime]);
  const expiresAt = useMemo(() => parseUtc(initial.expiresAt).getTime(), [initial.expiresAt]);

  /* ---- Lưu đáp án tuần tự (hàng đợi) để thứ tự tới server luôn đúng ---- */
  const queue = useRef(Promise.resolve());
  const finished = useRef(false);

  const goToResult = useCallback((state) => {
    finished.current = true;
    navigate(`/ket-qua/${initial.attemptId}`, { replace: true, state });
  }, [navigate, initial.attemptId]);

  const save = useCallback((questionId, answerId, isFlagged, rollback) => {
    queue.current = queue.current
      .then(() => examApi.saveAnswer(initial.attemptId, { questionId, answerId, isFlagged }))
      .catch((e) => {
        if (e.status === 409) { goToResult(); return; } // bài đã kết thúc (hết giờ) → xem kết quả
        rollback();
        toast(t('exam.saveFailed'), 'error');
      });
  }, [initial.attemptId, goToResult, toast, t]);

  const select = (questionId, answerId) => {
    const prev = answersRef.current[questionId];
    if (prev === answerId) return;
    setAnswers((a) => ({ ...a, [questionId]: answerId }));
    save(questionId, answerId, flagsRef.current.has(questionId), () =>
      setAnswers((a) => {
        const next = { ...a };
        if (prev == null) delete next[questionId]; else next[questionId] = prev;
        return next;
      })
    );
  };

  const toggleFlag = (questionId) => {
    const was = flagsRef.current.has(questionId);
    const apply = (on) => setFlags((f) => {
      const next = new Set(f);
      if (on) next.add(questionId); else next.delete(questionId);
      return next;
    });
    apply(!was);
    save(questionId, answersRef.current[questionId] ?? null, !was, () => apply(was));
  };

  /* ---- Nộp bài ---- */
  const submittingRef = useRef(false);
  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setConfirmOpen(false);
    try {
      await queue.current; // chờ các lần lưu đang dở
      const result = await examApi.submit(initial.attemptId);
      goToResult({ result });
    } catch (e) {
      submittingRef.current = false;
      setSubmitting(false);
      toast(e.message, 'error');
    }
  }, [initial.attemptId, goToResult, toast]);

  const remaining = useCountdown(expiresAt, offset, () => {
    toast(t('exam.timeUp'), 'info');
    submit();
  });

  /* ---- Cảnh báo khi rời trang ---- */
  useEffect(() => {
    const handler = (e) => {
      if (finished.current) return;
      e.preventDefault();
      e.returnValue = t('exam.leaveWarning');
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [t]);

  /* ---- Phím tắt (chế độ từng câu) ---- */
  useEffect(() => {
    if (view !== 'single' || confirmOpen) return undefined;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      const q = questions[current];
      if (/^[1-9]$/.test(e.key)) {
        const a = q.answers[Number(e.key) - 1];
        if (a) select(q.questionId, a.id);
      } else if (e.key === 'ArrowRight') setCurrent((c) => Math.min(questions.length - 1, c + 1));
      else if (e.key === 'ArrowLeft') setCurrent((c) => Math.max(0, c - 1));
      else if (e.key.toLowerCase() === 'f') toggleFlag(q.questionId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, confirmOpen, current, questions]);

  const done = questions.filter((q) => answers[q.questionId] != null).length;
  const flaggedCount = flags.size;
  const low = remaining < 5 * 60_000;
  const danger = remaining < 60_000;

  const jump = (index) => {
    if (view === 'single') { setCurrent(index); return; }
    document.getElementById(`q-${index + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderCard = (q, index) => (
    <QuestionCard
      key={q.questionId}
      id={`q-${index + 1}`}
      index={q.position}
      question={{ ...q, id: q.questionId }}
      selectedId={answers[q.questionId]}
      onSelect={(answerId) => select(q.questionId, answerId)}
      flagged={flags.has(q.questionId)}
      onToggleFlag={() => toggleFlag(q.questionId)}
      disabled={submitting}
    />
  );

  return (
    <div className="exam">
      <div className="exam-bar">
        <div className="container exam-bar-inner">
          <div className={`timer ${low ? 'low' : ''} ${danger ? 'danger' : ''}`} role="timer" aria-label={t('exam.timeLeft')}>
            ⏱ {formatClock(remaining)}
          </div>
          <div className="exam-progress">{t('exam.answered', { done, total: questions.length })}</div>
          <div className="seg" role="group">
            <button className={view === 'single' ? 'active' : ''} onClick={() => setView('single')}>{t('exam.viewSingle')}</button>
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>{t('exam.viewGrid')}</button>
          </div>
          <button className="btn btn-primary" onClick={() => setConfirmOpen(true)} disabled={submitting}>
            {submitting ? t('exam.submitting') : t('exam.submit')}
          </button>
        </div>
      </div>

      <div className="container exam-body">
        <div className="exam-main">
          {view === 'single' ? (
            <>
              {renderCard(questions[current], current)}
              <div className="exam-nav">
                <button className="btn btn-ghost" disabled={current === 0} onClick={() => setCurrent(current - 1)}>← {t('exam.prev')}</button>
                <button className="btn btn-ghost" disabled={current === questions.length - 1} onClick={() => setCurrent(current + 1)}>{t('exam.next')} →</button>
              </div>
              <p className="muted small hide-mobile">{t('exam.shortcuts')}</p>
            </>
          ) : (
            <div className="grid-view">{questions.map((q, i) => renderCard(q, i))}</div>
          )}
        </div>

        <aside className="exam-side">
          <h4>{t('exam.navigator')}</h4>
          <div className="qnav">
            {questions.map((q, i) => {
              const state = [
                answers[q.questionId] != null ? 'done' : '',
                flags.has(q.questionId) ? 'flag' : '',
                view === 'single' && i === current ? 'current' : ''
              ].join(' ');
              return (
                <button key={q.questionId} className={`qnav-btn ${state}`} onClick={() => jump(i)} aria-label={t('question.number', { n: q.position })}>
                  {q.position}
                </button>
              );
            })}
          </div>
          <ul className="legend">
            <li><i className="qnav-btn done" /> {t('exam.legendDone')}</li>
            <li><i className="qnav-btn" /> {t('exam.legendTodo')}</li>
            <li><i className="qnav-btn flag" /> {t('exam.legendFlagged')}</li>
            <li><i className="qnav-btn current" /> {t('exam.legendCurrent')}</li>
          </ul>
        </aside>
      </div>

      {confirmOpen && (
        <div className="modal-backdrop" onClick={() => setConfirmOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="confirm-title">{t('exam.confirmTitle')}</h3>
            <p>{t('exam.confirmBody')}</p>
            <ul className="check-list">
              <li>{t('exam.answered', { done, total: questions.length })}</li>
              {questions.length - done > 0 && <li className="warn">{t('exam.unanswered', { count: questions.length - done })}</li>}
              {flaggedCount > 0 && <li className="warn">{t('exam.flaggedCount', { count: flaggedCount })}</li>}
            </ul>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmOpen(false)}>{t('exam.keepGoing')}</button>
              <button className="btn btn-primary" onClick={submit}>{t('exam.confirmSubmit')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
