import { useState } from 'react';
import { TextArea } from './TextField.jsx';
import { Button, Notice } from './ui.jsx';

const LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export function StarRating({ value, onChange, readOnly = false, size }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;

  if (readOnly) {
    return (
      <span className={`stars${size ? ` stars--${size}` : ''}`} aria-label={`${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={`stars__star${star <= value ? ' is-on' : ''}`} aria-hidden="true">
            ★
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className="stars-input" role="radiogroup" aria-label="Rating">
      <span className={`stars${size ? ` stars--${size}` : ''}`} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''} – ${LABELS[star - 1]}`}
            className={`stars__star stars__star--button${star <= shown ? ' is-on' : ''}`}
            onMouseEnter={() => setHover(star)}
            onFocus={() => setHover(star)}
            onBlur={() => setHover(0)}
            onClick={() => onChange(star)}
          >
            ★
          </button>
        ))}
      </span>
      <span className="stars-input__label">{shown ? LABELS[shown - 1] : 'Tap a star'}</span>
    </div>
  );
}

export function ReviewForm({ providerName, busy, error, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingError, setRatingError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    if (!rating) {
      setRatingError('Choose a star rating.');
      return;
    }

    onSubmit({ rating, comment: comment.trim() });
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <Notice>{error}</Notice>
      <div className="field">
        <label>How was your experience{providerName ? ` with ${providerName}` : ''}?</label>
        <StarRating
          value={rating}
          size="lg"
          onChange={(value) => {
            setRating(value);
            setRatingError('');
          }}
        />
        {ratingError ? <p className="field-error">{ratingError}</p> : null}
      </div>
      <TextArea
        id="comment"
        label="Comment (optional)"
        rows={4}
        maxLength={1000}
        value={comment}
        placeholder="What went well? Anything the provider could improve?"
        onChange={(event) => setComment(event.target.value)}
      />
      <Button type="submit" block size="lg" loading={busy} loadingText="Submitting…">
        Submit review
      </Button>
    </form>
  );
}
