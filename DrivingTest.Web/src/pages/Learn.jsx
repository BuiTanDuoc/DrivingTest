import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { catalogApi, questionsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';
import QuestionCard from '../components/QuestionCard';
import Pagination from '../components/Pagination';
import { Empty, ErrorBox, Spinner } from '../components/Feedback';

const PAGE_SIZE = 10;

export default function Learn() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const tab = params.get('tab') ?? 'all'; // all | bookmarks | review
  const topicId = params.get('topic') ? Number(params.get('topic')) : null;
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const critical = params.get('critical') === '1';
  const q = params.get('q') ?? '';

  const [searchInput, setSearchInput] = useState(q);
  const debounced = useDebounce(searchInput, 400);
  const [results, setResults] = useState({}); // questionId → { answerId, correctId, explanation, isCorrect }
  const [pending, setPending] = useState({});
  const [bookmarkOverrides, setBookmarkOverrides] = useState({});
  const topRef = useRef(null);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null || v === '' || v === false ? next.delete(k) : next.set(k, String(v))));
    setParams(next, { replace: true });
  };

  // Từ khóa tìm kiếm đã debounce → đưa lên URL.
  useEffect(() => {
    if (debounced !== q) update({ q: debounced.trim() || null, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Đổi ngôn ngữ: giải thích/đáp án đã chọn đang ở ngôn ngữ cũ → làm mới.
  useEffect(() => { setResults({}); }, [lang]);

  const topics = useAsync(() => catalogApi.topics(), [lang]);

  const needsAuth = tab !== 'all' && !isAuthenticated;
  const list = useAsync(async () => {
    if (needsAuth) return null;
    if (tab === 'bookmarks') return questionsApi.bookmarks({ page, pageSize: PAGE_SIZE });
    if (tab === 'review') return questionsApi.review({ page, pageSize: PAGE_SIZE });
    return questionsApi.list({ topicId, search: q, criticalOnly: critical, page, pageSize: PAGE_SIZE });
  }, [tab, topicId, q, critical, page, lang, isAuthenticated]);

  useEffect(() => { topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [page, tab, topicId]);

  const choose = async (question, answerId) => {
    if (results[question.id] || pending[question.id]) return;
    setPending((p) => ({ ...p, [question.id]: true }));
    try {
      const r = await questionsApi.check(question.id, answerId);
      setResults((prev) => ({
        ...prev,
        [question.id]: { answerId, correctId: r.correctAnswerId, explanation: r.explanation, isCorrect: r.isCorrect }
      }));
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setPending((p) => ({ ...p, [question.id]: false }));
    }
  };

  const toggleBookmark = async (question) => {
    if (!isAuthenticated) { toast(t('learn.loginToBookmark'), 'info'); return; }
    const current = bookmarkOverrides[question.id] ?? question.isBookmarked;
    setBookmarkOverrides((o) => ({ ...o, [question.id]: !current }));
    try {
      if (current) await questionsApi.removeBookmark(question.id);
      else await questionsApi.addBookmark(question.id);
      if (current && tab === 'bookmarks') list.reload();
    } catch (e) {
      setBookmarkOverrides((o) => ({ ...o, [question.id]: current }));
      toast(e.message, 'error');
    }
  };

  const data = list.data;
  const tabs = [['all', t('learn.tabAll')], ['bookmarks', t('learn.tabBookmarks')], ['review', t('learn.tabReview')]];

  return (
    <div className="container page" ref={topRef}>
      <header className="page-head">
        <h1>{t('learn.title')}</h1>
        <p className="muted">{t('learn.subtitle')}</p>
      </header>

      <div className="tabs" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={`tab ${tab === key ? 'active' : ''}`}
            onClick={() => update({ tab: key === 'all' ? null : key, page: null })}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <div className="filters">
          <input className="input" type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t('learn.search')} aria-label={t('learn.search')} />
          <label className="check">
            <input type="checkbox" checked={critical} onChange={(e) => update({ critical: e.target.checked ? '1' : null, page: null })} />
            <span>{t('learn.criticalOnly')}</span>
          </label>
          <div className="chips">
            <button className={`chip ${topicId === null ? 'active' : ''}`} onClick={() => update({ topic: null, page: null })}>{t('learn.allTopics')}</button>
            {topics.data?.map((topic) => (
              <button key={topic.id} className={`chip ${topicId === topic.id ? 'active' : ''}`} onClick={() => update({ topic: topic.id, page: null })}>
                {topic.name} <small>{topic.questionCount}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {needsAuth ? (
        <Empty>
          <p>{t('common.loginPrompt')}</p>
          <Link className="btn btn-primary" to="/dang-nhap" state={{ from: { pathname: '/hoc', search: `?tab=${tab}` } }}>{t('nav.login')}</Link>
        </Empty>
      ) : (
        <>
          {list.loading && !data && <Spinner />}
          {list.error && <ErrorBox error={list.error} onRetry={list.reload} />}
          {data && (
            <>
              <p className="muted result-count">{t('learn.total', { count: data.totalCount })}</p>
              {data.items.length === 0 && (
                <Empty>{tab === 'bookmarks' ? t('learn.emptyBookmarks') : tab === 'review' ? t('learn.emptyReview') : t('learn.empty')}</Empty>
              )}
              <div className={`qlist ${list.loading ? 'is-loading' : ''}`}>
                {data.items.map((question) => {
                  const r = results[question.id];
                  return (
                    <div key={question.id}>
                      <QuestionCard
                        index={question.number}
                        question={question}
                        selectedId={r?.answerId}
                        correctId={r?.correctId}
                        explanation={r?.explanation}
                        status={r ? (r.isCorrect ? 'correct' : 'wrong') : undefined}
                        busy={!!pending[question.id]}
                        onSelect={(answerId) => choose(question, answerId)}
                        bookmarked={bookmarkOverrides[question.id] ?? question.isBookmarked}
                        onToggleBookmark={() => toggleBookmark(question)}
                      />
                    </div>
                  );
                })}
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => update({ page: p === 1 ? null : p })} />
            </>
          )}
        </>
      )}
    </div>
  );
}
