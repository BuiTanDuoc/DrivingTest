import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminUsersApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import AdminTabs from '../../components/AdminTabs';
import Pagination from '../../components/Pagination';
import { Empty, ErrorBox, Spinner } from '../../components/Feedback';
import { formatDateTime } from '../../utils/format';
import { PASSWORD_OK, generatePassword, mapErrors } from '../../utils/password';

const PAGE_SIZE = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminUsers() {
  const { t, i18n } = useTranslation();
  const { user: me, updateUser } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const page = Math.max(1, Number(params.get('page') ?? 1));
  const role = params.get('role') ?? '';
  const q = params.get('q') ?? '';

  const [searchInput, setSearchInput] = useState(q);
  const debounced = useDebounce(searchInput, 400);
  // Hộp thoại đang mở: { type: 'create' | 'edit' | 'reset' | 'delete', user? }
  const [dialog, setDialog] = useState(null);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null || v === '' ? next.delete(k) : next.set(k, String(v))));
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (debounced !== q) update({ q: debounced.trim() || null, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const list = useAsync(
    () => adminUsersApi.list({ search: q, role, page, pageSize: PAGE_SIZE }),
    [q, role, page]
  );

  const close = () => setDialog(null);
  const done = (message) => { close(); toast(message, 'success'); list.reload(); };
  const data = list.data;
  const roleLabel = (r) => (r === 'Admin' ? t('profile.roleAdmin') : t('profile.roleUser'));

  return (
    <div className="container page">
      <AdminTabs />
      <header className="page-head row-between">
        <div>
          <h1>{t('users.title')}</h1>
          <p className="muted">{t('users.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setDialog({ type: 'create' })}>＋ {t('users.add')}</button>
      </header>

      <div className="filters admin-filters users-filters">
        <input className="input" type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('users.search')} aria-label={t('users.search')} />
        <select className="input" value={role} onChange={(e) => update({ role: e.target.value, page: null })} aria-label={t('users.colRole')}>
          <option value="">{t('users.allRoles')}</option>
          <option value="User">{t('profile.roleUser')}</option>
          <option value="Admin">{t('profile.roleAdmin')}</option>
        </select>
      </div>

      {list.loading && !data && <Spinner />}
      {list.error && <ErrorBox error={list.error} onRetry={list.reload} />}

      {data && (
        <>
          <p className="muted result-count">{t('users.total', { count: data.totalCount })}</p>
          {data.items.length === 0 ? <Empty>{t('users.empty')}</Empty> : (
            <div className={`table-wrap ${list.loading ? 'is-loading' : ''}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('users.colUser')}</th><th>{t('users.colRole')}</th><th className="right">{t('users.colExams')}</th>
                    <th>{t('users.colCreated')}</th><th className="right">{t('admin.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => {
                    const self = u.id === me?.id;
                    return (
                      <tr key={u.id}>
                        <td className="cell-text">
                          <strong>{u.displayName}</strong>{self && <span className="badge badge-muted" style={{ marginLeft: 6 }}>{t('users.you')}</span>}
                          <span className="muted small user-email">{u.email}</span>
                        </td>
                        <td><span className={`badge ${u.role === 'Admin' ? 'badge-danger' : 'badge-muted'}`}>{roleLabel(u.role)}</span></td>
                        <td className="right">{u.examCount}</td>
                        <td className="nowrap">{formatDateTime(u.createdAt, i18n.language)}</td>
                        <td className="right nowrap">
                          <button className="btn btn-ghost btn-sm" onClick={() => setDialog({ type: 'edit', user: u })}>{t('admin.edit')}</button>{' '}
                          <button className="btn btn-ghost btn-sm" onClick={() => setDialog({ type: 'reset', user: u })}>{t('users.resetPassword')}</button>{' '}
                          <button className="btn btn-danger btn-sm" disabled={self} title={self ? t('users.cannotDeleteSelf') : undefined}
                            onClick={() => setDialog({ type: 'delete', user: u })}>{t('admin.delete')}</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => update({ page: p === 1 ? null : p })} />
        </>
      )}

      {(dialog?.type === 'create' || dialog?.type === 'edit') && (
        <UserFormDialog
          user={dialog.user}
          isSelf={dialog.user?.id === me?.id}
          onClose={close}
          onSaved={(saved) => {
            if (saved.id === me?.id) updateUser({ displayName: saved.displayName, email: saved.email });
            done(dialog.user ? t('users.updated') : t('users.created'));
          }}
        />
      )}
      {dialog?.type === 'reset' && (
        <ResetPasswordDialog user={dialog.user} onClose={close} onDone={() => done(t('users.passwordReset', { email: dialog.user.email }))} />
      )}
      {dialog?.type === 'delete' && (
        <DeleteDialog user={dialog.user} onClose={close} onDone={() => done(t('users.deleted'))} />
      )}
    </div>
  );
}

function Modal({ title, children, onClose, busy }) {
  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, error, label }) {
  const { t } = useTranslation();
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-group">
        <input className="input" type="text" autoComplete="new-password" spellCheck={false} value={value}
          onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(generatePassword())}>{t('users.generate')}</button>
      </div>
      {error ? <em className="field-error">{error}</em> : <small className="muted">{t('auth.passwordHint')}</small>}
    </label>
  );
}

function UserFormDialog({ user, isSelf, onClose, onSaved }) {
  const { t } = useTranslation();
  const isEdit = !!user;
  const [form, setForm] = useState({
    email: user?.email ?? '', displayName: user?.displayName ?? '', role: user?.role ?? 'User', password: isEdit ? '' : generatePassword()
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!EMAIL_RE.test(form.email.trim())) v.email = t('auth.errEmail');
    if (!form.displayName.trim()) v.displayName = t('auth.errName');
    if (!isEdit && !PASSWORD_OK(form.password)) v.password = t('auth.errPassword');
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    const body = { email: form.email.trim(), displayName: form.displayName.trim(), role: form.role };
    try {
      const saved = isEdit ? await adminUsersApi.update(user.id, body) : await adminUsersApi.create({ ...body, password: form.password });
      onSaved(saved);
    } catch (err) {
      setErrors(mapErrors(err) ?? { general: err.message });
      setBusy(false);
    }
  };

  return (
    <Modal title={isEdit ? t('users.editTitle') : t('users.createTitle')} onClose={onClose} busy={busy}>
      <form className="form-card" onSubmit={submit} noValidate>
        <label className="field">
          <span>{t('auth.email')}</span>
          <input className="input" type="email" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} maxLength={256} />
          {errors.email && <em className="field-error">{errors.email}</em>}
        </label>
        <label className="field">
          <span>{t('auth.displayName')}</span>
          <input className="input" value={form.displayName} onChange={set('displayName')} aria-invalid={!!errors.displayName} maxLength={100} />
          {errors.displayName && <em className="field-error">{errors.displayName}</em>}
        </label>
        <label className="field">
          <span>{t('users.colRole')}</span>
          <select className="input" value={form.role} onChange={set('role')} disabled={isSelf}>
            <option value="User">{t('profile.roleUser')}</option>
            <option value="Admin">{t('profile.roleAdmin')}</option>
          </select>
          {isSelf && <small className="muted">{t('users.cannotChangeOwnRole')}</small>}
          {errors.role && <em className="field-error">{errors.role}</em>}
        </label>
        {!isEdit && (
          <PasswordInput label={t('auth.password')} value={form.password} error={errors.password}
            onChange={(password) => setForm((f) => ({ ...f, password }))} />
        )}
        {errors.general && <div className="error-box" role="alert">{errors.general}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? t('profile.saving') : t('users.save')}</button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordDialog({ user, onClose, onDone }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState(() => generatePassword());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!PASSWORD_OK(password)) { setError(t('auth.errPassword')); return; }
    setBusy(true); setError('');
    try {
      await adminUsersApi.resetPassword(user.id, password);
      navigator.clipboard?.writeText(password).catch(() => {});
      onDone();
    } catch (err) {
      setError(mapErrors(err)?.newPassword ?? err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={t('users.resetTitle')} onClose={onClose} busy={busy}>
      <form className="form-card" onSubmit={submit} noValidate>
        <p className="muted small">{t('users.resetBody', { name: user.displayName, email: user.email })}</p>
        <PasswordInput label={t('profile.newPassword')} value={password} onChange={setPassword} error={error} />
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
          <button className="btn btn-primary" disabled={busy}>{t('users.resetConfirm')}</button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteDialog({ user, onClose, onDone }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await adminUsersApi.remove(user.id);
      onDone();
    } catch (err) {
      toast(err.message, 'error');
      setBusy(false);
    }
  };

  return (
    <Modal title={t('users.deleteTitle')} onClose={onClose} busy={busy}>
      <p>{t('users.deleteBody', { name: user.displayName, email: user.email })}</p>
      {user.examCount > 0 && <p className="muted small">{t('users.deleteExams', { count: user.examCount })}</p>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
        <button className="btn btn-danger" onClick={confirm} disabled={busy}>{t('admin.delete')}</button>
      </div>
    </Modal>
  );
}
