import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="container page narrow center">
      <h1>404</h1>
      <h2>{t('notFound.title')}</h2>
      <p className="muted">{t('notFound.body')}</p>
      <Link to="/" className="btn btn-primary">{t('notFound.back')}</Link>
    </div>
  );
}
