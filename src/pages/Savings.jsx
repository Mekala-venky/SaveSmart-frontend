
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PageLoader from '../components/PageLoader.jsx';
import StatCard from '../components/StatCard.jsx';
import {
  bankApi,
  extractErrorMessage,
  savingsApi,
  withdrawalApi,
} from '../services/api.js';
import {
  ACCOUNT_TYPES,
  accountMeta,
  formatCurrency,
  formatDateTime,
} from '../utils/format.js';

const STATUS_META = {
  PENDING: { label: 'Pending review', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};

function statusMeta(status) {
  return STATUS_META[status] ?? { label: status, tone: 'muted' };
}

export default function Savings() {
  const [accounts, setAccounts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [bankAccount, setBankAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState('');
  const [txError, setTxError] = useState('');
  const [success, setSuccess] = useState('');
  const [creatingType, setCreatingType] = useState('');

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ amount: '', description: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedId) ?? null,
    [accounts, selectedId],
  );

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'PENDING').length,
    [requests],
  );

  const loadAccounts = useCallback(async () => {
    const data = await savingsApi.getAccounts();
    setAccounts(data);

    setSelectedId((current) => {
      if (current && data.some((account) => account.id === current)) {
        return current;
      }

      return data[0]?.id ?? null;
    });

    return data;
  }, []);

  const loadTransactions = useCallback(async (accountId) => {
    if (!accountId) {
      setTransactions([]);
      return;
    }

    setTxLoading(true);
    setTxError('');

    try {
      const data = await savingsApi.getTransactions(accountId);
      setTransactions(data);
    } catch (requestError) {
      setTxError(
        extractErrorMessage(
          requestError,
          'We could not load this account’s transactions.',
        ),
      );
    } finally {
      setTxLoading(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    const data = await withdrawalApi.list();
    setRequests(data);
    return data;
  }, []);

  const loadBank = useCallback(async () => {
    try {
      const data = await bankApi.getAccount();
      setBankAccount(data);
      return data;
    } catch (requestError) {
      if (requestError?.response?.status === 404) {
        setBankAccount(null);
        return null;
      }

      throw requestError;
    }
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);

      try {
        const [data, requestData] = await Promise.all([
          savingsApi.getAccounts(),
          withdrawalApi.list(),
        ]);

        if (!active) {
          return;
        }

        setAccounts(data);
        setRequests(requestData);

        setSelectedId((current) => {
          if (current && data.some((account) => account.id === current)) {
            return current;
          }

          return data[0]?.id ?? null;
        });

        try {
          const bank = await bankApi.getAccount();

          if (active) {
            setBankAccount(bank);
          }
        } catch (requestError) {
          if (requestError?.response?.status !== 404) {
            throw requestError;
          }

          if (active) {
            setBankAccount(null);
          }
        }
      } catch (requestError) {
        if (active) {
          setError(
            extractErrorMessage(
              requestError,
              'We could not load your savings accounts.',
            ),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadTransactions(selectedId);
  }, [selectedId, loadTransactions]);

  const totals = useMemo(() => {
    const total = accounts.reduce(
      (sum, account) => sum + Number(account.balance),
      0,
    );

    const future = accounts.find(
      (account) => account.accountType === 'FUTURE_SAVINGS',
    );

    const emergency = accounts.find(
      (account) => account.accountType === 'EMERGENCY_FUND',
    );

    return {
      total,
      future: Number(future?.balance ?? 0),
      emergency: Number(emergency?.balance ?? 0),
    };
  }, [accounts]);

  const handleCreateAccount = async (accountType) => {
    setCreatingType(accountType);
    setError('');
    setSuccess('');

    try {
      const created = await savingsApi.createAccount({ accountType });
      const data = await loadAccounts();

      setSelectedId(created.id);

      setSuccess(
        `${accountMeta(created.accountType).label} account created. Save money from your simulated bank to get started.`,
      );

      setAccounts(data);
    } catch (requestError) {
      setError(
        extractErrorMessage(
          requestError,
          'We could not create that savings account.',
        ),
      );
    } finally {
      setCreatingType('');
    }
  };

  const openModal = (mode, account) => {
    if (!bankAccount) {
      setError(
        'Set up your simulated bank account first — that is where savings money comes from and where approved withdrawals go.',
      );
      return;
    }

    setModal({ mode, account });
    setForm({ amount: '', description: '' });
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
    setForm((previous) => ({
      ...previous,
      [field]: event.target.value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));
  };

  // Corrected validation:
  // Deposits are checked against the simulated bank balance.
  // Withdrawals are checked against the savings account balance.
  const validate = () => {
    const errors = {};
    const amount = Number(form.amount);
    const isRequest = modal?.mode === 'request';

    if (!form.amount) {
      errors.amount = 'Enter an amount.';
    } else if (!Number.isFinite(amount) || amount <= 0) {
      errors.amount = 'Amount must be greater than zero.';
    } else if (amount > 9999999999.99) {
      errors.amount = 'That amount is too large.';
    } else if (
      isRequest &&
      modal?.account &&
      amount > Number(modal.account.balance)
    ) {
      errors.amount = `You can request up to ${formatCurrency(
        modal.account.balance,
      )}.`;
    } else if (
      !isRequest &&
      bankAccount &&
      amount > Number(bankAccount.balance)
    ) {
      errors.amount = `Your simulated bank only has ${formatCurrency(
        bankAccount.balance,
      )}.`;
    }

    if (isRequest && form.description.trim().length < 10) {
      errors.description =
        'Explain why you need this money (at least 10 characters).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!modal || !validate()) {
      return;
    }

    const isRequest = modal.mode === 'request';
    const amount = Number(form.amount);
    const description = form.description.trim();

    setSaving(true);
    setFormError('');

    try {
      if (isRequest) {
        await withdrawalApi.create({
          savingsAccountId: modal.account.id,
          amount,
          description,
        });
      } else {
        await savingsApi.deposit(modal.account.id, {
          amount,
          ...(description ? { description } : {}),
        });
      }

      await Promise.all([
        loadAccounts(),
        loadBank(),
        loadRequests(),
        isRequest
          ? Promise.resolve()
          : loadTransactions(modal.account.id),
      ]);

      setSuccess(
        isRequest
          ? `Withdrawal request for ${formatCurrency(
              amount,
            )} sent for review. Money moves only after a reviewer approves your reason.`
          : `Saved ${formatCurrency(
              amount,
            )}. The money moved from your simulated bank into ${accountMeta(
              modal.account.accountType,
            ).label.toLowerCase()}.`,
      );

      setModal(null);
    } catch (requestError) {
      setFormError(
        extractErrorMessage(
          requestError,
          isRequest
            ? 'We could not send that withdrawal request.'
            : 'We could not complete that deposit.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!cancelTarget) {
      return;
    }

    setCancelling(true);
    setError('');

    try {
      await withdrawalApi.cancel(cancelTarget.id);

      setSuccess('Withdrawal request cancelled. No money moved.');
      setCancelTarget(null);

      await loadRequests();
    } catch (requestError) {
      setError(
        extractErrorMessage(
          requestError,
          'We could not cancel that withdrawal request.',
        ),
      );
    } finally {
      setCancelling(false);
    }
  };

  const isRequestModal = modal?.mode === 'request';

  return (
    <>
      <PageHeader
        eyebrow="Simulated balances"
        title="Savings accounts"
        description="Saving moves money out of your simulated bank. Withdrawals are reviewed first, then the approved amount goes back to the bank."
      />

      <InlineAlert tone="danger" onClose={() => setError('')}>
        {error}
      </InlineAlert>

      <InlineAlert tone="success" onClose={() => setSuccess('')}>
        {success}
      </InlineAlert>

      {loading ? (
        <PageLoader label="Loading savings accounts…" />
      ) : (
        <>
          {!bankAccount ? (
            <div className="setup-banner">
              <div className="setup-banner-icon">
                <i className="bi bi-bank" aria-hidden="true" />
              </div>

              <div>
                <strong>Set up your simulated bank account first</strong>
                <p>
                  Saving debits that balance and approved withdrawals credit it
                  back. It is a duplicate balance for the demo — no real bank is
                  involved.
                </p>
              </div>

              <Link to="/bank" className="btn btn-primary">
                Set up bank account
              </Link>
            </div>
          ) : null}

          <div className="row g-3 g-xl-4">
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                icon="bi-wallet2"
                label="Total simulated savings"
                value={formatCurrency(totals.total)}
                hint={`${accounts.length} account${
                  accounts.length === 1 ? '' : 's'
                }`}
                tone="teal"
              />
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                icon="bi-piggy-bank"
                label="Future savings"
                value={formatCurrency(totals.future)}
                hint="Money set aside for plans"
                tone="indigo"
              />
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                icon="bi-shield-check"
                label="Emergency fund"
                value={formatCurrency(totals.emergency)}
                hint="Your safety net"
                tone="amber"
              />
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                icon="bi-bank"
                label="Bank balance"
                value={
                  bankAccount ? formatCurrency(bankAccount.balance) : '—'
                }
                hint={
                  bankAccount
                    ? `${bankAccount.accountNumber.slice(-4)} linked`
                    : 'Not set up'
                }
                tone="rose"
              />
            </div>
          </div>

          <div className="account-grid mt-3 mt-xl-4">
            {ACCOUNT_TYPES.map((meta) => {
              const account = accounts.find(
                (item) => item.accountType === meta.value,
              );

              if (!account) {
                return (
                  <div
                    className="account-card account-card-missing"
                    key={meta.value}
                  >
                    <div className="account-card-top">
                      <span className={`account-icon ${meta.tone}`}>
                        <i className={`bi ${meta.icon}`} aria-hidden="true" />
                      </span>

                      <span className="badge-soft badge-muted">
                        Not created
                      </span>
                    </div>

                    <h3>{meta.label}</h3>
                    <p>{meta.description}</p>

                    <button
                      type="button"
                      className="btn btn-outline-primary w-100"
                      onClick={() => handleCreateAccount(meta.value)}
                      disabled={creatingType === meta.value}
                    >
                      {creatingType === meta.value ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Creating…
                        </>
                      ) : (
                        <>
                          <i className="bi bi-plus-lg" aria-hidden="true" />{' '}
                          Create account
                        </>
                      )}
                    </button>
                  </div>
                );
              }

              const isActive = account.id === selectedId;

              return (
                <button
                  type="button"
                  key={meta.value}
                  className={`account-card account-card-selectable${
                    isActive ? ' is-active' : ''
                  }`}
                  onClick={() => setSelectedId(account.id)}
                  aria-pressed={isActive}
                >
                  <div className="account-card-top">
                    <span className={`account-icon ${meta.tone}`}>
                      <i className={`bi ${meta.icon}`} aria-hidden="true" />
                    </span>

                    <span className="badge-soft badge-success">Active</span>
                  </div>

                  <h3>{meta.label}</h3>

                  <strong className="account-card-balance">
                    {formatCurrency(account.balance)}
                  </strong>

                  <p className="account-card-foot">
                    Updated {formatDateTime(account.updatedAt)}
                  </p>
                </button>
              );
            })}
          </div>

          <section className="ss-card mt-3 mt-xl-4">
            <div className="ss-card-head">
              <div>
                <h2>
                  {selectedAccount
                    ? `${accountMeta(selectedAccount.accountType).label} activity`
                    : 'Transaction history'}
                </h2>

                <p>
                  {selectedAccount
                    ? `Available balance: ${formatCurrency(
                        selectedAccount.balance,
                      )}`
                    : 'Select an account above to see its activity.'}
                </p>
              </div>

              {selectedAccount ? (
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => openModal('deposit', selectedAccount)}
                    disabled={!bankAccount}
                  >
                    <i className="bi bi-arrow-down-left" aria-hidden="true" />{' '}
                    Save money
                  </button>

                  <button
                    type="button"
                    className="btn btn-light btn-sm"
                    onClick={() => openModal('request', selectedAccount)}
                    disabled={!bankAccount}
                  >
                    <i className="bi bi-shield-lock" aria-hidden="true" />{' '}
                    Request withdrawal
                  </button>
                </div>
              ) : null}
            </div>

            <InlineAlert tone="danger" onClose={() => setTxError('')}>
              {txError}
            </InlineAlert>

            {accounts.length === 0 ? (
              <EmptyState
                icon="bi-bank"
                title="Create your first savings account"
                description="Start with a future savings account or an emergency fund."
                action={
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleCreateAccount('FUTURE_SAVINGS')}
                  >
                    Create future savings
                  </button>
                }
              />
            ) : txLoading ? (
              <PageLoader label="Loading transactions…" />
            ) : transactions.length === 0 ? (
              <EmptyState
                icon="bi-arrow-left-right"
                title="No transactions yet"
                description="Save simulated money from your bank to start building this balance."
                action={
                  selectedAccount ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => openModal('deposit', selectedAccount)}
                      disabled={!bankAccount}
                    >
                      Save money
                    </button>
                  ) : null
                }
              />
            ) : (
              <ul className="transaction-list">
                {transactions.map((transaction) => {
                  const isDeposit =
                    transaction.transactionType === 'DEPOSIT';

                  return (
                    <li key={transaction.id}>
                      <span
                        className={`transaction-icon ${
                          isDeposit ? 'in' : 'out'
                        }`}
                      >
                        <i
                          className={`bi ${
                            isDeposit
                              ? 'bi-arrow-down-left'
                              : 'bi-arrow-up-right'
                          }`}
                          aria-hidden="true"
                        />
                      </span>

                      <div className="transaction-main">
                        <strong>
                          {isDeposit
                            ? 'Saved from bank'
                            : 'Approved withdrawal'}
                        </strong>

                        <span>
                          {transaction.description || 'Savings transfer'} ·{' '}
                          {formatDateTime(transaction.transactionDate)}
                        </span>
                      </div>

                      <span
                        className={`transaction-amount ${
                          isDeposit ? 'in' : 'out'
                        }`}
                      >
                        {isDeposit ? '+' : '−'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="ss-footnote mt-3">
              <i className="bi bi-shield-lock" aria-hidden="true" />
              All balances are stored only in your SaveSmart database. No money
              leaves or enters a real bank account.
            </div>
          </section>

          <section className="ss-card mt-3 mt-xl-4">
            <div className="ss-card-head">
              <div>
                <h2>Withdrawal requests</h2>
                <p>
                  You explain why you need the money; a reviewer checks it
                  before any balance changes.
                </p>
              </div>

              <span className="badge-soft badge-warning">
                {pendingCount} pending
              </span>
            </div>

            {requests.length === 0 ? (
              <EmptyState
                icon="bi-shield-check"
                title="No withdrawal requests yet"
                description="When you need money back, request a withdrawal and give a clear reason. It stays pending until a reviewer decides."
                action={
                  selectedAccount ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => openModal('request', selectedAccount)}
                      disabled={!bankAccount}
                    >
                      Request a withdrawal
                    </button>
                  ) : null
                }
              />
            ) : (
              <div className="request-list">
                {requests.map((request) => {
                  const meta = statusMeta(request.status);
                  const isPending = request.status === 'PENDING';

                  return (
                    <article className="request-card" key={request.id}>
                      <div className="request-card-head">
                        <div>
                          <span className={`badge-soft badge-${meta.tone}`}>
                            {meta.label}
                          </span>

                          <h3 className="request-amount">
                            {formatCurrency(request.amount)}
                            <small>
                              {' '}
                              from {accountMeta(request.accountType).label}
                            </small>
                          </h3>

                          <p className="request-meta">
                            Requested {formatDateTime(request.createdAt)}
                          </p>
                        </div>

                        <div className="request-balance">
                          <span>Balance if approved</span>
                          <strong>
                            {request.remainingBalance != null
                              ? formatCurrency(request.remainingBalance)
                              : '—'}
                          </strong>
                        </div>
                      </div>

                      <p className="request-reason">
                        <strong>Your reason:</strong> {request.description}
                      </p>

                      {request.status === 'REJECTED' &&
                      request.reviewerNote ? (
                        <p className="request-review">
                          <span>
                            <strong>Reviewer note:</strong>{' '}
                            {request.reviewerNote}
                          </span>
                        </p>
                      ) : null}

                      {!isPending ? (
                        <div className="request-review">
                          <span>
                            {request.status === 'APPROVED'
                              ? 'Approved'
                              : 'Rejected'}{' '}
                            by {request.reviewedBy ?? 'reviewer'} ·{' '}
                            {formatDateTime(request.reviewedAt)}
                            {request.status === 'APPROVED'
                              ? ' · money credited to your simulated bank'
                              : ''}
                          </span>
                        </div>
                      ) : (
                        <div className="request-actions">
                          <button
                            type="button"
                            className="btn btn-light btn-sm"
                            onClick={() => setCancelTarget(request)}
                          >
                            Cancel request
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <Modal
        open={Boolean(modal)}
        title={
          modal
            ? `${
                isRequestModal
                  ? 'Request a withdrawal from'
                  : 'Save money into'
              } ${accountMeta(modal.account.accountType).label}`
            : ''
        }
        subtitle={
          modal
            ? isRequestModal
              ? `Available to request: ${formatCurrency(
                  modal.account.balance,
                )}. Your reason is checked before approval.`
              : `Simulated bank balance: ${
                  bankAccount ? formatCurrency(bankAccount.balance) : '—'
                }`
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
              form="savings-form"
              className={`btn ${
                isRequestModal ? 'btn-dark' : 'btn-primary'
              }`}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  {isRequestModal ? 'Sending…' : 'Saving…'}
                </>
              ) : isRequestModal ? (
                'Send request for review'
              ) : (
                'Save money'
              )}
            </button>
          </>
        }
      >
        <InlineAlert tone="danger" onClose={() => setFormError('')}>
          {formError}
        </InlineAlert>

        <form id="savings-form" onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor="savings-amount">
              Amount (₹)
            </label>

            <div className="input-icon-wrap">
              <i className="bi bi-currency-rupee" aria-hidden="true" />

              <input
                id="savings-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                autoFocus
                className={`form-control${
                  fieldErrors.amount ? ' is-invalid' : ''
                }`}
                placeholder="2500"
                value={form.amount}
                onChange={update('amount')}
              />
            </div>

            {fieldErrors.amount ? (
              <div className="ss-field-error">{fieldErrors.amount}</div>
            ) : null}
          </div>

          <div>
            <label className="form-label" htmlFor="savings-description">
              {isRequestModal ? (
                <>
                  Why do you need this money?{' '}
                  <span className="label-optional">required</span>
                </>
              ) : (
                <>
                  Note <span className="label-optional">optional</span>
                </>
              )}
            </label>

            {isRequestModal ? (
              <textarea
                id="savings-description"
                rows={3}
                maxLength={255}
                className={`form-control${
                  fieldErrors.description ? ' is-invalid' : ''
                }`}
                placeholder="e.g. Hospital bill for my father's treatment"
                value={form.description}
                onChange={update('description')}
              />
            ) : (
              <input
                id="savings-description"
                type="text"
                maxLength={255}
                className="form-control"
                placeholder="e.g. March savings transfer"
                value={form.description}
                onChange={update('description')}
              />
            )}

            {fieldErrors.description ? (
              <div className="ss-field-error">
                {fieldErrors.description}
              </div>
            ) : null}

            {isRequestModal ? (
              <p className="ss-muted mt-2 mb-0">
                A reviewer checks the reason and your balances. If it is
                approved, the amount moves from savings back to your simulated
                bank. If not, you will see the reviewer's note.
              </p>
            ) : null}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel this withdrawal request?"
        message={
          cancelTarget
            ? `The request for ${formatCurrency(
                cancelTarget.amount,
              )} will be removed. No money has moved, so nothing else changes.`
            : ''
        }
        confirmLabel="Cancel request"
        busy={cancelling}
        onConfirm={handleCancelRequest}
        onClose={() => {
          if (!cancelling) {
            setCancelTarget(null);
          }
        }}
      />
    </>
  );
}
