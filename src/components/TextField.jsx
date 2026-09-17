function describedBy(id, error, hint) {
  return [error ? `${id}-error` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;
}

function FieldMessages({ id, error, hint }) {
  return (
    <>
      {hint && !error ? (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </>
  );
}

function controlClass(error, extra = '') {
  return ['field-control', extra, error ? 'field-control--error' : ''].filter(Boolean).join(' ');
}

function TextField({ id, label, error, hint, prefix, className = '', ...inputProps }) {
  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <div className={controlClass(error, prefix ? 'field-control--prefixed' : '')}>
        {prefix ? (
          <span className="field-prefix" aria-hidden="true">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          className="field-input"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint && !error)}
          {...inputProps}
        />
      </div>
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  );
}

export function TextArea({ id, label, error, hint, className = '', ...inputProps }) {
  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <div className={controlClass(error)}>
        <textarea
          id={id}
          className="field-input field-input--area"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint && !error)}
          {...inputProps}
        />
      </div>
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  );
}

export function Select({ id, label, error, hint, options, placeholder, className = '', ...selectProps }) {
  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <div className={controlClass(error, 'field-control--select')}>
        <select
          id={id}
          className="field-input"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint && !error)}
          {...selectProps}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  );
}

export default TextField;
