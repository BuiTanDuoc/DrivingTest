import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { profileApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { ErrorBox, Spinner } from '../components/Feedback';
import { formatDateTime } from '../utils/format';

const PASSWORD_OK = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
const camel = (k) => k.charAt(0).toLowerCase() + k.slice(1);

/** Lỗi validation của backend → { field: message } */
function mapErrors(err) {
  if (!err.errors) return null;
  return Object.fromEntries(Object.entries(err.errors).map(([k, msgs]) => [camel(k), msgs[0]]));
}

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { updateUser, applyAuth } = useAuth();
  const toast = useToast();
  const profile = useAsync(() => profileApi.get(), []);

  if (profile.loading && !profile.data) return <div className="container page"><Spinner /></div>;
  if (profile.error && !profile.data) return <div className="container page"><ErrorBox error={profile.error} onRetry={profile.reload} /></div>;
  const p = profile.data;

  return (
    <div className="container page narrow">
      <header className="page-head">
        <h1>{t('profile.title')}</h1>
        <p className="muted">{t('profile.subtitle')}</p>
      </header>

      <InfoCard profile={p} lang={i18n.language} onSaved={(dto) => { updateUser({ displayName: dto.displayName }); profile.reload(); toast(t('profile.saved'), 'success'); }} />
      <PasswordCard onChanged={(auth) => { applyAuth(auth); toast(t('profile.changed'), 'success'); }} />
    </div>
  );
}

function InfoCard({ profile, lang, onSaved }) {
  const { t } = useTranslation();
  const [name, setName] = useState(profile.displayName);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError(t('auth.errName')); return; }
    setBusy(true); setError('');
    try {
      onSaved(await profileApi.update(name.trim()));
    } catch (err) {
      setError(mapErrors(err)?.displayName ?? err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form-card" onSubmit={submit} noValidate>
      <h3>{t('profile.info')}</h3>
      <dl className="kv">
        <div><dt>{t('profile.email')}</dt><dd>{profile.email}</dd></div>
        <div>
          <dt>{t('profile.role')}</dt>
          <dd><span className={`badge ${profile.role === 'Admin' ? 'badge-danger' : 'badge-muted'}`}>{profile.role === 'Admin' ? t('profile.roleAdmin') : t('profile.roleUser')}</span></dd>
        </div>
        <div><dt>{t('profile.joined')}</dt><dd>{formatDateTime(profile.createdAt, lang)}</dd></div>
      </dl>

      <label className="field">
        <span>{t('profile.displayName')}</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} aria-invalid={!!error} />
        {error && <em className="field-error">{error}</em>}
      </label>
      <div><button className="btn btn-primary" disabled={busy || name.trim() === profile.displayName}>{busy ? t('profile.saving') : t('profile.save')}</button></div>
    </form>
  );
}

function PasswordCard({ onChanged }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!form.current) v.currentPassword = t('auth.errRequired');
    if (!PASSWORD_OK(form.next)) v.newPassword = t('auth.errPassword');
    else if (form.next === form.current) v.newPassword = t('profile.sameAsOld');
    if (form.confirm !== form.next) v.confirm = t('profile.mismatch');
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    try {
      const auth = await profileApi.changePassword(form.current, form.next);
      setForm({ current: '', next: '', confirm: '' });
      onChanged(auth);
    } catch (err) {
      setErrors(mapErrors(err) ?? { general: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form-card" onSubmit={submit} noValidate style={{ marginTop: '1.25rem' }}>
      <h3>{t('profile.passwordTitle')}</h3>

      <label className="field">
        <span>{t('profile.current')}</span>
        <input className="input" type="password" autoComplete="current-password" value={form.current} onChange={set('current')} aria-invalid={!!errors.currentPassword} />
        {errors.currentPassword && <em className="field-error">{errors.currentPassword}</em>}
      </label>
      <label className="field">
        <span>{t('profile.newPassword')}</span>
        <input className="input" type="password" autoComplete="new-password" value={form.next} onChange={set('next')} aria-invalid={!!errors.newPassword} />
        {errors.newPassword ? <em className="field-error">{errors.newPassword}</em> : <small className="muted">{t('auth.passwordHint')}</small>}
      </label>
      <label className="field">
        <span>{t('profile.confirm')}</span>
        <input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-invalid={!!errors.confirm} />
        {errors.confirm && <em className="field-error">{errors.confirm}</em>}
      </label>

      {errors.general && <div className="error-box" role="alert">{errors.general}</div>}
      <div><button className="btn btn-primary" disabled={busy}>{busy ? t('profile.saving') : t('profile.change')}</button></div>
    </form>
  );
}
