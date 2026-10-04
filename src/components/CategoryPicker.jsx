import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

// "Which categories do you work in?" — provider signup and profile. Real checkboxes in
// large tap targets, two per row on phones. `value` holds category ids.
function CategoryPicker({ id = 'categories', categories, value, onChange, error, hint, disabled = false }) {
  const { t } = useTranslation();
  const selected = new Set(value);

  function toggle(categoryId) {
    onChange(
      selected.has(categoryId) ? value.filter((item) => item !== categoryId) : [...value, categoryId],
    );
  }

  if (categories.length === 0) {
    return <p className="field-hint">{t('cards.categoryPicker.none')}</p>;
  }

  return (
    <div className="field">
      <div
        id={id}
        className="category-picker"
        role="group"
        tabIndex={-1}
        aria-describedby={`${id}-help`}
        aria-invalid={error ? 'true' : undefined}
      >
        {categories.map((category) => {
          const isSelected = selected.has(category.id);

          return (
            <label key={category.id} className={`category-picker__option${isSelected ? ' is-selected' : ''}`}>
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
                onChange={() => toggle(category.id)}
              />
              <span className="category-picker__name">{category.name}</span>
              <span className="category-picker__check" aria-hidden="true">
                {isSelected ? <Check /> : null}
              </span>
            </label>
          );
        })}
      </div>
      <p id={`${id}-help`} className={error ? 'field-error' : 'field-hint'}>
        {error || hint || t('cards.categoryPicker.hint', { count: value.length })}
      </p>
    </div>
  );
}

export default CategoryPicker;
