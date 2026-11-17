const TONES = {
  danger: 'bi-exclamation-octagon-fill',
  success: 'bi-check-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
};

export default function InlineAlert({
  tone = 'danger',
  children,
  onClose,
  className = '',
}) {
  if (!children) {
    return null;
  }

  return (
    <div className={`ss-alert ss-alert-${tone} ${className}`} role="alert">
      <i className={`bi ${TONES[tone] ?? TONES.info}`} aria-hidden="true" />
      <div className="ss-alert-body">{children}</div>
      {onClose ? (
        <button
          type="button"
          className="btn-icon btn-icon-sm"
          onClick={onClose}
          aria-label="Dismiss"
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
