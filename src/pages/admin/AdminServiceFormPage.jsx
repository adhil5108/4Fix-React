import { useEffect, useState } from 'react';
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
import { navigate } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';

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

function validate(form) {
  const errors = {};

  if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
  if (form.description.trim().length < 5) errors.description = 'Description must be at least 5 characters.';
  if (form.category.trim().length < 2) errors.category = 'Category is required.';

  if (form.startingPrice !== '' && (Number.isNaN(Number(form.startingPrice)) || Number(form.startingPrice) < 0)) {
    errors.startingPrice = 'Starting price must be a non-negative number.';
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

function IssueEditor({ issues, setIssues }) {
  function update(id, field, value) {
    setIssues((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  return (
    <div className="field">
      <label>What's wrong? issues</label>
      {issues.length === 0 ? <p className="field-hint">No issues yet. Customers will only see "Something else".</p> : null}
      <div className="stack">
        {issues.map((row) => (
          <div key={row.id} className="card admin-issue-row">
            <div className="form-row">
              <TextField
                id={`issue-key-${row.id}`}
                label="Key"
                value={row.key}
                maxLength={60}
                placeholder="NOT_COOLING"
                onChange={(event) => update(row.id, 'key', event.target.value.toUpperCase())}
              />
              <TextField
                id={`issue-label-${row.id}`}
                label="Label"
                value={row.label}
                maxLength={120}
                placeholder="Not cooling"
                onChange={(event) => update(row.id, 'label', event.target.value)}
              />
            </div>
            <TextField
              id={`issue-description-${row.id}`}
              label="Description (optional)"
              value={row.description}
              maxLength={300}
              placeholder="Runs but the air is not cold"
              onChange={(event) => update(row.id, 'description', event.target.value)}
            />
            <div className="admin-issue-row__footer">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={row.isActive}
                  onChange={(event) => update(row.id, 'isActive', event.target.checked)}
                />
                <span>Active</span>
              </label>
              <button
                type="button"
                className="text-link"
                onClick={() => setIssues((current) => current.filter((item) => item.id !== row.id))}
              >
                Remove
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
        Add issue
      </Button>
    </div>
  );
}

function AdminServiceFormPage({ serviceId }) {
  const isEdit = Boolean(serviceId);
  const existing = useApi(
    () => (isEdit ? adminApi.service(serviceId) : Promise.resolve(null)),
    [serviceId],
  );
  const [form, setForm] = useState(EMPTY_FORM);
  const [issues, setIssues] = useState([]);
  const [errors, setErrors] = useState({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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
    const nextErrors = validate(form);

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

  const back = { to: '/app/admin/services', label: 'Services' };

  if (isEdit && existing.loading) {
    return (
      <AdminShell>
        <LoadingState label="Loading service…" />
      </AdminShell>
    );
  }

  if (isEdit && existing.error) {
    return (
      <AdminShell>
        <PageHeader title="Service" back={back} />
        <ErrorState error={existing.error} onRetry={existing.reload} />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageHeader
        back={back}
        title={isEdit ? existing.data.service.name : 'New service'}
        subtitle={isEdit ? 'Edit this service' : 'Add a service to the catalogue'}
      />

      <form className="stack" onSubmit={handleSubmit} noValidate>
        <Notice>{save.error || remove.error}</Notice>

        <Card>
          <h2 className="card__title">Details</h2>
          <div className="form-stack">
            <TextField
              id="name"
              label="Name"
              value={form.name}
              error={errors.name}
              maxLength={120}
              onChange={(event) => update('name', event.target.value)}
            />
            <TextArea
              id="description"
              label="Description"
              rows={3}
              value={form.description}
              error={errors.description}
              maxLength={1000}
              onChange={(event) => update('description', event.target.value)}
            />
            <div className="form-row">
              <TextField
                id="category"
                label="Category"
                value={form.category}
                error={errors.category}
                maxLength={60}
                placeholder="AC"
                onChange={(event) => update('category', event.target.value)}
              />
              <TextField
                id="startingPrice"
                label="Starting price (optional)"
                type="text"
                inputMode="decimal"
                value={form.startingPrice}
                error={errors.startingPrice}
                placeholder="499"
                onChange={(event) => update('startingPrice', event.target.value.replace(/[^\d.]/g, ''))}
              />
            </div>
            <TextField
              id="image"
              label="Image URL (optional)"
              value={form.image}
              maxLength={500}
              placeholder="https://…"
              onChange={(event) => update('image', event.target.value)}
            />
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.isPopular}
                onChange={(event) => update('isPopular', event.target.checked)}
              />
              <span>
                <strong>Popular</strong>
                <span className="field-hint">Featured on the home page.</span>
              </span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => update('isActive', event.target.checked)}
              />
              <span>
                <strong>Active</strong>
                <span className="field-hint">Inactive services are hidden from customers.</span>
              </span>
            </label>
          </div>
        </Card>

        <Card>
          <h2 className="card__title">Issues</h2>
          <IssueEditor issues={issues} setIssues={setIssues} />
        </Card>

        <div className="admin-form-actions">
          <Button type="submit" loading={save.pending === 'save'} loadingText="Saving…">
            {isEdit ? 'Save changes' : 'Create service'}
          </Button>
          {isEdit ? (
            <Button variant="danger-ghost" onClick={() => setConfirmingDelete(true)}>
              Delete service
            </Button>
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this service?"
        message="This only works if no request has ever used this service. Otherwise, deactivate it instead."
        confirmLabel="Delete service"
        confirmVariant="danger"
        busy={remove.pending === 'delete'}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </AdminShell>
  );
}

export default AdminServiceFormPage;
