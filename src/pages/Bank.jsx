import { useCallback, useEffect, useMemo, useState } from 'react';

import EmptyState from '../components/EmptyState.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PageLoader from '../components/PageLoader.jsx';
import StatCard from '../components/StatCard.jsx';
import { bankApi, extractErrorMessage } from '../services/api.js';
import { formatCurrency, formatDateTime } from '../utils/format.js';

const TRANSACTION_META = {
  OPENING_BALANCE: {
    label: 'Opening balance',
    icon: 'bi-flag',
    incoming: true,
  },
  DEPOSIT: {
    label: 'Money added',
    icon: 'bi-plus-circle',
    incoming: true,
  },
  WITHDRAWAL: {
    label: 'Cash out',
    icon: 'bi-cash',
    incoming: false,
  },
  TRANSFER_TO_SAVINGS: {
    label: 'Moved to savings',
    icon: 'bi-arrow-up-right',
    incoming: false,
  },
  TRANSFER_FROM_SAVINGS: {
    label: 'Approved savings withdrawal',
    icon: 'bi-arrow-down-left',
    incoming: true,
  },
};

function metaFor(type) {
  return (
    TRANSACTION_META[type] ?? {
      label: type,
      icon: 'bi-arrow-left-right',
      incoming: true,
    }
  );
}

export default function Bank() {
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [modal, setModal] = useState(null); // 'create' | 'deposit' | 'withdraw'
  const [form, setForm] = useState({ amount: '', description: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [accountResult, transactionsResult] = await Promise.allSettled([
        bankApi.getAccount(),
        bankApi.getTransactions(),
      ]);

      if (transactionsResult.status === 'rejected') {
        throw transactionsResult.reason;
      }

      setTransactions(transactionsResult.value);

      if (accountResult.status === 'fulfilled') {
        setAccount(accountResult.value);
      } else if (accountResult.reason?.response?.status === 404) {
        setAccount(null);
        setTransactions([]);
      } else {
        throw accountResult.reason;
      }
    } catch (requestError) {
      setError(
        extractErrorMessage(
          requestError,
          'We could not load your simulated bank account.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const sum = (type) =>
      transactions
        .filter((transaction) => transaction.transactionType === type)
        .reduce((total, transaction) => total + Number(transaction.amount), 0);

    return {
      toSavings: sum('TRANSFER_TO_SAVINGS'),
      fromSavings: sum('TRANSFER_FROM_SAVINGS'),
    };
  }, [transactions]);

  const openModal = (mode) => {
    setModal(mode);
    setForm({
      amount: mode === 'create' ? '100000' : '',
      description: '',
    });
    setFieldErrors({});
    setFormError('');
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModal(null);
    setFormError('');
  };

  const update = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const validate = () => {
    const errors = {};
    const amount = Number(form.amount);

    if (form.amount === '') {
      errors.amount =
        modal === 'create' ? 'Enter an opening balance.' : 'Enter an amount.';
    } else if (!Number.isFinite(amount) || amount < 0) {
      errors.amount = 'Amount cannot be negative.';
    } else if (modal !== 'create' && amount <= 0) {
      errors.amount = 'Amount must be greater than zero.';
    } else if (amount > 9999999999.99) {
      errors.amount = 'That amount is too large.';
    } else if (
      modal === 'withdraw' &&
      account &&
      amount > Number(account.balance)
    ) {
      errors.amount = `You can take out up to ${formatCurrency(
        account.balance,
      )}.`;
    }

    if (modal !== 'create' && form.description.trim().length > 255) {
      errors.description = 'Description cannot exceed 255 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!modal || !validate()) {
      return;
    }

    setSaving(true);
    setFormError('');

    const amount = Number(form.amount);
    const description = form.description.trim();

    try {
      if (modal === 'create') {
        await bankApi.createAccount({ openingBalance: amount });
      } else if (modal === 'deposit') {
        await bankApi.deposit({
          amount,
          ...(description ? { description } : {}),
        });
      } else {
        await bankApi.withdraw({
          amount,
          ...(description ? { description } : {}),
        });
      }

      await load();

      setSuccess(
        modal === 'create'
          ? 'Simulated bank account created. You can now move money into savings.'
          : `${modal === 'deposit' ? 'Added' : 'Took out'} ${formatCurrency(
              amount,
            )} ${modal === 'deposit' ? 'to' : 'from'} your simulated bank account.`,
      );
      setModal(null);
    } catch (requestError) {
      setFormError(
        extractErrorMessage(
          requestError,
          'We could not update your simulated bank account.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Linked account"
        title="Simulated bank account"
        description="This duplicate bank balance shows where savings money comes from and where approved withdrawals go. It is never connected to a real bank."
      />

      <InlineAlert tone="danger" onClose={() => setError('')}>
        {error}
      </InlineAlert>
      <InlineAlert tone="success" onClose={() => setSuccess('')}>
        {success}
      </InlineAlert>

      {loading ? (
        <PageLoader label="Loading your simulated bank account…" />
      ) : !account ? (
        <section className="ss-card">
          <EmptyState
            icon="bi-bank"
            title="Set up your simulated bank account"
            description="Give yourself an opening balance so you can try moving money into savings. When you save, this balance goes down. When a withdrawal is approved, it comes back here."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openModal('create')}
              >
                <i className="bi bi-plus-lg" aria-hidden="true" /> Set up bank
                account
              </button>
            }
          />
        </section>
      ) : (
        <>
          <div className="row g-3 g-xl-4">
            <div className="col-12 col-sm-4">
              <StatCard
                icon="bi-bank"
                label="Bank balance"
                value={formatCurrency(account.balance)}
                hint="Available to save"
                tone="teal"
              />
            </div>
            <div className="col-12 col-sm-4">
              <StatCard
                icon="bi-piggy-bank"
                label="Moved into savings"
                value={formatCurrency(totals.toSavings)}
                hint="Out of this bank"
                tone="indigo"
              />
            </div>
            <div className="col-12 col-sm-4">
              <StatCard
                icon="bi-arrow-down-left"
                label="Returned from savings"
                value={formatCurrency(totals.fromSavings)}
                hint="Approved withdrawals"
                tone="amber"
              />
            </div>
          </div>

          <section className="ss-card mt-3 mt-xl-4">
            <div className="ss-card-head">
              <div>
                <h2>Linked account</h2>
                <p>Simulated account number {account.accountNumber}</p>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => openModal('deposit')}
                >
                  <i className="bi bi-plus-lg" aria-hidden="true" /> Add money
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => openModal('withdraw')}
                >
                  <i className="bi bi-cash" aria-hidden="true" /> Take cash out
                </button>
              </div>
            </div>

            <div className="account-mini-list">
              <div className="account-mini">
                <span className="account-mini-icon teal">
                  <i className="bi bi-calendar-check" aria-hidden="true" />
                </span>
                <div>
                  <span>Created</span>
                  <strong>{formatDateTime(account.createdAt)}</strong>
                </div>
              </div>
              <div className="account-mini">
                <span className="account-mini-icon amber">
                  <i className="bi bi-clock-history" aria-hidden="true" />
                </span>
                <div>
                  <span>Last movement</span>
                  <strong>{formatDateTime(account.updatedAt)}</strong>
                </div>
              </div>
            </div>

            <div className="ss-footnote mt-3">
              <i className="bi bi-info-circle" aria-hidden="true" />
              Saving money debits this balance. A withdrawal request only credits
              it after a reviewer approves the reason.
            </div>
          </section>

          <section className="ss-card mt-3 mt-xl-4">
            <div className="ss-card-head">
              <div>
                <h2>Bank statement</h2>
                <p>Every simulated movement, newest first</p>
              </div>
            </div>

            {transactions.length === 0 ? (
              <EmptyState
                icon="bi-receipt"
                title="No bank movements yet"
                description="Add simulated money, or save into a savings account to start the statement."
              />
            ) : (
              <ul className="transaction-list">
                {transactions.map((transaction) => {
                  const meta = metaFor(transaction.transactionType);

                  return (
                    <li key={transaction.id}>
                      <span
                        className={`transaction-icon ${
                          meta.incoming ? 'in' : 'out'
                        }`}
                      >
                        <i className={`bi ${meta.icon}`} aria-hidden="true" />
                      </span>
                      <div className="transaction-main">
                        <strong>{meta.label}</strong>
                        <span>
                          {transaction.description || 'Simulated movement'} ·{' '}
                          {formatDateTime(transaction.transactionDate)}
                        </span>
                        <span className="statement-balance">
                          Balance after: {formatCurrency(transaction.balanceAfter)}
                        </span>
                      </div>
                      <span
                        className={`transaction-amount ${
                          meta.incoming ? 'in' : 'out'
                        }`}
                      >
                        {meta.incoming ? '+' : '−'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <Modal
        open={Boolean(modal)}
        title={
          modal === 'create'
            ? 'Set up your simulated bank account'
            : modal === 'deposit'
              ? 'Add simulated money'
              : 'Take simulated cash out'
        }
        subtitle={
          modal === 'create'
            ? 'This opening balance exists only inside SaveSmart.'
            : modal === 'deposit'
              ? 'Increases your bank balance so you have money to save.'
              : account
                ? `Available to take out: ${formatCurrency(account.balance)}`
                : ''
        }
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
              form="bank-form"
              className={`btn ${
                modal === 'withdraw' ? 'btn-dark' : 'btn-primary'
              }`}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Working…
                </>
              ) : modal === 'create' ? (
                'Create account'
              ) : modal === 'deposit' ? (
                'Add money'
              ) : (
                'Take cash out'
              )}
            </button>
          </>
        }
      >
        <InlineAlert tone="danger" onClose={() => setFormError('')}>
          {formError}
        </InlineAlert>

        <form id="bank-form" onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor="bank-amount">
              {modal === 'create' ? 'Opening balance (₹)' : 'Amount (₹)'}
            </label>
            <div className="input-icon-wrap">
              <i className="bi bi-currency-rupee" aria-hidden="true" />
              <input
                id="bank-amount"
                type="number"
                min={modal === 'create' ? '0' : '0.01'}
                step="0.01"
                inputMode="decimal"
                autoFocus
                className={`form-control${
                  fieldErrors.amount ? ' is-invalid' : ''
                }`}
                placeholder={modal === 'create' ? '100000' : '2500'}
                value={form.amount}
                onChange={update('amount')}
              />
            </div>
            {fieldErrors.amount ? (
              <div className="ss-field-error">{fieldErrors.amount}</div>
            ) : null}
            {modal === 'create' ? (
              <p className="ss-muted mt-2 mb-0">
                Tip: start with a fictional amount like ₹1,00,000 so you can try
                saving and withdrawal requests.
              </p>
            ) : null}
          </div>

          {modal !== 'create' ? (
            <div>
              <label className="form-label" htmlFor="bank-description">
                Note <span className="label-optional">optional</span>
              </label>
              <input
                id="bank-description"
                type="text"
                maxLength={255}
                className={`form-control${
                  fieldErrors.description ? ' is-invalid' : ''
                }`}
                placeholder={
                  modal === 'deposit'
                    ? 'e.g. Monthly salary credited'
                    : 'e.g. Cash for weekend'
                }
                value={form.description}
                onChange={update('description')}
              />
              {fieldErrors.description ? (
                <div className="ss-field-error">{fieldErrors.description}</div>
              ) : null}
            </div>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
