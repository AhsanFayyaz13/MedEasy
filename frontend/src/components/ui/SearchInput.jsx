import { useId } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { cx } from '../../lib/cx';

/** Search field with icon, accessible label and clear button. */
export default function SearchInput({ value, onChange, label = 'Search', placeholder = 'Search…', className, ...rest }) {
  const id = useId();
  return (
    <div className={cx('ui-search', className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <FiSearch className="ui-search__icon" aria-hidden="true" />
      <input
        id={id}
        type="search"
        className="ui-control"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        {...rest}
      />
      {value && (
        <button type="button" className="ui-icon-btn ui-icon-btn--sm ui-search__clear" onClick={() => onChange('')} aria-label="Clear search">
          <FiX aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
