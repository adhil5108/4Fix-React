import { useTranslation } from 'react-i18next';
import AdminPagination from '../../components/admin/AdminPagination.jsx';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminTable from '../../components/admin/AdminTable.jsx';
import { Select } from '../../components/TextField.jsx';
import { ButtonLink } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { formatCategory, formatMoney } from '../../utils/format.js';
import { adminApi } from '../../services/fixApi.js';

// Column labels are i18n keys, translated at render.
const COLUMNS = [
  { key: 'name', label: 'admin.fields.name' },
  { key: 'category', label: 'admin.services.columns.category', render: (row) => formatCategory(row.category) },
  {
    key: 'startingPrice',
    label: 'admin.services.columns.startingPrice',
    render: (row) => (row.startingPrice !== null ? formatMoney(row.startingPrice) : '—'),
  },
  { key: 'issues', label: 'admin.services.columns.issues', render: (row) => row.issues.length },
  { key: 'isPopular', label: 'admin.services.columns.popular', render: (row, t) => (row.isPopular ? t('admin.shared.yes') : '—') },
  {
    key: 'isActive',
    label: 'admin.fields.status',
    render: (row, t) => (
      <span className={`badge badge--${row.isActive ? 'success' : 'muted'}`}>
        {row.isActive ? t('admin.shared.active') : t('admin.shared.inactive')}
      </span>
    ),
  },
];

const STATUS_OPTIONS = [
  { value: '', label: 'admin.shared.allStatuses' },
  { value: 'true', label: 'admin.shared.active' },
  { value: 'false', label: 'admin.shared.inactive' },
];

function AdminServicesPage() {
  const { t } = useTranslation();
  const page = Number(useQueryParam('page')) || 1;
  const isActive = useQueryParam('isActive') || '';
  const services = useApi(() => adminApi.services({ page, isActive: isActive || undefined }), [page, isActive]);

  const columns = COLUMNS.map((column) => ({
    ...column,
    label: t(column.label),
    render: column.render ? (row) => column.render(row, t) : undefined,
  }));
  const statusOptions = STATUS_OPTIONS.map((option) => ({ ...option, label: t(option.label) }));

  function updateQuery(next) {
    const params = new URLSearchParams({ ...(isActive ? { isActive } : {}), page: '1', ...next });

    for (const [key, value] of [...params.entries()]) {
      if (!value) params.delete(key);
    }

    navigate(`/app/admin/services?${params.toString()}`, { replace: true });
  }

  return (
    <AdminShell>
      <div className="admin-content__header">
        <div>
          <h1 className="admin-content__title">{t('common.adminNav.services')}</h1>
          <p className="admin-content__subtitle">{t('admin.services.subtitle')}</p>
        </div>
        <ButtonLink to="/app/admin/services/new" size="sm">
          {t('admin.services.newService')}
        </ButtonLink>
      </div>

      <div className="admin-filters">
        <Select
          id="isActiveFilter"
          label={t('admin.fields.status')}
          value={isActive}
          options={statusOptions}
          onChange={(event) => updateQuery({ isActive: event.target.value })}
        />
      </div>

      <AdminTable
        columns={columns}
        rows={services.data?.services || []}
        loading={services.loading}
        error={services.error}
        onRetry={services.reload}
        emptyTitle={t('admin.services.emptyTitle')}
        emptyMessage={t('admin.services.emptyMessage')}
        getRowHref={(row) => `/app/admin/services/${row.id}`}
      />

      {services.data ? (
        <AdminPagination
          page={services.data.page}
          totalPages={services.data.totalPages}
          total={services.data.total}
          onChange={(nextPage) => updateQuery({ page: String(nextPage) })}
        />
      ) : null}
    </AdminShell>
  );
}

export default AdminServicesPage;
