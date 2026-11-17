import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

/** Chỉ cho tài khoản Admin vào; backend vẫn kiểm tra quyền ở mọi endpoint /api/admin. */
export default function AdminRoute() {
  const { isAuthenticated, isAdmin } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/dang-nhap" state={{ from: location }} replace />;
  if (!isAdmin) {
    return (
      <div className="container page narrow center">
        <h1>403</h1>
        <p className="muted">{t('admin.forbidden')}</p>
        <Link to="/" className="btn btn-primary">{t('notFound.back')}</Link>
      </div>
    );
  }
  return <Outlet />;
}
