import { useState } from 'react';
import { useAction, useApi } from '../hooks/useApi.js';
import { formatDateTime } from '../utils/format.js';
import { TextArea } from './TextField.jsx';
import { Button, Notice } from './ui.jsx';

const MAX_NOTE_LENGTH = 2000;

function NoteForm({ initialValue = '', busy, error, submitLabel, onCancel, onSubmit }) {
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
        label={onCancel ? 'Edit note' : 'Write a note…'}
        value={content}
        maxLength={MAX_NOTE_LENGTH}
        rows={3}
        onChange={(event) => setContent(event.target.value)}
      />
      <div className="card__actions">
        {onCancel ? (
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" size="sm" loading={busy} loadingText="Saving…" disabled={!content.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function NoteItem({ note, notesApi, jobId, onChanged }) {
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
          submitLabel="Save note"
          onCancel={() => setEditing(false)}
          onSubmit={async (content) => {
            if (!content) {
              edit.setError('Note cannot be empty.');
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
            Edit
          </Button>
          <Button
            variant="danger-ghost"
            size="sm"
            loading={remove.pending === 'delete'}
            loadingText="Deleting…"
            onClick={async () => {
              const ok = await remove.run('delete', () => notesApi.remove(jobId, note.id));
              if (ok) onChanged();
            }}
          >
            Delete
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
  const data = useApi(async () => (await notesApi.list(jobId)).notes, [jobId]);
  const create = useAction();
  const [formKey, setFormKey] = useState(0);

  if (data.loading) {
    return <p className="body-text">Loading notes…</p>;
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
        submitLabel="Add note"
        onSubmit={async (content) => {
          if (!content) {
            create.setError('Note cannot be empty.');
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
        <p className="field-hint">No notes yet. Notes are private and only visible to you.</p>
      )}
    </div>
  );
}

export default JobNotes;
