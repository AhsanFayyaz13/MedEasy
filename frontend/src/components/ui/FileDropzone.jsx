import { useId, useRef, useState } from 'react';
import { FiFile, FiFileText, FiImage, FiUploadCloud, FiX } from 'react-icons/fi';
import { cx } from '../../lib/cx';

const fmtSize = (b) => (b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`);

/**
 * Drag-and-drop / click-to-browse file picker with preview row.
 * Keyboard accessible (it's a real <label> + <input type=file>).
 */
export default function FileDropzone({
  file,
  onFile,
  accept = '.jpg,.jpeg,.png,.webp,.pdf',
  hint = 'JPG, PNG, WebP or PDF · max 5 MB',
  label = 'Drag & drop your file here',
  error,
  disabled = false,
  className,
}) {
  const id = useId();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pick = (f) => {
    if (!disabled) onFile(f || null);
  };

  if (file) {
    const Icon = file.type === 'application/pdf' ? FiFileText : file.type?.startsWith('image/') ? FiImage : FiFile;
    return (
      <div className={cx('ui-dropzone-file', className)}>
        <Icon className="ui-dropzone-file__icon" aria-hidden="true" />
        <div className="ui-dropzone-file__info">
          <span className="ui-dropzone-file__name">{file.name}</span>
          <span className="ui-dropzone-file__size">{fmtSize(file.size)}</span>
        </div>
        <button type="button" className="ui-icon-btn ui-icon-btn--sm" onClick={() => pick(null)} aria-label={`Remove ${file.name}`} disabled={disabled}>
          <FiX aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cx('ui-dropzone', dragging && 'is-dragging', error && 'has-error', disabled && 'is-disabled')}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
      >
        <FiUploadCloud className="ui-dropzone__icon" aria-hidden="true" />
        <span className="ui-dropzone__title">{label}</span>
        <span className="ui-dropzone__sub">
          or <span className="ui-dropzone__link">browse files</span>
        </span>
        <span className="ui-dropzone__hint">{hint}</span>
      </label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && <p className="ui-field__error" role="alert">{error}</p>}
    </div>
  );
}
