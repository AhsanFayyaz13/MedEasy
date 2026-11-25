import BsModal from 'react-bootstrap/Modal';
import { FiX } from 'react-icons/fi';
import { cx } from '../../lib/cx';

/**
 * Modal built on react-bootstrap (focus trap, Esc to close, scroll lock,
 * aria-modal handled for us) with MedEasy styling.
 */
export default function Modal({
  show,
  onClose,
  title,
  description,
  footer,
  size, // 'sm' | 'lg' | 'xl'
  centered = true,
  className,
  children,
  ...rest
}) {
  return (
    <BsModal
      show={show}
      onHide={onClose}
      size={size}
      centered={centered}
      dialogClassName={cx('ui-modal', className)}
      aria-labelledby={title ? 'ui-modal-title' : undefined}
      {...rest}
    >
      {(title || onClose) && (
        <div className="ui-modal__header">
          <div>
            {title && (
              <h2 id="ui-modal-title" className="ui-modal__title">
                {title}
              </h2>
            )}
            {description && <p className="ui-modal__description">{description}</p>}
          </div>
          {onClose && (
            <button type="button" className="ui-icon-btn" onClick={onClose} aria-label="Close dialog">
              <FiX aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      <div className="ui-modal__body">{children}</div>
      {footer && <div className="ui-modal__footer">{footer}</div>}
    </BsModal>
  );
}
