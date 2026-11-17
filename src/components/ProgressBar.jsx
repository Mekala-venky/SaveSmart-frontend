export default function ProgressBar({
  value = 0,
  tone = 'teal',
  showLabel = false,
  height,
}) {
  const percentage = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className="ss-progress">
      <div
        className={`ss-progress-track${height ? ` ss-progress-${height}` : ''}`}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`ss-progress-fill ss-progress-${tone}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel ? (
        <span className="ss-progress-label">{percentage.toFixed(0)}%</span>
      ) : null}
    </div>
  );
}
