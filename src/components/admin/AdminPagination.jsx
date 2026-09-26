import { useTranslation } from 'react-i18next';
import { Button } from '../ui.jsx';

function AdminPagination({ page, totalPages, total, onChange }) {
  const { t } = useTranslation();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="admin-pagination">
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {t('admin.pagination.previous')}
      </Button>
      <span className="admin-pagination__label">
        {t('admin.pagination.summary', { page, pages: totalPages, total })}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        {t('admin.pagination.next')}
      </Button>
    </div>
  );
}

export default AdminPagination;
