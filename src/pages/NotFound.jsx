import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <span className="notfound-code">404</span>
        <h1>This page took a wrong turn.</h1>
        <p>
          The page you are looking for does not exist. Head back to your
          dashboard to keep tracking your savings.
        </p>
        <Link to="/" className="btn btn-primary">
          <i className="bi bi-arrow-left" aria-hidden="true" /> Back to
          dashboard
        </Link>
      </div>
    </div>
  );
}
