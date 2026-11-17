import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/** Thanh chuyển giữa các trang quản trị. */
export default function AdminTabs() {
  const { t } = useTranslation();
  const cls = ({ isActive }) => `tab ${isActive ? 'active' : ''}`;
  return (
    <nav className="tabs admin-tabs" aria-label={t('nav.admin')}>
      <NavLink to="/quan-tri" end className={cls}>{t('adminTabs.questions')}</NavLink>
      <NavLink to="/quan-tri/nguoi-dung" className={cls}>{t('adminTabs.users')}</NavLink>
    </nav>
  );
}
