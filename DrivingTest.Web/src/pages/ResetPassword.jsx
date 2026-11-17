import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/endpoints';
import { PASSWORD_OK, mapErrors } from '../utils/password';

/** Bước 2: mở từ link trong email (?token=...) để đặt mật khẩu mới. */
export default function ResetPassword() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!PASSWORD_OK(form.password)) v.newPassword = t('auth.errPassword');
    if (form.confirm !== form.password) v.confirm = t('profile.mismatch');
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    try {
      await authApi.resetPassword(token, form.password);
      setDone(true);
    } catch (err) {
      setErrors(mapErrors(err) ?? { general: err.status === 400 ? t('reset.invalid') : err.message });
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="container auth-wrap">
        <div className="card auth-card">
          <h1>{t('reset.title')}</h1>
          <div className="error-box" role="alert">{t('reset.missing')}</div>
          <Link to="/quen-mat-khau" className="btn btn-primary">{t('reset.requestNew')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container auth-wrap">
      <form className="card auth-card fade-up" onSubmit={submit} noValidate>
        <h1>{t('reset.title')}</h1>
        {done ? (
          <>
            <div className="success-box" role="status">{t('reset.done')}</div>
            <Link to="/dang-nhap" className="btn btn-primary btn-lg">{t('nav.login')}</Link>
          </>
        ) : (
          <>
            <p className="muted">{t('reset.subtitle')}</p>
            <label className="field">
              <span>{t('profile.newPassword')}</span>
              <input className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} aria-invalid={!!errors.newPassword} autoFocus />
              {errors.newPassword ? <em className="field-error">{errors.newPassword}</em> : <small className="muted">{t('auth.passwordHint')}</small>}
            </label>
            <label className="field">
              <span>{t('profile.confirm')}</span>
              <input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-invalid={!!errors.confirm} />
              {errors.confirm && <em className="field-error">{errors.confirm}</em>}
            </label>
            {errors.general && (
              <div className="error-box" role="alert">
                {errors.general} <Link to="/quen-mat-khau">{t('reset.requestNew')}</Link>
              </div>
            )}
            <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? t('profile.saving') : t('reset.submit')}</button>
          </>
        )}
      </form>
    </div>
  );
}
