import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminShell from '../../components/admin/AdminShell.jsx';
import TextField, { TextArea } from '../../components/TextField.jsx';
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { useTranslatedErrors } from '../../hooks/useTranslatedErrors.js';
import { navigate } from '../../hooks/useRoute.js';
import { adminApi, uploadsApi } from '../../services/fixApi.js';

const EMPTY_FORM = {
  name: '',
  description: '',
  category: '',
  image: '',
  startingPrice: '',
  isPopular: false,
  isActive: true,
};

function formFromService(service) {
  return {
    name: service.name,
    description: service.description,
    category: service.category,
    image: service.image || '',
    startingPrice: service.startingPrice === null ? '' : String(service.startingPrice),
    isPopular: service.isPopular,
    isActive: service.isActive,
  };
}

function issueFromRow(row) {
  return { key: row.key, label: row.label, description: row.description || '', isActive: row.isActive };
}

function newIssueRow() {
  return { id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`, key: '', label: '', description: '', isActive: true };
}

function validate(form, t) {
  const errors = {};

  if (form.name.trim().length < 2) errors.name = t('admin.serviceForm.validation.name');
  if (form.description.trim().length < 5) errors.description = t('admin.serviceForm.validation.description');
  if (form.category.trim().length < 2) errors.category = t('admin.serviceForm.validation.category');

  if (form.startingPrice !== '' && (Number.isNaN(Number(form.startingPrice)) || Number(form.startingPrice) < 0)) {
    errors.startingPrice = t('admin.serviceForm.validation.startingPrice');
  }

  return errors;
}

function buildPayload(form, issues) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    image: form.image.trim() || null,
    startingPrice: form.startingPrice === '' ? null : Number(form.startingPrice),
    isPopular: form.isPopular,
    isActive: form.isActive,
    issues: issues.map(issueFromRow),
  };
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function validateServiceImageFile(file, t) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return t('admin.serviceForm.image.invalidType');
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return t('admin.serviceForm.image.tooLarge');
  }

  return '';
}

// Uploads through the same Cloudinary endpoint the customer booking flow already uses
// (POST /api/uploads/image via uploadsApi) — no separate upload path. `value`/`onChange`
// plug straight into the form's existing `image` field, so the rest of the form (and the
// create/update payload) is unchanged from when this was a plain URL text input.
function ServiceImageField({ value, onChange, onUploadingChange }) {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFile(file) {
    const validationError = validateServiceImageFile(file, t);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setStatus('uploading');
    onUploadingChange(true);

    try {
      const result = await uploadsApi.image(file);
      onChange(result.image.url);
      setStatus('idle');
    } catch (uploadError) {
      setStatus('error');
      setError(uploadError.message);
    } finally {
      onUploadingChange(false);
    }
  }

  function handleRemove() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStatus('idle');
    setError('');
    onChange('');
  }

  const displayUrl = previewUrl || value || null;
  const isUploading = status === 'uploading';

  return (
    <div className="field">
      <label htmlFor="serviceImageInput">{t('admin.serviceForm.image.label')}</label>
      <input
        ref={inputRef}
        id="serviceImageInput"
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) handleFile(file);
        }}
      />
      <div className="image-picker">
        {displayUrl ? (
          <div className={`image-picker__item image-picker__item--${status}`}>
            <div className="image-picker__thumb">
              <img src={displayUrl} alt="" />
              {isUploading ? (
                <span className="image-picker__overlay" aria-live="polite">
                  <span className="spinner spinner--sm" aria-hidden="true" />
                  <span className="sr-only">{t('admin.serviceForm.image.uploading')}</span>
                </span>
              ) : null}
            </div>
            <button
              type="button"
              className="image-picker__remove"
              onClick={handleRemove}
              disabled={isUploading}
              aria-label={t('admin.serviceForm.image.remove')}
            >
              ×
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className="image-picker__add"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          <span aria-hidden="true">{displayUrl ? '↻' : '+'}</span>
          <span>{displayUrl ? t('admin.serviceForm.image.replace') : t('admin.serviceForm.image.add')}</span>
        </button>
      </div>
      {error ? (
        <p className="field-error">{error}</p>
      ) : (
        <p className="field-hint">{t('admin.serviceForm.image.hint')}</p>
      )}
    </div>
  );
}

function IssueEditor({ issues, setIssues }) {
  const { t } = useTranslation();
  function update(id, field, value) {
    setIssues((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  return (
    <div className="field">
      <label>{t('admin.serviceForm.issueEditor.label')}</label>
      {issues.length === 0 ? <p className="field-hint">{t('admin.serviceForm.issueEditor.empty')}</p> : null}
      <div className="stack">
        {issues.map((row) => (
          <div key={row.id} className="card admin-issue-row">
            <div className="form-row">
              <TextField
                id={`issue-key-${row.id}`}
                label={t('admin.serviceForm.issueEditor.key')}
                value={row.key}
                maxLength={60}
                placeholder="NOT_COOLING"
                onChange={(event) => update(row.id, 'key', event.target.value.toUpperCase())}
              />
              <TextField
                id={`issue-label-${row.id}`}
                label={t('admin.serviceForm.issueEditor.issueLabel')}
                value={row.label}
                maxLength={120}
                placeholder={t('admin.serviceForm.issueEditor.labelPlaceholder')}
                onChange={(event) => update(row.id, 'label', event.target.value)}
              />
            </div>
            <TextField
              id={`issue-description-${row.id}`}
              label={t('admin.serviceForm.issueEditor.description')}
              value={row.description}
              maxLength={300}
              placeholder={t('admin.serviceForm.issueEditor.descriptionPlaceholder')}
              onChange={(event) => update(row.id, 'description', event.target.value)}
            />
            <div className="admin-issue-row__footer">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={row.isActive}
                  onChange={(event) => update(row.id, 'isActive', event.target.checked)}
                />
                <span>{t('admin.serviceForm.issueEditor.active')}</span>
              </label>
              <button
                type="button"
                className="text-link"
                onClick={() => setIssues((current) => current.filter((item) => item.id !== row.id))}
              >
                {t('admin.serviceForm.issueEditor.remove')}
              </button>
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIssues((current) => [...current, newIssueRow()])}
      >
        {t('admin.serviceForm.issueEditor.add')}
      </Button>
    </div>
  );
}

function AdminServiceFormPage({ serviceId }) {
  const { t } = useTranslation();
  const isEdit = Boolean(serviceId);
  const existing = useApi(
    () => (isEdit ? adminApi.service(serviceId) : Promise.resolve(null)),
    [serviceId],
  );
  const [form, setForm] = useState(EMPTY_FORM);
  const [issues, setIssues] = useState([]);
  const [errors, setErrors] = useState({});
  useTranslatedErrors(setErrors, () => validate(form, t));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const save = useAction();
  const remove = useAction();

  useEffect(() => {
    if (existing.data?.service) {
      setForm(formFromService(existing.data.service));
      setIssues(
        existing.data.service.issues.map((issue) => ({
          id: issue.key,
          ...issue,
          description: issue.description || '',
        })),
      );
    }
  }, [existing.data]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Belt-and-suspenders: the submit button is already disabled while an image
    // upload is in flight, but guard here too in case submit is triggered another way.
    if (imageUploading) {
      return;
    }

    const nextErrors = validate(form, t);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = buildPayload(form, issues);

    await save.run('save', async () => {
      const result = isEdit
        ? await adminApi.updateService(serviceId, payload)
        : await adminApi.createService(payload);

      navigate(`/app/admin/services/${result.service.id}`, { replace: true });
    });
  }

  async function handleDelete() {
    const ok = await remove.run('delete', () => adminApi.deleteService(serviceId));

    if (ok) {
      navigate('/app/admin/services');
    } else {
      setConfirmingDelete(false);
    }
  }

  const back = { to: '/app/admin/services', label: t('common.adminNav.services') };

  if (isEdit && existing.loading) {
    return (
      <AdminShell>
        <LoadingState label={t('admin.serviceForm.loading')} />
      </AdminShell>
    );
  }

  if (isEdit && existing.error) {
    return (
      <AdminShell>
        <PageHeader title={t('admin.serviceForm.fallbackTitle')} back={back} />
        <ErrorState error={existing.error} onRetry={existing.reload} />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageHeader
        back={back}
        title={isEdit ? existing.data.service.name : t('admin.serviceForm.newTitle')}
        subtitle={isEdit ? t('admin.serviceForm.editSubtitle') : t('admin.serviceForm.newSubtitle')}
      />

      <form className="stack" onSubmit={handleSubmit} noValidate>
        <Notice>{save.error || remove.error}</Notice>

        <Card>
          <h2 className="card__title">{t('admin.serviceForm.details')}</h2>
          <div className="form-stack">
            <TextField
              id="name"
              label={t('admin.serviceForm.name')}
              value={form.name}
              error={errors.name}
              maxLength={120}
              onChange={(event) => update('name', event.target.value)}
            />
            <TextArea
              id="description"
              label={t('admin.serviceForm.description')}
              rows={3}
              value={form.description}
              error={errors.description}
              maxLength={1000}
              onChange={(event) => update('description', event.target.value)}
            />
            <div className="form-row">
              <TextField
                id="category"
                label={t('admin.serviceForm.category')}
                value={form.category}
                error={errors.category}
                maxLength={60}
                placeholder="AC"
                onChange={(event) => update('category', event.target.value)}
              />
              <TextField
                id="startingPrice"
                label={t('admin.serviceForm.startingPrice')}
                type="text"
                inputMode="decimal"
                value={form.startingPrice}
                error={errors.startingPrice}
                placeholder="499"
                onChange={(event) => update('startingPrice', event.target.value.replace(/[^\d.]/g, ''))}
              />
            </div>
            <ServiceImageField
              value={form.image}
              onChange={(url) => update('image', url)}
              onUploadingChange={setImageUploading}
            />
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.isPopular}
                onChange={(event) => update('isPopular', event.target.checked)}
              />
              <span>
                <strong>{t('admin.serviceForm.popular')}</strong>
                <span className="field-hint">{t('admin.serviceForm.popularHint')}</span>
              </span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => update('isActive', event.target.checked)}
              />
              <span>
                <strong>{t('admin.serviceForm.active')}</strong>
                <span className="field-hint">{t('admin.serviceForm.activeHint')}</span>
              </span>
            </label>
          </div>
        </Card>

        <Card>
          <h2 className="card__title">{t('admin.serviceForm.issues')}</h2>
          <IssueEditor issues={issues} setIssues={setIssues} />
        </Card>

        <div className="admin-form-actions">
          <Button
            type="submit"
            loading={save.pending === 'save'}
            loadingText={t('admin.serviceForm.saving')}
            disabled={imageUploading}
          >
            {isEdit ? t('admin.serviceForm.saveChanges') : t('admin.serviceForm.create')}
          </Button>
          {isEdit ? (
            <Button variant="danger-ghost" onClick={() => setConfirmingDelete(true)}>
              {t('admin.serviceForm.delete')}
            </Button>
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        open={confirmingDelete}
        title={t('admin.serviceForm.deleteTitle')}
        message={t('admin.serviceForm.deleteMessage')}
        confirmLabel={t('admin.serviceForm.delete')}
        confirmVariant="danger"
        busy={remove.pending === 'delete'}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </AdminShell>
  );
}

export default AdminServiceFormPage;
