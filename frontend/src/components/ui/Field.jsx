import { forwardRef, useId } from 'react';
import { cx } from '../../lib/cx';

/**
 * Shared label / hint / error wrapper. Wires up aria-describedby and
 * aria-invalid so every form control is accessible by default.
 */
function FieldShell({ id, label, hint, error, required, className, children }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('ui-field', error && 'has-error', className)}>
      {label && (
        <label htmlFor={id} className="ui-field__label">
          {label}
          {required && <span className="ui-field__required" aria-hidden="true"> *</span>}
        </label>
      )}
      {children({ describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="ui-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="ui-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { id, label, hint, error, required, leftIcon, rightSlot, className, inputClassName, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={className}>
      {({ describedBy, invalid }) => (
        <div className={cx('ui-input', leftIcon && 'has-left-icon', rightSlot && 'has-right-slot')}>
          {leftIcon && <span className="ui-input__icon" aria-hidden="true">{leftIcon}</span>}
          <input
            ref={ref}
            id={fieldId}
            className={cx('ui-control', inputClassName)}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            required={required}
            {...rest}
          />
          {rightSlot && <span className="ui-input__right">{rightSlot}</span>}
        </div>
      )}
    </FieldShell>
  );
});

export const Textarea = forwardRef(function Textarea(
  { id, label, hint, error, required, className, rows = 4, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={className}>
      {({ describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          className="ui-control ui-control--textarea"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        />
      )}
    </FieldShell>
  );
});

/**
 * Select. Pass `options` as [{ value, label }] or plain strings, or children.
 */
export const Select = forwardRef(function Select(
  { id, label, hint, error, required, className, options, placeholder, children, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={className}>
      {({ describedBy, invalid }) => (
        <select
          ref={ref}
          id={fieldId}
          className="ui-control ui-control--select"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options
            ? options.map((o) => {
                const opt = typeof o === 'string' ? { value: o, label: o } : o;
                return (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                );
              })
            : children}
        </select>
      )}
    </FieldShell>
  );
});

export const Checkbox = forwardRef(function Checkbox({ id, label, hint, error, className, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id || autoId;
  const errorId = error ? `${fieldId}-error` : undefined;
  return (
    <div className={cx('ui-check', error && 'has-error', className)}>
      <input
        ref={ref}
        id={fieldId}
        type="checkbox"
        className="ui-check__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        {...rest}
      />
      <div>
        <label htmlFor={fieldId} className="ui-check__label">
          {label}
          {hint && <span className="ui-field__hint d-block">{hint}</span>}
        </label>
        {error && (
          <p id={errorId} className="ui-field__error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
});
