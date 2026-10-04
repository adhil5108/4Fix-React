import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminTable from '../../components/admin/AdminTable.jsx';
import TextField, { TextArea } from '../../components/TextField.jsx';
import { ServiceIcon } from '../../components/cards.jsx';
import { Button, Card, ConfirmDialog, Notice, PageHeader } from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { useTranslatedErrors } from '../../hooks/useTranslatedErrors.js';
import { adminApi } from '../../services/fixApi.js';
import { ServiceImageField } from './AdminServiceFormPage.jsx';

const EMPTY_FORM = { name: '', description: '', image: '', isActive: true };

function formFromCategory(category) {
  return {
    name: category.name,
    description: category.description || '',
    image: category.image || '',
    isActive: category.isActive,
  };
}

function validate(form, t) {
  const name = form.name.trim();
  const errors = {};

  if (name.length < 2) errors.name = t('admin.categories.validation.name');
  else if (name.length > 60) errors.name = t('admin.categories.validation.nameLong');

  return errors;
}

// Categories are a short list, so admin manages them on one page: the table, plus a
// form that creates a new category or edits the selected one.
function AdminCategoriesPage() {
  const { t } = useTranslation();
  const categories = useApi(() => adminApi.categories(), []);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [imageUploading, setImageUploading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [success, setSuccess] = useState('');
  useTranslatedErrors(setErrors, () => validate(form, t));
  const save = useAction();
  const remove = useAction();

  function startEdit(category) {
    setEditing(category);
    setForm(category ? formFromCategory(category) : EMPTY_FORM);
    setErrors({});
    setSuccess('');
    save.setError('');
    remove.setError('');
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (imageUploading) return;

    const nextErrors = validate(form, t);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      image: form.image.trim() || null,
      isActive: form.isActive,
    };

    const ok = await save.run('save', () =>
      editing ? adminApi.updateCategory(editing.id, payload) : adminApi.createCategory(payload),
    );

    if (ok) {
      setSuccess(editing ? 'admin.categories.saved' : 'admin.categories.created');
      setEditing(null);
      setForm(EMPTY_FORM);
      await categories.refresh();
    }
  }

  async function handleDelete() {
    const ok = await remove.run('delete', () => adminApi.deleteCategory(editing.id));
    setConfirmingDelete(false);

    if (ok) {
      setSuccess('admin.categories.deleted');
      setEditing(null);
      setForm(EMPTY_FORM);
      await categories.refresh();
    }
  }

  const columns = [
    {
      key: 'name',
      label: t('admin.fields.name'),
      render: (row) => (
        <span className="service-inline">
          <ServiceIcon service={row} size="sm" />
          {row.name}
        </span>
      ),
    },
    { key: 'serviceCount', label: t('admin.categories.columns.services') },
    {
      key: 'isActive',
      label: t('admin.fields.status'),
      render: (row) => (
        <span className={`badge badge--${row.isActive ? 'done' : 'muted'}`}>
          {row.isActive ? t('admin.shared.active') : t('admin.shared.inactive')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button type="button" className="link" onClick={() => startEdit(row)}>
          {t('admin.categories.edit')}
        </button>
      ),
    },
  ];

  const canDelete = editing && editing.serviceCount === 0;

  return (
    <AdminShell>
      <PageHeader
        title={t('common.adminNav.categories')}
        subtitle={t('admin.categories.subtitle')}
      />

      <div className="stack">
        <Notice tone="success">{success ? t(success) : ''}</Notice>
        <Notice>{remove.error}</Notice>
      </div>

      <div className="admin-split">
        <div className="admin-split__main">
          <AdminTable
            columns={columns}
            rows={categories.data?.categories || []}
            loading={categories.loading}
            error={categories.error}
            onRetry={categories.reload}
            emptyTitle={t('admin.categories.emptyTitle')}
            emptyMessage={t('admin.categories.emptyMessage')}
          />
        </div>

        <Card className="admin-split__side">
          <h2 className="card__title">
            {editing ? t('admin.categories.editTitle', { name: editing.name }) : t('admin.categories.newTitle')}
          </h2>
          <form className="form-stack" onSubmit={handleSubmit} noValidate>
            <Notice>{save.error}</Notice>
            <TextField
              id="categoryName"
              label={t('admin.categories.name')}
              value={form.name}
              error={errors.name}
              maxLength={60}
              placeholder={t('admin.categories.namePlaceholder')}
              onChange={(event) => update('name', event.target.value)}
            />
            <TextArea
              id="categoryDescription"
              label={t('admin.categories.description')}
              rows={2}
              maxLength={300}
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
            />
            <ServiceImageField
              label={t('admin.categories.icon')}
              value={form.image}
              onChange={(url) => update('image', url)}
              onUploadingChange={setImageUploading}
            />
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => update('isActive', event.target.checked)}
              />
              <span>
                <strong>{t('admin.categories.active')}</strong>
                <span className="field-hint">{t('admin.categories.activeHint')}</span>
              </span>
            </label>
            <div className="admin-form-actions">
              <Button
                type="submit"
                loading={save.pending === 'save'}
                loadingText={t('admin.serviceForm.saving')}
                disabled={imageUploading}
              >
                {editing ? t('admin.serviceForm.saveChanges') : t('admin.categories.create')}
              </Button>
              {editing ? (
                <Button variant="secondary" onClick={() => startEdit(null)}>
                  {t('admin.categories.cancel')}
                </Button>
              ) : null}
            </div>
            {editing ? (
              canDelete ? (
                <Button variant="danger-ghost" onClick={() => setConfirmingDelete(true)}>
                  {t('admin.categories.delete')}
                </Button>
              ) : (
                <p className="field-hint">{t('admin.categories.cannotDelete', { count: editing.serviceCount })}</p>
              )
            ) : null}
          </form>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title={t('admin.categories.deleteTitle')}
        message={t('admin.categories.deleteMessage')}
        confirmLabel={t('admin.categories.delete')}
        confirmVariant="danger"
        busy={remove.pending === 'delete'}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </AdminShell>
  );
}

export default AdminCategoriesPage;
