import { useTranslation } from 'react-i18next';
import AdminPagination from '../../components/admin/AdminPagination.jsx';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminTable from '../../components/admin/AdminTable.jsx';
import { Select } from '../../components/TextField.jsx';
import { PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';
import { formatRating } from '../../utils/format.js';

// Column labels are i18n keys, translated at render.
const COLUMNS = [
  { key: 'name', label: 'admin.fields.name' },
  { key: 'username', label: 'admin.fields.phone' },
  { key: 'rating', label: 'admin.fields.rating', render: (row) => formatRating(row.rating) || '—' },
  { key: 'reviewCount', label: 'admin.fields.reviews' },
  { key: 'completedJobs', label: 'admin.providers.completedJobs' },
  {
    key: 'isActive',
    label: 'admin.fields.status',
    render: (row, t) => (
      <span className={`badge badge--${row.isActive ? 'success' : 'muted'}`}>
        {row.isActive ? t('admin.shared.active') : t('admin.shared.deactivated')}
      </span>
    ),
  },
];

const STATUS_OPTIONS = [
  { value: '', label: 'admin.shared.allStatuses' },
  { value: 'true', label: 'admin.shared.active' },
  { value: 'false', label: 'admin.shared.deactivated' },
];

function AdminProvidersPage() {
  const { t } = useTranslation();
  const page = Number(useQueryParam('page')) || 1;
  const isActive = useQueryParam('isActive') || '';
  const search = useQueryParam('search') || '';
  const providers = useApi(
    () => adminApi.providers({ page, isActive: isActive || undefined, search: search || undefined }),
    [page, isActive, search],
  );

  const columns = COLUMNS.map((column) => ({
    ...column,
    label: t(column.label),
    render: column.render ? (row) => column.render(row, t) : undefined,
  }));
  const statusOptions = STATUS_OPTIONS.map((option) => ({ ...option, label: t(option.label) }));

  function updateQuery(next) {
    const params = new URLSearchParams({
      ...(isActive ? { isActive } : {}),
      ...(search ? { search } : {}),
      page: '1',
      ...next,
    });

    for (const [key, value] of [...params.entries()]) {
      if (!value) params.delete(key);
    }

    navigate(`/app/admin/providers?${params.toString()}`, { replace: true });
  }

  return (
    <AdminShell>
      <PageHeader title={t('common.adminNav.providers')} subtitle={t('admin.providers.subtitle')} />

      <div className="admin-filters">
        <Select
          id="isActiveFilter"
          label={t('admin.fields.status')}
          value={isActive}
          options={statusOptions}
          onChange={(event) => updateQuery({ isActive: event.target.value })}
        />
        <div className="field">
          <label htmlFor="searchFilter">{t('admin.fields.search')}</label>
          <div className="field-control">
            <input
              id="searchFilter"
              className="field-input"
              type="search"
              placeholder={t('admin.shared.namePhonePlaceholder')}
              defaultValue={search}
              onKeyDown={(event) => {
                if (event.key === 'Enter') updateQuery({ search: event.currentTarget.value });
              }}
              onBlur={(event) => updateQuery({ search: event.currentTarget.value })}
            />
          </div>
        </div>
      </div>

      <AdminTable
        columns={columns}
        rows={providers.data?.providers || []}
        loading={providers.loading}
        error={providers.error}
        onRetry={providers.reload}
        emptyTitle={t('admin.providers.emptyTitle')}
        getRowHref={(row) => `/app/admin/providers/${row.id}`}
      />

      {providers.data ? (
        <AdminPagination
          page={providers.data.page}
          totalPages={providers.data.totalPages}
          total={providers.data.total}
          onChange={(nextPage) => updateQuery({ page: String(nextPage) })}
        />
      ) : null}
    </AdminShell>
  );
}

export default AdminProvidersPage;
