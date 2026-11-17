import { useCallback, useEffect, useMemo, useState } from 'react';

import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PageLoader from '../components/PageLoader.jsx';
import StatCard from '../components/StatCard.jsx';
import { expenseApi, extractErrorMessage } from '../services/api.js';
import {
  CATEGORY_OPTIONS,
  MONTH_OPTIONS,
  categoryColor,
  formatCurrency,
  formatDate,
  monthName,
  todayISO,
} from '../utils/format.js';

const emptyForm = {
  amount: '',
  category: 'Groceries',
  description: '',
  expenseDate: todayISO(),
};

export default function Expenses() {
  const now = new Date();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filters, setFilters] = useState({
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    category: 'all',
    search: '',
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await expenseApi.list();
      setExpenses(data);
    } catch (requestError) {
      setError(
        extractErrorMessage(requestError, 'We could not load your expenses.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const years = useMemo(() => {
    const set = new Set(
      expenses
        .map((expense) => Number(String(expense.expenseDate).slice(0, 4)))
        .filter((value) => Number.isFinite(value)),
    );

    set.add(now.getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [expenses, now]);

  const categories = useMemo(() => {
    const set = new Set(CATEGORY_OPTIONS);
    expenses.forEach((expense) => set.add(expense.category));
    return [...set];
  }, [expenses]);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return expenses
      .filter((expense) => {
        const [year, month] = String(expense.expenseDate)
          .slice(0, 10)
          .split('-');

        if (filters.year !== 'all' && year !== filters.year) {
          return false;
        }

        if (filters.month !== 'all' && Number(month) !== Number(filters.month)) {
          return false;
        }

        if (
          filters.category !== 'all' &&
          expense.category !== filters.category
        ) {
          return false;
        }

        if (search) {
          const haystack =
            `${expense.category} ${expense.description ?? ''}`.toLowerCase();
          return haystack.includes(search);
        }

        return true;
      })
      .sort((a, b) => {
        const byDate = String(b.expenseDate).localeCompare(
          String(a.expenseDate),
        );
        return byDate !== 0
          ? byDate
          : String(b.createdAt).localeCompare(String(a.createdAt));
      });
  }, [expenses, filters]);

  const total = useMemo(
    () => filtered.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [filtered],
  );

  const categoryBreakdown = useMemo(() => {
    const map = new Map();

    filtered.forEach((expense) => {
      map.set(
        expense.category,
        (map.get(expense.category) ?? 0) + Number(expense.amount),
      );
    });

    return [...map.entries()]
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered, total]);

  const topCategory = categoryBreakdown[0];
  const periodLabel =
    filters.month === 'all'
      ? filters.year === 'all'
        ? 'All time'
        : filters.year
      : `${monthName(Number(filters.month))} ${filters.year}`;

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      expenseDate: todayISO(),
    });
    setFieldErrors({});
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (expense) => {
    setEditing(expense);
    setForm({
      amount: String(expense.amount ?? ''),
      category: expense.category ?? 'Other',
      description: expense.description ?? '',
      expenseDate: expense.expenseDate ?? todayISO(),
    });
    setFieldErrors({});
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditing(null);
  };

  const update = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const validate = () => {
    const errors = {};
    const amount = Number(form.amount);

    if (!form.amount) {
      errors.amount = 'Enter the amount.';
    } else if (!Number.isFinite(amount) || amount <= 0) {
      errors.amount = 'Amount must be greater than zero.';
    } else if (amount > 9999999999.99) {
      errors.amount = 'That amount is too large.';
    }

    if (!form.category.trim()) {
      errors.category = 'Choose or type a category.';
    }

    if (!form.expenseDate) {
      errors.expenseDate = 'Choose the expense date.';
    } else if (form.expenseDate > todayISO()) {
      errors.expenseDate = 'The date cannot be in the future.';
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
    setFormError('');

    const payload = {
      amount: Number(form.amount),
      category: form.category.trim(),
      expenseDate: form.expenseDate,
    };

    if (form.description.trim()) {
      payload.description = form.description.trim();
    }

    try {
      if (editing) {
        const updated = await expenseApi.update(editing.id, payload);
        setExpenses((previous) =>
          previous.map((expense) =>
            expense.id === updated.id ? updated : expense,
          ),
        );
        setSuccess('Expense updated.');
      } else {
        const created = await expenseApi.create(payload);
        setExpenses((previous) => [created, ...previous]);
        setSuccess('Expense added.');
      }

      setModalOpen(false);
      setEditing(null);

      // Jump to the period of the saved expense so it is visible immediately.
      const [year, month] = payload.expenseDate.split('-');
      setFilters((previous) => ({
        ...previous,
        year,
        month: String(Number(month)),
        category: 'all',
        search: '',
      }));
    } catch (requestError) {
      setFormError(
        extractErrorMessage(requestError, 'We could not save this expense.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await expenseApi.remove(pendingDelete.id);
      setExpenses((previous) =>
        previous.filter((expense) => expense.id !== pendingDelete.id),
      );
      setSuccess('Expense deleted.');
      setPendingDelete(null);
    } catch (requestError) {
      setError(
        extractErrorMessage(requestError, 'We could not delete that expense.'),
      );
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () =>
    setFilters({
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
      category: 'all',
      search: '',
    });

  return (
    <>
      <PageHeader
        eyebrow="Spending"
        title="Expenses"
        description="Log what you spend and see where your money goes."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> Add expense
          </button>
        }
      />

      <InlineAlert tone="danger" onClose={() => setError('')}>
        {error}
      </InlineAlert>
      <InlineAlert tone="success" onClose={() => setSuccess('')}>
        {success}
      </InlineAlert>

      <div className="filter-bar">
        <div className="filter-group">
          <label className="form-label" htmlFor="filter-month">
            Month
          </label>
          <select
            id="filter-month"
            className="form-select"
            value={filters.month}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                month: event.target.value,
              }))
            }
          >
            <option value="all">All months</option>
            {MONTH_OPTIONS.map((option) => (
              <option key={option.value} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="form-label" htmlFor="filter-year">
            Year
          </label>
          <select
            id="filter-year"
            className="form-select"
            value={filters.year}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                year: event.target.value,
              }))
            }
          >
            <option value="all">All years</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="form-label" htmlFor="filter-category">
            Category
          </label>
          <select
            id="filter-category"
            className="form-select"
            value={filters.category}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                category: event.target.value,
              }))
            }
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group filter-grow">
          <label className="form-label" htmlFor="filter-search">
            Search
          </label>
          <div className="input-icon-wrap">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              id="filter-search"
              type="search"
              className="form-control"
              placeholder="Description or category"
              value={filters.search}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  search: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <button
          type="button"
          className="btn btn-light filter-reset"
          onClick={resetFilters}
        >
          Reset
        </button>
      </div>

      {loading ? (
        <PageLoader label="Loading expenses…" />
      ) : expenses.length === 0 ? (
        <section className="ss-card">
          <EmptyState
            icon="bi-receipt"
            title="No expenses yet"
            description="Add your first expense to start seeing your spending breakdown."
            action={
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                Add your first expense
              </button>
            }
          />
        </section>
      ) : (
        <>
          <div className="row g-3 g-xl-4">
            <div className="col-12 col-sm-4">
              <StatCard
                icon="bi-calculator"
                label={`Spent · ${periodLabel}`}
                value={formatCurrency(total)}
                hint={`${filtered.length} transaction${
                  filtered.length === 1 ? '' : 's'
                }`}
                tone="rose"
              />
            </div>
            <div className="col-12 col-sm-4">
              <StatCard
                icon="bi-tags"
                label="Top category"
                value={topCategory ? topCategory.category : '—'}
                hint={
                  topCategory
                    ? `${formatCurrency(topCategory.amount)} · ${topCategory.percentage.toFixed(
                        0,
                      )}% of spend`
                    : 'Nothing in this period'
                }
                tone="amber"
              />
            </div>
            <div className="col-12 col-sm-4">
              <StatCard
                icon="bi-calendar3"
                label="Average expense"
                value={formatCurrency(
                  filtered.length > 0 ? total / filtered.length : 0,
                )}
                hint="Across the filtered expenses"
                tone="indigo"
              />
            </div>
          </div>

          <div className="row g-3 g-xl-4 mt-1">
            <div className="col-12 col-xl-8">
              <section className="ss-card h-100">
                <div className="ss-card-head">
                  <div>
                    <h2>Expense history</h2>
                    <p>
                      {filtered.length} record
                      {filtered.length === 1 ? '' : 's'} · {periodLabel}
                    </p>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <EmptyState
                    icon="bi-funnel"
                    title="No matching expenses"
                    description="Try a different month, year or category."
                    action={
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={resetFilters}
                      >
                        Clear filters
                      </button>
                    }
                  />
                ) : (
                  <ul className="expense-list">
                    {filtered.map((expense) => (
                      <li key={expense.id}>
                        <span
                          className="expense-icon"
                          style={{
                            background: `${categoryColor(expense.category)}1a`,
                            color: categoryColor(expense.category),
                          }}
                        >
                          <i className="bi bi-bag" aria-hidden="true" />
                        </span>

                        <div className="expense-main">
                          <strong>{expense.category}</strong>
                          <span>
                            {expense.description || 'No description'} ·{' '}
                            {formatDate(expense.expenseDate)}
                          </span>
                        </div>

                        <span className="expense-amount">
                          {formatCurrency(expense.amount)}
                        </span>

                        <div className="expense-actions">
                          <button
                            type="button"
                            className="btn-icon btn-icon-sm"
                            title="Edit expense"
                            aria-label={`Edit ${expense.category} expense`}
                            onClick={() => openEdit(expense)}
                          >
                            <i className="bi bi-pencil" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-icon-sm danger"
                            title="Delete expense"
                            aria-label={`Delete ${expense.category} expense`}
                            onClick={() => setPendingDelete(expense)}
                          >
                            <i className="bi bi-trash3" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="col-12 col-xl-4">
              <section className="ss-card h-100">
                <div className="ss-card-head">
                  <div>
                    <h2>Category split</h2>
                    <p>Share of the filtered spending</p>
                  </div>
                </div>

                {categoryBreakdown.length === 0 ? (
                  <EmptyState
                    icon="bi-pie-chart"
                    title="Nothing to show"
                    description="Adjust the filters to see a category split."
                  />
                ) : (
                  <ul className="category-bars">
                    {categoryBreakdown.map((entry) => (
                      <li key={entry.category}>
                        <div className="category-bar-head">
                          <span>
                            <span
                              className="legend-dot"
                              style={{
                                background: categoryColor(entry.category),
                              }}
                            />
                            {entry.category}
                          </span>
                          <strong>{formatCurrency(entry.amount)}</strong>
                        </div>
                        <div className="ss-progress-track">
                          <div
                            className="ss-progress-fill"
                            style={{
                              width: `${Math.max(entry.percentage, 1)}%`,
                              background: categoryColor(entry.category),
                            }}
                          />
                        </div>
                        <span className="category-bar-percent">
                          {entry.percentage.toFixed(0)}% of {periodLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit expense' : 'Add an expense'}
        subtitle="Expenses dated in the future are not allowed."
        onClose={closeModal}
        footer={
          <>
            <button
              type="button"
              className="btn btn-light"
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="expense-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Saving…
                </>
              ) : editing ? (
                'Save changes'
              ) : (
                'Add expense'
              )}
            </button>
          </>
        }
      >
        <InlineAlert tone="danger" onClose={() => setFormError('')}>
          {formError}
        </InlineAlert>

        <form id="expense-form" onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <label className="form-label" htmlFor="expense-amount">
                Amount (₹)
              </label>
              <div className="input-icon-wrap">
                <i className="bi bi-currency-rupee" aria-hidden="true" />
                <input
                  id="expense-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  autoFocus
                  className={`form-control${
                    fieldErrors.amount ? ' is-invalid' : ''
                  }`}
                  placeholder="1200"
                  value={form.amount}
                  onChange={update('amount')}
                />
              </div>
              {fieldErrors.amount ? (
                <div className="ss-field-error">{fieldErrors.amount}</div>
              ) : null}
            </div>

            <div className="col-12 col-sm-6">
              <label className="form-label" htmlFor="expense-date">
                Date
              </label>
              <div className="input-icon-wrap">
                <i className="bi bi-calendar3" aria-hidden="true" />
                <input
                  id="expense-date"
                  type="date"
                  max={todayISO()}
                  className={`form-control${
                    fieldErrors.expenseDate ? ' is-invalid' : ''
                  }`}
                  value={form.expenseDate}
                  onChange={update('expenseDate')}
                />
              </div>
              {fieldErrors.expenseDate ? (
                <div className="ss-field-error">{fieldErrors.expenseDate}</div>
              ) : null}
            </div>

            <div className="col-12">
              <label className="form-label" htmlFor="expense-category">
                Category
              </label>
              <div className="input-icon-wrap">
                <i className="bi bi-tag" aria-hidden="true" />
                <input
                  id="expense-category"
                  type="text"
                  list="expense-category-options"
                  maxLength={50}
                  className={`form-control${
                    fieldErrors.category ? ' is-invalid' : ''
                  }`}
                  placeholder="Groceries"
                  value={form.category}
                  onChange={update('category')}
                />
              </div>
              <datalist id="expense-category-options">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              {fieldErrors.category ? (
                <div className="ss-field-error">{fieldErrors.category}</div>
              ) : null}
            </div>

            <div className="col-12">
              <label className="form-label" htmlFor="expense-description">
                Description <span className="label-optional">optional</span>
              </label>
              <textarea
                id="expense-description"
                className="form-control"
                rows={2}
                maxLength={255}
                placeholder="What was this for?"
                value={form.description}
                onChange={update('description')}
              />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this expense?"
        message={
          pendingDelete
            ? `${pendingDelete.category} · ${formatCurrency(
                pendingDelete.amount,
              )} on ${formatDate(pendingDelete.expenseDate)} will be removed.`
            : ''
        }
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
