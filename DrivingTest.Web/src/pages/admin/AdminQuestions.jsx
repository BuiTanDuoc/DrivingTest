import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi, catalogApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import Pagination from '../../components/Pagination';
import { Empty, ErrorBox, Spinner } from '../../components/Feedback';

const PAGE_SIZE = 20;

export default function AdminQuestions() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const page = Math.max(1, Number(params.get('page') ?? 1));
  const topicId = params.get('topic') ? Number(params.get('topic')) : '';
  const status = params.get('status') ?? ''; // '' | active | inactive
  const critical = params.get('critical') === '1';
  const q = params.get('q') ?? '';

  const [searchInput, setSearchInput] = useState(q);
  const debounced = useDebounce(searchInput, 400);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null || v === '' || v === false ? next.delete(k) : next.set(k, String(v))));
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (debounced !== q) update({ q: debounced.trim() || null, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Toast sau khi quay về từ trang soạn thảo.
  useEffect(() => {
    const msg = location.state?.toast;
    if (msg) toast(t(msg), 'success');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topics = useAsync(() => catalogApi.topics(), [i18n.language]);
  const list = useAsync(
    () => adminApi.list({
      topicId, search: q, critical: critical || undefined,
      active: status === 'active' ? true : status === 'inactive' ? false : undefined,
      page, pageSize: PAGE_SIZE
    }),
    [topicId, q, critical, status, page]
  );

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const r = await adminApi.remove(toDelete.id);
      toast(r.deactivated ? t('admin.deactivated') : t('admin.deleted'), r.deactivated ? 'info' : 'success');
      setToDelete(null);
      list.reload();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const data = list.data;

  return (
    <div className="container page">
      <header className="page-head row-between">
        <div>
          <h1>{t('admin.title')}</h1>
          <p className="muted">{t('admin.subtitle')}</p>
        </div>
        <Link to="/quan-tri/cau-hoi/moi" className="btn btn-primary">＋ {t('admin.add')}</Link>
      </header>

      <div className="filters admin-filters">
        <input className="input" type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t('admin.search')} aria-label={t('admin.search')} />
        <select className="input" value={topicId} onChange={(e) => update({ topic: e.target.value, page: null })} aria-label={t('editor.topic')}>
          <option value="">{t('admin.allTopics')}</option>
          {topics.data?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => update({ status: e.target.value, page: null })} aria-label={t('admin.colStatus')}>
          <option value="">{t('admin.statusAll')}</option>
          <option value="active">{t('admin.statusActive')}</option>
          <option value="inactive">{t('admin.statusInactive')}</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={critical} onChange={(e) => update({ critical: e.target.checked ? '1' : null, page: null })} />
          <span>{t('admin.criticalOnly')}</span>
        </label>
      </div>

      {list.loading && !data && <Spinner />}
      {list.error && <ErrorBox error={list.error} onRetry={list.reload} />}

      {data && (
        <>
          <p className="muted result-count">{t('admin.total', { count: data.totalCount })}</p>
          {data.items.length === 0 ? <Empty>{t('admin.empty')}</Empty> : (
            <div className={`table-wrap ${list.loading ? 'is-loading' : ''}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('admin.colNumber')}</th><th>{t('admin.colTopic')}</th><th>{t('admin.colQuestion')}</th>
                    <th>{t('admin.colStatus')}</th><th className="right">{t('admin.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id} className={row.isActive ? '' : 'row-muted'}>
                      <td><strong>{row.number}</strong></td>
                      <td>{topics.data?.find((x) => x.id === row.topicId)?.name ?? row.topicCode}</td>
                      <td className="cell-text">
                        <span title={row.text}>{row.text}</span>
                        <span className="cell-badges">
                          {row.isCritical && <span className="badge badge-danger">{t('question.critical')}</span>}
                          {row.hasImage && <span className="badge badge-muted" title="image">🖼</span>}
                        </span>
                      </td>
                      <td><span className={`badge ${row.isActive ? 'badge-success' : 'badge-muted'}`}>{row.isActive ? t('admin.active') : t('admin.inactive')}</span></td>
                      <td className="right nowrap">
                        <Link to={`/quan-tri/cau-hoi/${row.id}`} className="btn btn-ghost btn-sm">{t('admin.edit')}</Link>{' '}
                        <button className="btn btn-danger btn-sm" onClick={() => setToDelete(row)}>{t('admin.delete')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => update({ page: p === 1 ? null : p })} />
        </>
      )}

      {toDelete && (
        <div className="modal-backdrop" onClick={() => !deleting && setToDelete(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>{t('admin.deleteTitle')}</h3>
            <p>{t('admin.deleteBody', { n: toDelete.number })}</p>
            <p className="muted small">{toDelete.text}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setToDelete(null)} disabled={deleting}>{t('common.cancel')}</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>{t('admin.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
