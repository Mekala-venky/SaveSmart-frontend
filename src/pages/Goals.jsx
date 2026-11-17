import { useCallback, useEffect, useMemo, useState } from 'react';

import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PageLoader from '../components/PageLoader.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import StatCard from '../components/StatCard.jsx';
import { extractErrorMessage, goalApi } from '../services/api.js';
import {
  daysUntil,
  formatCurrency,
  formatDate,
  formatPercent,
  futureISO,
  goalStatus,
  todayISO,
} from '../utils/format.js';

const emptyForm = {
  goalName: '',
  targetAmount: '',
  targetDate: futureISO(90),
  description: '',
};

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [moneyGoal, setMoneyGoal] = useState(null);
  const [contribution, setContribution] = useState('');
  const [contributionError, setContributionError] = useState('');
  const [contributing, setContributing] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await goalApi.list();
      setGoals(data);
    } catch (requestError) {
      setError(
        extractErrorMessage(requestError, 'We could not load your goals.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedGoals = useMemo(
    () =>
      [...goals].sort((a, b) => {
        const aDone = Number(a.progressPercentage) >= 100 ? 1 : 0;
        const bDone = Number(b.progressPercentage) >= 100 ? 1 : 0;

        if (aDone !== bDone) {
          return aDone - bDone;
        }

        return String(a.targetDate).localeCompare(String(b.targetDate));
      }),
    [goals],
  );

  const summary = useMemo(() => {
    const target = goals.reduce(
      (sum, goal) => sum + Number(goal.targetAmount),
      0,
    );
    const saved = goals.reduce(
      (sum, goal) => sum + Number(goal.currentAmount),
      0,
    );
    const achieved = goals.filter(
      (goal) => Number(goal.progressPercentage) >= 100,
    ).length;

    return { target, saved, achieved };
  }, [goals]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, targetDate: futureISO(90) });
    setFieldErrors({});
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (goal) => {
    setEditing(goal);
    setForm({
      goalName: goal.goalName ?? '',
      targetAmount: String(goal.targetAmount ?? ''),
      targetDate:
        goal.targetDate && daysUntil(goal.targetDate) > 0
          ? goal.targetDate
          : futureISO(90),
      description: goal.description ?? '',
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
    const target = Number(form.targetAmount);

    if (!form.goalName.trim()) {
      errors.goalName = 'Give your goal a name.';
    }

    if (!form.targetAmount) {
      errors.targetAmount = 'Enter a target amount.';
    } else if (!Number.isFinite(target) || target <= 0) {
      errors.targetAmount = 'Target must be greater than zero.';
    } else if (
      editing &&
      target < Number(editing.currentAmount ?? 0)
    ) {
      errors.targetAmount = `Target cannot be below the ${formatCurrency(
        editing.currentAmount,
      )} already saved.`;
    }

    if (!form.targetDate) {
      errors.targetDate = 'Choose a target date.';
    } else if (form.targetDate <= todayISO()) {
      errors.targetDate = 'Target date must be in the future.';
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
      goalName: form.goalName.trim(),
      targetAmount: Number(form.targetAmount),
      targetDate: form.targetDate,
    };

    if (form.description.trim()) {
      payload.description = form.description.trim();
    }

    try {
      if (editing) {
        const updated = await goalApi.update(editing.id, payload);
        setGoals((previous) =>
          previous.map((goal) => (goal.id === updated.id ? updated : goal)),
        );
        setSuccess('Goal updated.');
      } else {
        const created = await goalApi.create(payload);
        setGoals((previous) => [...previous, created]);
        setSuccess('Goal created. Add money whenever you save towards it.');
      }

      setModalOpen(false);
      setEditing(null);
    } catch (requestError) {
      setFormError(
        extractErrorMessage(requestError, 'We could not save this goal.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const openMoney = (goal) => {
    setMoneyGoal(goal);
    setContribution('');
    setContributionError('');
  };

  const closeMoney = () => {
    if (contributing) {
      return;
    }

    setMoneyGoal(null);
    setContributionError('');
  };

  const handleContribute = async (event) => {
    event.preventDefault();

    if (!moneyGoal) {
      return;
    }

    const amount = Number(contribution);

    if (!contribution) {
      setContributionError('Enter an amount.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setContributionError('Amount must be greater than zero.');
      return;
    }

    const remaining = Math.max(
      0,
      Number(moneyGoal.targetAmount) - Number(moneyGoal.currentAmount),
    );

    if (amount > remaining) {
      setContributionError(
        `You can add up to ${formatCurrency(
          remaining,
        )} — goals cannot be over-funded.`,
      );
      return;
    }

    setContributing(true);
    setContributionError('');

    try {
      const updated = await goalApi.addMoney(moneyGoal.id, amount);
      setGoals((previous) =>
        previous.map((goal) => (goal.id === updated.id ? updated : goal)),
      );
      setSuccess(
        `${formatCurrency(amount)} added to ${updated.goalName}.`,
      );
      setMoneyGoal(null);
    } catch (requestError) {
      setContributionError(
        extractErrorMessage(requestError, 'We could not add that amount.'),
      );
    } finally {
      setContributing(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await goalApi.remove(pendingDelete.id);
      setGoals((previous) =>
        previous.filter((goal) => goal.id !== pendingDelete.id),
      );
      setSuccess('Goal deleted.');
      setPendingDelete(null);
    } catch (requestError) {
      setError(
        extractErrorMessage(requestError, 'We could not delete that goal.'),
      );
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const remainingForMoney = moneyGoal
    ? Math.max(
        0,
        Number(moneyGoal.targetAmount) - Number(moneyGoal.currentAmount),
      )
    : 0;

  return (
    <>
      <PageHeader
        eyebrow="Plans"
        title="Savings goals"
        description="Set targets, track progress and keep every goal within its limit."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> New goal
          </button>
        }
      />

      <InlineAlert tone="danger" onClose={() => setError('')}>
        {error}
      </InlineAlert>
      <InlineAlert tone="success" onClose={() => setSuccess('')}>
        {success}
      </InlineAlert>

      {loading ? (
        <PageLoader label="Loading your goals…" />
      ) : goals.length === 0 ? (
        <section className="ss-card">
          <EmptyState
            icon="bi-bullseye"
            title="No savings goals yet"
            description="Create a goal such as an emergency fund, a trip or a new laptop."
            action={
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                Create your first goal
              </button>
            }
          />
        </section>
      ) : (
        <>
          <div className="row g-3 g-xl-4">
            <div className="col-12 col-sm-4">
              <StatCard
                icon="bi-bullseye"
                label="Goals"
                value={goals.length}
                hint={`${summary.achieved} achieved`}
                tone="teal"
              />
            </div>
            <div className="col-12 col-sm-4">
              <StatCard
                icon="bi-piggy-bank"
                label="Saved towards goals"
                value={formatCurrency(summary.saved)}
                hint={`of ${formatCurrency(summary.target)} target`}
                tone="indigo"
              />
            </div>
            <div className="col-12 col-sm-4">
              <StatCard
                icon="bi-graph-up-arrow"
                label="Overall progress"
                value={formatPercent(
                  summary.target > 0
                    ? (summary.saved / summary.target) * 100
                    : 0,
                )}
                hint="Across all goals"
                tone="amber"
              />
            </div>
          </div>

          <div className="goal-grid mt-3 mt-xl-4">
            {sortedGoals.map((goal) => {
              const status = goalStatus(goal);
              const achieved = Number(goal.progressPercentage) >= 100;
              const remaining = Math.max(
                0,
                Number(goal.targetAmount) - Number(goal.currentAmount),
              );

              return (
                <article className="goal-card" key={goal.id}>
                  <div className="goal-card-top">
                    <div className="goal-icon">
                      <i className="bi bi-flag-fill" aria-hidden="true" />
                    </div>
                    <span className={`badge-soft badge-${status.tone}`}>
                      {status.label}
                    </span>
                  </div>

                  <h3>{goal.goalName}</h3>
                  <p className="goal-description">
                    {goal.description || 'No description added.'}
                  </p>

                  <div className="goal-amounts">
                    <strong>{formatCurrency(goal.currentAmount)}</strong>
                    <span>of {formatCurrency(goal.targetAmount)}</span>
                  </div>

                  <ProgressBar
                    value={goal.progressPercentage}
                    tone={achieved ? 'success' : 'teal'}
                    showLabel
                  />

                  <div className="goal-meta">
                    <span>
                      <i className="bi bi-calendar-event" aria-hidden="true" />{' '}
                      {formatDate(goal.targetDate)}
                    </span>
                    <span>
                      {achieved
                        ? 'Goal complete'
                        : `${formatCurrency(remaining)} to go`}
                    </span>
                  </div>

                  <div className="goal-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => openMoney(goal)}
                      disabled={achieved}
                    >
                      <i className="bi bi-plus-lg" aria-hidden="true" /> Add money
                    </button>
                    <button
                      type="button"
                      className="btn-icon btn-icon-sm"
                      title="Edit goal"
                      aria-label={`Edit ${goal.goalName}`}
                      onClick={() => openEdit(goal)}
                    >
                      <i className="bi bi-pencil" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="btn-icon btn-icon-sm danger"
                      title="Delete goal"
                      aria-label={`Delete ${goal.goalName}`}
                      onClick={() => setPendingDelete(goal)}
                    >
                      <i className="bi bi-trash3" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit goal' : 'Create a savings goal'}
        subtitle="Target dates must be in the future."
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
              form="goal-form"
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
                'Create goal'
              )}
            </button>
          </>
        }
      >
        <InlineAlert tone="danger" onClose={() => setFormError('')}>
          {formError}
        </InlineAlert>

        <form id="goal-form" onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label" htmlFor="goal-name">
                Goal name
              </label>
              <div className="input-icon-wrap">
                <i className="bi bi-flag" aria-hidden="true" />
                <input
                  id="goal-name"
                  type="text"
                  maxLength={100}
                  autoFocus
                  className={`form-control${
                    fieldErrors.goalName ? ' is-invalid' : ''
                  }`}
                  placeholder="e.g. Emergency fund"
                  value={form.goalName}
                  onChange={update('goalName')}
                />
              </div>
              {fieldErrors.goalName ? (
                <div className="ss-field-error">{fieldErrors.goalName}</div>
              ) : null}
            </div>

            <div className="col-12 col-sm-6">
              <label className="form-label" htmlFor="goal-target">
                Target amount (₹)
              </label>
              <div className="input-icon-wrap">
                <i className="bi bi-currency-rupee" aria-hidden="true" />
                <input
                  id="goal-target"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  className={`form-control${
                    fieldErrors.targetAmount ? ' is-invalid' : ''
                  }`}
                  placeholder="100000"
                  value={form.targetAmount}
                  onChange={update('targetAmount')}
                />
              </div>
              {fieldErrors.targetAmount ? (
                <div className="ss-field-error">{fieldErrors.targetAmount}</div>
              ) : null}
            </div>

            <div className="col-12 col-sm-6">
              <label className="form-label" htmlFor="goal-date">
                Target date
              </label>
              <div className="input-icon-wrap">
                <i className="bi bi-calendar-event" aria-hidden="true" />
                <input
                  id="goal-date"
                  type="date"
                  min={futureISO(1)}
                  className={`form-control${
                    fieldErrors.targetDate ? ' is-invalid' : ''
                  }`}
                  value={form.targetDate}
                  onChange={update('targetDate')}
                />
              </div>
              {fieldErrors.targetDate ? (
                <div className="ss-field-error">{fieldErrors.targetDate}</div>
              ) : null}
            </div>

            <div className="col-12">
              <label className="form-label" htmlFor="goal-description">
                Description <span className="label-optional">optional</span>
              </label>
              <textarea
                id="goal-description"
                className="form-control"
                rows={2}
                maxLength={255}
                placeholder="What are you saving for?"
                value={form.description}
                onChange={update('description')}
              />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(moneyGoal)}
        title={moneyGoal ? `Add money to ${moneyGoal.goalName}` : ''}
        subtitle={
          moneyGoal
            ? `${formatCurrency(
                moneyGoal.currentAmount,
              )} saved · ${formatCurrency(remainingForMoney)} remaining`
            : ''
        }
        onClose={closeMoney}
        footer={
          <>
            <button
              type="button"
              className="btn btn-light"
              onClick={closeMoney}
              disabled={contributing}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="contribution-form"
              className="btn btn-primary"
              disabled={contributing}
            >
              {contributing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Adding…
                </>
              ) : (
                'Add money'
              )}
            </button>
          </>
        }
      >
        <InlineAlert tone="danger" onClose={() => setContributionError('')}>
          {contributionError}
        </InlineAlert>

        <form id="contribution-form" onSubmit={handleContribute} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor="contribution-amount">
              Amount (₹)
            </label>
            <div className="input-icon-wrap">
              <i className="bi bi-currency-rupee" aria-hidden="true" />
              <input
                id="contribution-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                autoFocus
                className="form-control"
                placeholder={String(Math.min(5000, remainingForMoney) || '')}
                value={contribution}
                onChange={(event) => setContribution(event.target.value)}
              />
            </div>
            <div className="ss-hint">
              Maximum you can add right now:{' '}
              <strong>{formatCurrency(remainingForMoney)}</strong>
            </div>
          </div>

          <div className="ss-footnote">
            <i className="bi bi-info-circle" aria-hidden="true" />
            Adding money only updates this goal's progress. It does not debit a
            savings account.
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this goal?"
        message={
          pendingDelete
            ? `${pendingDelete.goalName} and its ${formatCurrency(
                pendingDelete.currentAmount,
              )} of progress will be removed.`
            : ''
        }
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
