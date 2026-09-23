import { useEffect, useRef, useState } from 'react';
import { uploadsApi } from '../services/fixApi.js';

export const MAX_ATTACHMENTS = 10;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function validateImageFile(file) {
  if (!file.type.startsWith('image/')) {
    return 'Only image files are allowed.';
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return 'Images must be 5MB or smaller.';
  }

  return '';
}

// Each picked file gets its own upload lifecycle (uploading/success/error), tracked
// locally here. Only successfully uploaded Cloudinary URLs are pushed into
// `attachments` — the array that is actually sent when the form is submitted.
function ImageAttachments({
  attachments,
  setAttachments,
  error,
  label = 'Photos (optional)',
  hint = `Up to ${MAX_ATTACHMENTS} photos, 5MB each.`,
}) {
  const [items, setItems] = useState([]);
  const [pickError, setPickError] = useState('');
  const inputRef = useRef(null);
  const removedIdsRef = useRef(new Set());

  useEffect(() => {
    // Revoke every preview URL once, when the form is left.
    return () => items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadItem(item) {
    try {
      const result = await uploadsApi.image(item.file);

      if (removedIdsRef.current.has(item.id)) {
        return;
      }

      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: 'success', url: result.image.url } : entry,
        ),
      );
      setAttachments((current) => [...current, result.image.url]);
    } catch (uploadError) {
      if (removedIdsRef.current.has(item.id)) {
        return;
      }

      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: 'error', error: uploadError.message } : entry,
        ),
      );
    }
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || []);

    if (files.length === 0) {
      return;
    }

    const availableSlots = MAX_ATTACHMENTS - items.length;

    if (availableSlots <= 0) {
      setPickError(`You can add up to ${MAX_ATTACHMENTS} photos.`);
      return;
    }

    const accepted = files.slice(0, availableSlots);
    setPickError(files.length > accepted.length ? `You can add up to ${MAX_ATTACHMENTS} photos.` : '');

    const newItems = accepted.map((file) => {
      const validationError = validateImageFile(file);

      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: validationError ? 'error' : 'uploading',
        url: null,
        error: validationError,
      };
    });

    setItems((current) => [...current, ...newItems]);
    newItems.filter((item) => item.status === 'uploading').forEach(uploadItem);
  }

  function removeItem(item) {
    removedIdsRef.current.add(item.id);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    URL.revokeObjectURL(item.previewUrl);

    if (item.status === 'success' && item.url) {
      setAttachments((current) => current.filter((url) => url !== item.url));
    }
  }

  function retryItem(item) {
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, status: 'uploading', error: '' } : entry)),
    );
    uploadItem(item);
  }

  return (
    <div className="field">
      <label htmlFor="imageInput">{label}</label>
      <input
        ref={inputRef}
        id="imageInput"
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <div className="image-picker">
        {items.map((item) => (
          <div key={item.id} className={`image-picker__item image-picker__item--${item.status}`}>
            <div className="image-picker__thumb">
              <img src={item.previewUrl} alt="" />
              {item.status === 'uploading' ? (
                <span className="image-picker__overlay" aria-live="polite">
                  <span className="spinner spinner--sm" aria-hidden="true" />
                  <span className="sr-only">Uploading…</span>
                </span>
              ) : null}
              {item.status === 'success' ? (
                <span className="image-picker__badge" aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </div>
            <button
              type="button"
              className="image-picker__remove"
              onClick={() => removeItem(item)}
              aria-label="Remove photo"
            >
              ×
            </button>
            {item.status === 'error' ? (
              <div className="image-picker__error">
                <span>{item.error}</span>
                <button type="button" className="text-link" onClick={() => retryItem(item)}>
                  Retry
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {items.length < MAX_ATTACHMENTS ? (
          <button type="button" className="image-picker__add" onClick={() => inputRef.current?.click()}>
            <span aria-hidden="true">+</span>
            <span>Add photo</span>
          </button>
        ) : null}
      </div>
      {pickError || error ? (
        <p className="field-error">{pickError || error}</p>
      ) : (
        <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

export default ImageAttachments;
