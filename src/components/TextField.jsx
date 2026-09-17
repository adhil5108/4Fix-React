function TextField({ id, label, error, prefix, className = '', ...inputProps }) {
  const errorId = `${id}-error`;

  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <div
        className={[
          'field-control',
          prefix ? 'field-control--prefixed' : '',
          error ? 'field-control--error' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {prefix ? (
          <span className="field-prefix" aria-hidden="true">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          className="field-input"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
      </div>
      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default TextField;
