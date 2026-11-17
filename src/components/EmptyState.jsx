export default function EmptyState({
  icon = 'bi-inbox',
  title,
  description,
  action,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <i className={`bi ${icon}`} aria-hidden="true" />
      </div>
      <h6>{title}</h6>
      {description ? <p>{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
