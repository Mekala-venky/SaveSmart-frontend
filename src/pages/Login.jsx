import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import InlineAlert from '../components/InlineAlert.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { extractErrorMessage } from '../services/api.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const update = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const validate = () => {
    const errors = {};

    if (!form.email.trim()) {
      errors.email = 'Enter the email you registered with.';
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }

    if (!form.password) {
      errors.password = 'Enter your password.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      navigate(from, { replace: true });
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Sign in failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <aside className="auth-panel">
        <div className="auth-panel-brand">
          <span className="ss-brand-mark">
            <i className="bi bi-safe2-fill" aria-hidden="true" />
          </span>
          <span>
            <strong>SaveSmart</strong>
            <small>Personal finance</small>
          </span>
        </div>

        <div className="auth-panel-copy">
          <span className="auth-pill">
            <i className="bi bi-stars" aria-hidden="true" /> Salary to savings,
            clearly
          </span>
          <h1>Know where every rupee goes.</h1>
          <p>
            Track your salary and expenses, build simulated savings, set goals
            and get a monthly financial health check.
          </p>

          <ul className="auth-feature-list">
            <li>
              <i className="bi bi-check-circle-fill" aria-hidden="true" />
              Salary, expense and savings dashboards
            </li>
            <li>
              <i className="bi bi-check-circle-fill" aria-hidden="true" />
              Goal progress with over-contribution protection
            </li>
            <li>
              <i className="bi bi-check-circle-fill" aria-hidden="true" />
              Personalised insights and a health score
            </li>
          </ul>
        </div>

        <div className="auth-panel-foot">
          <i className="bi bi-shield-lock-fill" aria-hidden="true" />
          Simulated savings only — no bank connection, no real transfers.
        </div>
      </aside>

      <section className="auth-form-side">
        <div className="auth-card">
          <span className="auth-kicker">Welcome back</span>
          <h2>Sign in to SaveSmart</h2>
          <p className="auth-sub">
            Use the email and password you registered with.
          </p>

          <InlineAlert tone="danger" onClose={() => setError('')}>
            {error}
          </InlineAlert>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label" htmlFor="login-email">
                Email address
              </label>
              <div className="input-icon-wrap">
                <i className="bi bi-envelope" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  className={`form-control${
                    fieldErrors.email ? ' is-invalid' : ''
                  }`}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={update('email')}
                />
              </div>
              {fieldErrors.email ? (
                <div className="ss-field-error">{fieldErrors.email}</div>
              ) : null}
            </div>

            <div className="mb-4">
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <div className="input-icon-wrap has-action">
                <i className="bi bi-lock" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`form-control${
                    fieldErrors.password ? ' is-invalid' : ''
                  }`}
                  placeholder="Your password"
                  value={form.password}
                  onChange={update('password')}
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i
                    className={`bi ${
                      showPassword ? 'bi-eye-slash' : 'bi-eye'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </div>
              {fieldErrors.password ? (
                <div className="ss-field-error">{fieldErrors.password}</div>
              ) : null}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-100"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in <i className="bi bi-arrow-right" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            New to SaveSmart? <Link to="/register">Create an account</Link>
          </p>

          <div className="auth-note">
            <i className="bi bi-info-circle" aria-hidden="true" />
            Accounts are stored in your own SaveSmart database.
          </div>
        </div>
      </section>
    </div>
  );
}
