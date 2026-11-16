import { useTranslation } from 'react-i18next';

/** Cửa sổ trang: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page, total) {
  const set = new Set([1, total, page - 1, page, page + 1]);
  const pages = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push('gap-' + p);
    out.push(p);
  });
  return out;
}

export default function Pagination({ page, totalPages, onChange }) {
  const { t } = useTranslation();
  if (!totalPages || totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← {t('common.prev')}
      </button>
      <div className="pages">
        {pageWindow(page, totalPages).map((p) =>
          typeof p === 'string' ? (
            <span key={p} className="gap">…</span>
          ) : (
            <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onChange(p)} aria-current={p === page ? 'page' : undefined}>
              {p}
            </button>
          )
        )}
      </div>
      <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        {t('common.next')} →
      </button>
    </nav>
  );
}
