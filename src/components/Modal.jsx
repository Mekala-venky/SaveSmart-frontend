import { useEffect } from 'react';

export default function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = '',
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('ss-modal-open');

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('ss-modal-open');
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="ss-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className={`ss-modal${size ? ` ss-modal-${size}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="ss-modal-header">
          <div>
            <h5>{title}</h5>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="ss-modal-body">{children}</div>

        {footer ? <div className="ss-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
