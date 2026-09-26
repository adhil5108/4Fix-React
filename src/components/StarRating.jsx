import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextArea } from './TextField.jsx';
import { Button, Notice } from './ui.jsx';

export function StarRating({ value, onChange, readOnly = false, size }) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;

  if (readOnly) {
    return (
      <span className={`stars${size ? ` stars--${size}` : ''}`} aria-label={t('cards.rating.outOf', { value })}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={`stars__star${star <= value ? ' is-on' : ''}`} aria-hidden="true">
            ★
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className="stars-input" role="radiogroup" aria-label={t('cards.rating.groupLabel')}>
      <span className={`stars${size ? ` stars--${size}` : ''}`} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={t('cards.rating.starOption', { count: star, label: t(`cards.rating.labels.${star}`) })}
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
      <span className="stars-input__label">{shown ? t(`cards.rating.labels.${shown}`) : t('cards.rating.tapStar')}</span>
    </div>
  );
}

export function ReviewForm({ providerName, busy, error, onSubmit }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingError, setRatingError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    if (!rating) {
      setRatingError('cards.review.chooseRating');
      return;
    }

    onSubmit({ rating, comment: comment.trim() });
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <Notice>{error}</Notice>
      <div className="field">
        <label>
          {providerName
            ? t('cards.review.questionWith', { name: providerName })
            : t('cards.review.question')}
        </label>
        <StarRating
          value={rating}
          size="lg"
          onChange={(value) => {
            setRating(value);
            setRatingError('');
          }}
        />
        {ratingError ? <p className="field-error">{t(ratingError)}</p> : null}
      </div>
      <TextArea
        id="comment"
        label={t('cards.review.comment')}
        rows={4}
        maxLength={1000}
        value={comment}
        placeholder={t('cards.review.commentPlaceholder')}
        onChange={(event) => setComment(event.target.value)}
      />
      <Button type="submit" block size="lg" loading={busy} loadingText={t('cards.review.submitting')}>
        {t('cards.review.submit')}
      </Button>
    </form>
  );
}
