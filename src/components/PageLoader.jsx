export default function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span className="spinner-border text-teal" />
      <span>{label}</span>
    </div>
  );
}
