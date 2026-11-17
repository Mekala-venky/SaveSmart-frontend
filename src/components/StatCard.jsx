export default function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'teal',
  footer,
}) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <div className="stat-card-top">
        <div className="stat-card-icon">
          <i className={`bi ${icon}`} aria-hidden="true" />
        </div>
        {hint ? <span className="stat-card-hint">{hint}</span> : null}
      </div>
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
      {footer ? <div className="stat-card-footer">{footer}</div> : null}
    </div>
  );
}
