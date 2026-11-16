import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_OK = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

/** Form dùng chung cho đăng nhập và đăng ký. */
export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const { t } = useTranslation();
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const target = from ? `${from.pathname}${from.search ?? ''}` : '/';

  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated && !busy) return <Navigate to={target} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!EMAIL_RE.test(form.email.trim())) next.email = t('auth.errEmail');
    if (isRegister) {
      if (!PASSWORD_OK(form.password)) next.password = t('auth.errPassword');
      if (!form.displayName.trim()) next.displayName = t('auth.errName');
    } else if (!form.password) {
      next.password = t('auth.errRequired');
    }
    return next;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    try {
      if (isRegister) await register(form.email.trim(), form.password, form.displayName.trim());
      else await login(form.email.trim(), form.password);
      navigate(target, { replace: true });
    } catch (err) {
      // Lỗi validation từ backend: { Email: [...], Password: [...] }
      if (err.errors) {
        const mapped = {};
        Object.entries(err.errors).forEach(([k, msgs]) => { mapped[k.charAt(0).toLowerCase() + k.slice(1)] = msgs[0]; });
        setErrors(mapped);
      } else {
        setServerError(err.message);
      }
      setBusy(false);
    }
  };

  return (
    <div className="container auth-wrap">
      <form className="card auth-card fade-up" onSubmit={onSubmit} noValidate>
        <h1>{isRegister ? t('auth.registerTitle') : t('auth.loginTitle')}</h1>
        <p className="muted">{isRegister ? t('auth.registerSubtitle') : t('auth.loginSubtitle')}</p>

        {isRegister && (
          <label className="field">
            <span>{t('auth.displayName')}</span>
            <input className="input" autoComplete="name" value={form.displayName} onChange={set('displayName')} aria-invalid={!!errors.displayName} />
            {errors.displayName && <em className="field-error">{errors.displayName}</em>}
          </label>
        )}

        <label className="field">
          <span>{t('auth.email')}</span>
          <input className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} />
          {errors.email && <em className="field-error">{errors.email}</em>}
        </label>

        <label className="field">
          <span>{t('auth.password')}</span>
          <input className="input" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} value={form.password} onChange={set('password')} aria-invalid={!!errors.password} />
          {isRegister && !errors.password && <small className="muted">{t('auth.passwordHint')}</small>}
          {errors.password && <em className="field-error">{errors.password}</em>}
        </label>

        {serverError && <div className="error-box" role="alert">{serverError}</div>}

        <button className="btn btn-primary btn-lg" disabled={busy}>
          {isRegister ? t('auth.registerBtn') : t('auth.loginBtn')}
        </button>

        <p className="auth-switch">
          {isRegister ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
          <Link to={isRegister ? '/dang-nhap' : '/dang-ky'} state={location.state}>
            {isRegister ? t('nav.login') : t('nav.register')}
          </Link>
        </p>
      </form>
    </div>
  );
}
