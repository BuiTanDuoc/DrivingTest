import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Home">
      <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="var(--primary)" />
        <path d="M12 38l5-12c1-2 3-3 5-3h20c2 0 4 1 5 3l5 12v10h-6v-4H18v4h-6z" fill="#fff" />
        <circle cx="21" cy="38" r="3" fill="var(--primary)" />
        <circle cx="43" cy="38" r="3" fill="var(--primary)" />
      </svg>
      <span>Thi Bằng Lái B</span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  return (
    <button className="icon-btn" onClick={toggle} aria-label={t('theme.toggle')} title={theme === 'dark' ? t('theme.light') : t('theme.dark')}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'vi';
  return (
    <div className="lang-switch" role="group" aria-label={t('lang.toggle')}>
      {['vi', 'en'].map((l) => (
        <button key={l} className={lang === l ? 'active' : ''} onClick={() => i18n.changeLanguage(l)} aria-pressed={lang === l}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function Layout() {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const close = () => setOpen(false);

  // Trang thi: thanh điều hướng gọn hơn để nhường chỗ cho đề thi.
  const compact = location.pathname === '/thi';

  const links = [
    ['/', t('nav.home'), true],
    ['/hoc', t('nav.learn')],
    ['/thi', t('nav.exam')],
    ['/lich-su', t('nav.history')]
  ];

  return (
    <div className="app">
      <header className={`navbar ${compact ? 'compact' : ''}`}>
        <div className="container navbar-inner">
          <Logo />
          <button className="icon-btn menu-btn" onClick={() => setOpen((o) => !o)} aria-label={t('nav.menu')} aria-expanded={open}>
            ☰
          </button>
          <nav className={`nav ${open ? 'open' : ''}`}>
            {links.map(([to, label, end]) => (
              <NavLink key={to} to={to} end={end} onClick={close} className={({ isActive }) => (isActive ? 'active' : '')}>
                {label}
              </NavLink>
            ))}
            <div className="nav-tools">
              <LanguageSwitcher />
              <ThemeToggle />
              {isAuthenticated ? (
                <div className="user-chip">
                  <span className="avatar" aria-hidden="true">{(user?.displayName || '?').charAt(0).toUpperCase()}</span>
                  <span className="user-name">{user?.displayName}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => { close(); logout(); }}>{t('nav.logout')}</button>
                </div>
              ) : (
                <div className="auth-links">
                  <Link to="/dang-nhap" className="btn btn-ghost btn-sm" onClick={close}>{t('nav.login')}</Link>
                  <Link to="/dang-ky" className="btn btn-primary btn-sm" onClick={close}>{t('nav.register')}</Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container">{t('footer.text')}</div>
      </footer>
    </div>
  );
}
