import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/endpoints';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Bước 1: nhập email để nhận link đặt lại mật khẩu. */
export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) { setError(t('auth.errEmail')); return; }
    setBusy(true); setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.errors?.Email?.[0] ?? err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container auth-wrap">
      <form className="card auth-card fade-up" onSubmit={submit} noValidate>
        <h1>{t('forgot.title')}</h1>
        {sent ? (
          <>
            <div className="success-box" role="status">{t('forgot.sent', { email: email.trim() })}</div>
            <p className="muted small">{t('forgot.sentHint')}</p>
            <button type="button" className="btn btn-ghost" onClick={() => setSent(false)}>{t('forgot.resend')}</button>
          </>
        ) : (
          <>
            <p className="muted">{t('forgot.subtitle')}</p>
            <label className="field">
              <span>{t('auth.email')}</span>
              <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} autoFocus />
              {error && <em className="field-error">{error}</em>}
            </label>
            <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? t('forgot.sending') : t('forgot.submit')}</button>
          </>
        )}
        <p className="auth-switch"><Link to="/dang-nhap">← {t('forgot.backToLogin')}</Link></p>
      </form>
    </div>
  );
}
