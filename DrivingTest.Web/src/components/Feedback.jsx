import { useTranslation } from 'react-i18next';

export function Spinner({ label }) {
  const { t } = useTranslation();
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="error-box" role="alert">
      <strong>{t('common.error')}</strong>
      <p>{error?.message}</p>
      {onRetry && <button className="btn btn-ghost btn-sm" onClick={onRetry}>{t('common.retry')}</button>}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

export function ProgressBar({ value, max, tone = 'primary', label }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`progress-bar tone-${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
