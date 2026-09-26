import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAction, useApi } from '../hooks/useApi.js';
import { formatDateTime } from '../utils/format.js';
import { TextArea } from './TextField.jsx';
import { Button, Notice } from './ui.jsx';

const MAX_NOTE_LENGTH = 2000;

function NoteForm({ initialValue = '', busy, error, submitLabel, onCancel, onSubmit }) {
  const { t } = useTranslation();
  const [content, setContent] = useState(initialValue);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(content.trim());
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <Notice>{error}</Notice>
      <TextArea
        id={onCancel ? 'note-edit' : 'note-new'}
        label={onCancel ? t('provider.notes.editLabel') : t('provider.notes.newLabel')}
        value={content}
        maxLength={MAX_NOTE_LENGTH}
        rows={3}
        onChange={(event) => setContent(event.target.value)}
      />
      <div className="card__actions">
        {onCancel ? (
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
            {t('provider.notes.cancel')}
          </Button>
        ) : null}
        <Button type="submit" size="sm" loading={busy} loadingText={t('provider.notes.saving')} disabled={!content.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function NoteItem({ note, notesApi, jobId, onChanged }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const edit = useAction();
  const remove = useAction();

  if (editing) {
    return (
      <div className="job-note">
        <NoteForm
          initialValue={note.content}
          busy={edit.pending === 'save'}
          error={edit.error}
          submitLabel={t('provider.notes.save')}
          onCancel={() => setEditing(false)}
          onSubmit={async (content) => {
            if (!content) {
              edit.setError(t('provider.notes.emptyError'));
              return;
            }
            const ok = await edit.run('save', () => notesApi.update(jobId, note.id, content));
            if (ok) {
              setEditing(false);
              onChanged();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="job-note">
      <p className="job-note__content">{note.content}</p>
      <div className="job-note__meta">
        <span>{formatDateTime(note.updatedAt)}</span>
        <span className="job-note__actions">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            {t('provider.notes.edit')}
          </Button>
          <Button
            variant="danger-ghost"
            size="sm"
            loading={remove.pending === 'delete'}
            loadingText={t('provider.notes.deleting')}
            onClick={async () => {
              const ok = await remove.run('delete', () => notesApi.remove(jobId, note.id));
              if (ok) onChanged();
            }}
          >
            {t('provider.notes.delete')}
          </Button>
        </span>
      </div>
      <Notice>{remove.error}</Notice>
    </div>
  );
}

// Private to the provider — work details, materials, offline work, reminders. Never
// visible to the customer or admin; the backend enforces that, this just presents it.
// `notesApi` is either `bookingsApi.notes` or `providerExternalJobsApi.notes` — same
// {list,create,update,remove} shape either way, so this component doesn't care which
// kind of job it's attached to.
function JobNotes({ jobId, notesApi }) {
  const { t } = useTranslation();
  const data = useApi(async () => (await notesApi.list(jobId)).notes, [jobId]);
  const create = useAction();
  const [formKey, setFormKey] = useState(0);

  if (data.loading) {
    return <p className="body-text">{t('provider.notes.loading')}</p>;
  }

  if (data.error) {
    return <Notice>{data.error.message}</Notice>;
  }

  const notes = data.data || [];

  return (
    <div className="stack">
      <NoteForm
        key={formKey}
        busy={create.pending === 'create'}
        error={create.error}
        submitLabel={t('provider.notes.add')}
        onSubmit={async (content) => {
          if (!content) {
            create.setError(t('provider.notes.emptyError'));
            return;
          }
          const ok = await create.run('create', () => notesApi.create(jobId, content));
          if (ok) {
            setFormKey((key) => key + 1);
            await data.refresh();
          }
        }}
      />
      {notes.length ? (
        <div className="job-notes__list">
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} notesApi={notesApi} jobId={jobId} onChanged={() => data.refresh()} />
          ))}
        </div>
      ) : (
        <p className="field-hint">{t('provider.notes.empty')}</p>
      )}
    </div>
  );
}

export default JobNotes;
