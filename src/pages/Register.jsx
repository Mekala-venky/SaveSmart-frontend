import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import InlineAlert from '../components/InlineAlert.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { extractErrorMessage } from '../services/api.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const update = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const validate = () => {
    const errors = {};

    if (!form.fullName.trim()) {
      errors.fullName = 'Enter your full name.';
    }

    if (!form.email.trim()) {
      errors.email = 'Enter your email address.';
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }

    if (form.phoneNumber && !/^[0-9+\-\s]{6,15}$/.test(form.phoneNumber)) {
      errors.phoneNumber = 'Use 6–15 digits; spaces, + and - are allowed.';
    }

    if (form.password.length < 8) {
      errors.password = 'Use at least 8 characters.';
    } else if (form.password.length > 72) {
      errors.password = 'Use at most 72 characters.';
    }

    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
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

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    };

    if (form.phoneNumber.trim()) {
      payload.phoneNumber = form.phoneNumber.trim();
    }

    try {
      await register(payload);
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(
        extractErrorMessage(requestError, 'We could not create your account.'),
      );
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
            <i className="bi bi-flag-fill" aria-hidden="true" /> Start in two
            minutes
          </span>
          <h1>Build better saving habits.</h1>
          <p>
            Add your salary, log your expenses and watch your monthly savings
            rate improve — all with simulated balances.
          </p>

          <div className="auth-steps">
            <div>
              <span>1</span>
              <p>
                <strong>Create your account</strong>
                Your data stays in your own database.
              </p>
            </div>
            <div>
              <span>2</span>
              <p>
                <strong>Add salary &amp; expenses</strong>
                Get a clear monthly picture.
              </p>
            </div>
            <div>
              <span>3</span>
              <p>
                <strong>Set savings goals</strong>
                Track progress towards what matters.
              </p>
            </div>
          </div>
        </div>

        <div className="auth-panel-foot">
          <i className="bi bi-shield-lock-fill" aria-hidden="true" />
          Simulated savings only — no bank connection, no real transfers.
        </div>
      </aside>

      <section className="auth-form-side">
        <div className="auth-card auth-card-wide">
          <span className="auth-kicker">Get started</span>
          <h2>Create your SaveSmart account</h2>
          <p className="auth-sub">
            It takes less than a minute. No card details required.
          </p>

          <InlineAlert tone="danger" onClose={() => setError('')}>
            {error}
          </InlineAlert>

          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label" htmlFor="register-name">
                  Full name
                </label>
                <div className="input-icon-wrap">
                  <i className="bi bi-person" aria-hidden="true" />
                  <input
                    id="register-name"
                    type="text"
                    autoComplete="name"
                    className={`form-control${
                      fieldErrors.fullName ? ' is-invalid' : ''
                    }`}
                    placeholder="Asha Rao"
                    value={form.fullName}
                    onChange={update('fullName')}
                  />
                </div>
                {fieldErrors.fullName ? (
                  <div className="ss-field-error">{fieldErrors.fullName}</div>
                ) : null}
              </div>

              <div className="col-12 col-md-7">
                <label className="form-label" htmlFor="register-email">
                  Email address
                </label>
                <div className="input-icon-wrap">
                  <i className="bi bi-envelope" aria-hidden="true" />
                  <input
                    id="register-email"
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

              <div className="col-12 col-md-5">
                <label className="form-label" htmlFor="register-phone">
                  Phone <span className="label-optional">optional</span>
                </label>
                <div className="input-icon-wrap">
                  <i className="bi bi-telephone" aria-hidden="true" />
                  <input
                    id="register-phone"
                    type="tel"
                    autoComplete="tel"
                    className={`form-control${
                      fieldErrors.phoneNumber ? ' is-invalid' : ''
                    }`}
                    placeholder="98765 43210"
                    value={form.phoneNumber}
                    onChange={update('phoneNumber')}
                  />
                </div>
                {fieldErrors.phoneNumber ? (
                  <div className="ss-field-error">{fieldErrors.phoneNumber}</div>
                ) : null}
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="register-password">
                  Password
                </label>
                <div className="input-icon-wrap has-action">
                  <i className="bi bi-lock" aria-hidden="true" />
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`form-control${
                      fieldErrors.password ? ' is-invalid' : ''
                    }`}
                    placeholder="At least 8 characters"
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

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="register-confirm">
                  Confirm password
                </label>
                <div className="input-icon-wrap">
                  <i className="bi bi-lock-fill" aria-hidden="true" />
                  <input
                    id="register-confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`form-control${
                      fieldErrors.confirmPassword ? ' is-invalid' : ''
                    }`}
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={update('confirmPassword')}
                  />
                </div>
                {fieldErrors.confirmPassword ? (
                  <div className="ss-field-error">
                    {fieldErrors.confirmPassword}
                  </div>
                ) : null}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-100 mt-4"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Creating account…
                </>
              ) : (
                <>
                  Create account{' '}
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>

          <div className="auth-note">
            <i className="bi bi-shield-check" aria-hidden="true" />
            Passwords are hashed with BCrypt before they are stored.
          </div>
        </div>
      </section>
    </div>
  );
}
