import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import InlineAlert from '../components/InlineAlert.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PageLoader from '../components/PageLoader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { extractErrorMessage, userApi } from '../services/api.js';
import {
  formatDate,
  formatDateTime,
  initials,
} from '../utils/format.js';

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', phoneNumber: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await userApi.getProfile();
      setProfile(data);
      setForm({
        fullName: data.fullName ?? '',
        phoneNumber: data.phoneNumber ?? '',
      });
    } catch (requestError) {
      setError(
        extractErrorMessage(requestError, 'We could not load your profile.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    setSuccess('');
  };

  const validate = () => {
    const errors = {};

    if (!form.fullName.trim()) {
      errors.fullName = 'Enter your full name.';
    }

    if (
      form.phoneNumber &&
      !/^[0-9+\-\s]{6,15}$/.test(form.phoneNumber.trim())
    ) {
      errors.phoneNumber = 'Use 6–15 digits; spaces, + and - are allowed.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const payload = { fullName: form.fullName.trim() };

    if (form.phoneNumber.trim()) {
      payload.phoneNumber = form.phoneNumber.trim();
    }

    try {
      const updated = await userApi.updateProfile(payload);
      setProfile(updated);
      setForm({
        fullName: updated.fullName ?? '',
        phoneNumber: updated.phoneNumber ?? '',
      });
      updateUser({ fullName: updated.fullName });
      setSuccess('Profile updated.');
    } catch (requestError) {
      setError(
        extractErrorMessage(requestError, 'We could not update your profile.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Manage the details attached to your SaveSmart account."
      />

      <InlineAlert tone="danger" onClose={() => setError('')}>
        {error}
      </InlineAlert>
      <InlineAlert tone="success" onClose={() => setSuccess('')}>
        {success}
      </InlineAlert>

      {loading ? (
        <PageLoader label="Loading your profile…" />
      ) : (
        <div className="row g-3 g-xl-4">
          <div className="col-12 col-lg-7">
            <section className="ss-card">
              <div className="ss-card-head">
                <div>
                  <h2>Personal details</h2>
                  <p>Your email address cannot be changed.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label className="form-label" htmlFor="profile-name">
                    Full name
                  </label>
                  <div className="input-icon-wrap">
                    <i className="bi bi-person" aria-hidden="true" />
                    <input
                      id="profile-name"
                      type="text"
                      maxLength={100}
                      className={`form-control${
                        fieldErrors.fullName ? ' is-invalid' : ''
                      }`}
                      value={form.fullName}
                      onChange={update('fullName')}
                    />
                  </div>
                  {fieldErrors.fullName ? (
                    <div className="ss-field-error">{fieldErrors.fullName}</div>
                  ) : null}
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="profile-email">
                    Email address
                  </label>
                  <div className="input-icon-wrap is-readonly">
                    <i className="bi bi-envelope" aria-hidden="true" />
                    <input
                      id="profile-email"
                      type="email"
                      className="form-control"
                      value={profile?.email ?? user?.email ?? ''}
                      readOnly
                    />
                    <span className="input-action-static">
                      <i className="bi bi-lock-fill" aria-hidden="true" />
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label" htmlFor="profile-phone">
                    Phone number{' '}
                    <span className="label-optional">optional</span>
                  </label>
                  <div className="input-icon-wrap">
                    <i className="bi bi-telephone" aria-hidden="true" />
                    <input
                      id="profile-phone"
                      type="tel"
                      maxLength={15}
                      className={`form-control${
                        fieldErrors.phoneNumber ? ' is-invalid' : ''
                      }`}
                      placeholder="98765 43210"
                      value={form.phoneNumber}
                      onChange={update('phoneNumber')}
                    />
                  </div>
                  {fieldErrors.phoneNumber ? (
                    <div className="ss-field-error">
                      {fieldErrors.phoneNumber}
                    </div>
                  ) : null}
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2" aria-hidden="true" /> Save
                        changes
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => {
                      setForm({
                        fullName: profile?.fullName ?? '',
                        phoneNumber: profile?.phoneNumber ?? '',
                      });
                      setFieldErrors({});
                      setSuccess('');
                    }}
                    disabled={saving}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </section>
          </div>

          <div className="col-12 col-lg-5 d-flex flex-column gap-3 gap-xl-4">
            <section className="ss-card profile-card">
              <div className="profile-avatar" aria-hidden="true">
                {initials(profile?.fullName ?? user?.fullName)}
              </div>
              <h3>{profile?.fullName ?? user?.fullName ?? 'SaveSmart user'}</h3>
              <p>{profile?.email ?? user?.email}</p>

              <dl className="profile-facts">
                <div>
                  <dt>Member since</dt>
                  <dd>{formatDate(profile?.createdAt)}</dd>
                </div>
                <div>
                  <dt>Phone number</dt>
                  <dd>{profile?.phoneNumber || '—'}</dd>
                </div>
                <div>
                  <dt>Account ID</dt>
                  <dd>#{profile?.id ?? user?.userId ?? '—'}</dd>
                </div>
              </dl>

              <button
                type="button"
                className="btn btn-outline-danger w-100"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right" aria-hidden="true" /> Sign
                out
              </button>
            </section>

            <section className="ss-card">
              <div className="ss-card-head">
                <div>
                  <h2>About SaveSmart</h2>
                  <p>Personal finance &amp; simulated savings tracker</p>
                </div>
              </div>
              <ul className="check-list">
                <li>
                  <i className="bi bi-shield-lock-fill" aria-hidden="true" />
                  Simulated savings only — no real money moves.
                </li>
                <li>
                  <i className="bi bi-database-lock" aria-hidden="true" />
                  Data is stored in your own MySQL database.
                </li>
                <li>
                  <i className="bi bi-code-slash" aria-hidden="true" />
                  React, Spring Boot and MySQL.
                </li>
              </ul>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
