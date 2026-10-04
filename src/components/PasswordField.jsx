import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';

function PasswordField({ id, label, error, ...inputProps }) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`field-control field-control--password${error ? ' field-control--error' : ''}`}>
        <input
          id={id}
          className="field-input"
          type={isVisible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        <button
          type="button"
          className="field-eye"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={t(isVisible ? 'auth.fields.hide' : 'auth.fields.show', { field: label.toLowerCase() })}
        >
          {isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default PasswordField;
