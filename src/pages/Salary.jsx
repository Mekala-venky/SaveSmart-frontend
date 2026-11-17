import { useCallback, useEffect, useState } from 'react';

import InlineAlert from '../components/InlineAlert.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PageLoader from '../components/PageLoader.jsx';
import { extractErrorMessage, salaryApi } from '../services/api.js';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  todayISO,
} from '../utils/format.js';

const emptyForm = {
  monthlySalary: '',
  salarySource: '',
  salaryReceivedDate: todayISO(),
};

export default function Salary() {
  const [salary, setSalary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await salaryApi.get();
      setSalary(data);
      setForm({
        monthlySalary: String(data.monthlySalary ?? ''),
        salarySource: data.salarySource ?? '',
        salaryReceivedDate: data.salaryReceivedDate ?? todayISO(),
      });
    } catch (requestError) {
      if (requestError?.response?.status === 404) {
        setSalary(null);
        setForm(emptyForm);
      } else {
        setError(
          extractErrorMessage(requestError, 'We could not load your salary.'),
        );
      }
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
    const amount = Number(form.monthlySalary);

    if (!form.monthlySalary) {
      errors.monthlySalary = 'Enter your monthly salary.';
    } else if (!Number.isFinite(amount) || amount <= 0) {
      errors.monthlySalary = 'Salary must be greater than zero.';
    } else if (amount > 9999999999.99) {
      errors.monthlySalary = 'That amount is too large.';
    }

    if (!form.salarySource.trim()) {
      errors.salarySource = 'Tell us where the salary comes from.';
    }

    if (!form.salaryReceivedDate) {
      errors.salaryReceivedDate = 'Choose the date you received it.';
    } else if (form.salaryReceivedDate > todayISO()) {
      errors.salaryReceivedDate = 'The date cannot be in the future.';
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

    const payload = {
      monthlySalary: Number(form.monthlySalary),
      salarySource: form.salarySource.trim(),
      salaryReceivedDate: form.salaryReceivedDate,
    };

    try {
      const saved = salary
        ? await salaryApi.update(payload)
        : await salaryApi.create(payload);

      setSalary(saved);
      setForm({
        monthlySalary: String(saved.monthlySalary ?? ''),
        salarySource: saved.salarySource ?? '',
        salaryReceivedDate: saved.salaryReceivedDate ?? todayISO(),
      });
      setSuccess(
        salary
          ? 'Salary updated. Your dashboard will reflect the new amount.'
          : 'Salary saved. Your dashboard is now ready to use.',
      );
    } catch (requestError) {
      setError(
        extractErrorMessage(requestError, 'We could not save your salary.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    if (salary) {
      setForm({
        monthlySalary: String(salary.monthlySalary ?? ''),
        salarySource: salary.salarySource ?? '',
        salaryReceivedDate: salary.salaryReceivedDate ?? todayISO(),
      });
    } else {
      setForm(emptyForm);
    }

    setFieldErrors({});
    setError('');
    setSuccess('');
  };

  return (
    <>
      <PageHeader
        eyebrow="Income"
        title="Salary"
        description="SaveSmart keeps one current salary. Update it whenever your income changes."
      />

      <InlineAlert tone="danger" onClose={() => setError('')}>
        {error}
      </InlineAlert>
      <InlineAlert tone="success" onClose={() => setSuccess('')}>
        {success}
      </InlineAlert>

      {loading ? (
        <PageLoader label="Loading salary details…" />
      ) : (
        <div className="row g-3 g-xl-4">
          <div className="col-12 col-lg-7">
            <section className="ss-card">
              <div className="ss-card-head">
                <div>
                  <h2>{salary ? 'Update salary' : 'Add your salary'}</h2>
                  <p>
                    Used to calculate your available amount, savings rate and
                    insights.
                  </p>
                </div>
                <span className={`badge-soft badge-${salary ? 'success' : 'warning'}`}>
                  {salary ? 'Configured' : 'Not set'}
                </span>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label className="form-label" htmlFor="salary-amount">
                    Monthly salary (₹)
                  </label>
                  <div className="input-icon-wrap">
                    <i className="bi bi-currency-rupee" aria-hidden="true" />
                    <input
                      id="salary-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      className={`form-control${
                        fieldErrors.monthlySalary ? ' is-invalid' : ''
                      }`}
                      placeholder="50000"
                      value={form.monthlySalary}
                      onChange={update('monthlySalary')}
                    />
                  </div>
                  {fieldErrors.monthlySalary ? (
                    <div className="ss-field-error">
                      {fieldErrors.monthlySalary}
                    </div>
                  ) : null}
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="salary-source">
                    Salary source
                  </label>
                  <div className="input-icon-wrap">
                    <i className="bi bi-building" aria-hidden="true" />
                    <input
                      id="salary-source"
                      type="text"
                      maxLength={100}
                      className={`form-control${
                        fieldErrors.salarySource ? ' is-invalid' : ''
                      }`}
                      placeholder="e.g. Acme Technologies"
                      value={form.salarySource}
                      onChange={update('salarySource')}
                    />
                  </div>
                  {fieldErrors.salarySource ? (
                    <div className="ss-field-error">
                      {fieldErrors.salarySource}
                    </div>
                  ) : null}
                </div>

                <div className="mb-4">
                  <label className="form-label" htmlFor="salary-date">
                    Salary received on
                  </label>
                  <div className="input-icon-wrap">
                    <i className="bi bi-calendar-check" aria-hidden="true" />
                    <input
                      id="salary-date"
                      type="date"
                      max={todayISO()}
                      className={`form-control${
                        fieldErrors.salaryReceivedDate ? ' is-invalid' : ''
                      }`}
                      value={form.salaryReceivedDate}
                      onChange={update('salaryReceivedDate')}
                    />
                  </div>
                  {fieldErrors.salaryReceivedDate ? (
                    <div className="ss-field-error">
                      {fieldErrors.salaryReceivedDate}
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
                        <i className="bi bi-check2" aria-hidden="true" />{' '}
                        {salary ? 'Update salary' : 'Save salary'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </section>
          </div>

          <div className="col-12 col-lg-5">
            {salary ? (
              <section className="salary-highlight h-100">
                <span className="salary-highlight-label">Current monthly salary</span>
                <strong className="salary-highlight-value">
                  {formatCurrency(salary.monthlySalary)}
                </strong>
                <div className="salary-highlight-meta">
                  <div>
                    <span>Source</span>
                    <strong>{salary.salarySource}</strong>
                  </div>
                  <div>
                    <span>Received on</span>
                    <strong>{formatDate(salary.salaryReceivedDate)}</strong>
                  </div>
                  <div>
                    <span>Last saved</span>
                    <strong>{formatDateTime(salary.createdAt)}</strong>
                  </div>
                </div>
                <p className="salary-highlight-note">
                  <i className="bi bi-info-circle" aria-hidden="true" /> Yearly
                  analysis annualises this amount × 12. SaveSmart stores only
                  your current salary.
                </p>
              </section>
            ) : (
              <section className="ss-card h-100">
                <div className="ss-card-head">
                  <div>
                    <h2>Why add salary?</h2>
                    <p>Three things unlock once your salary is saved.</p>
                  </div>
                </div>
                <ul className="check-list">
                  <li>
                    <i className="bi bi-check-circle-fill" aria-hidden="true" />
                    Monthly available amount after expenses
                  </li>
                  <li>
                    <i className="bi bi-check-circle-fill" aria-hidden="true" />
                    Savings rate and monthly health score
                  </li>
                  <li>
                    <i className="bi bi-check-circle-fill" aria-hidden="true" />
                    Suggested monthly allocation from insights
                  </li>
                </ul>
                <div className="ss-footnote">
                  <i className="bi bi-shield-lock" aria-hidden="true" />
                  Salary is used only inside your own SaveSmart account.
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}
