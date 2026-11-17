import { useCallback, useEffect, useState } from 'react';

import EmptyState from '../components/EmptyState.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PageLoader from '../components/PageLoader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { extractErrorMessage, withdrawalApi } from '../services/api.js';
import { accountMeta, formatCurrency, formatDateTime } from '../utils/format.js';

const STATUS_META = {
  PENDING: { label: 'Pending review', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};

const FILTERS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
];

function statusMeta(status) {
  return (
    STATUS_META[status] ?? { label: status, tone: 'muted' }
  );
}

export default function Approvals() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [status, setStatus] = useState('PENDING');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [decision, setDecision] = useState(null); // { request, action }
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await withdrawalApi.reviewQueue(status);
      setRequests(data);
    } catch (requestError) {
      setError(
        extractErrorMessage(
          requestError,
          'We could not load the withdrawal review queue.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [status, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const openDecision = (request, action) => {
    setDecision({ request, action });
    setNote('');
    setFormError('');
  };

  const closeDecision = () => {
    if (submitting) {
      return;
    }

    setDecision(null);
    setFormError('');
  };

  const submitDecision = async (event) => {
    event.preventDefault();

    if (!decision) {
      return;
    }

    const trimmed = note.trim();

    if (decision.action === 'reject' && !trimmed) {
      setFormError('Explain why the request is rejected so the user understands.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      if (decision.action === 'approve') {
        await withdrawalApi.approve(decision.request.id, {
          ...(trimmed ? { reviewerNote: trimmed } : {}),
        });

        setSuccess(
          `Approved ${formatCurrency(
            decision.request.amount,
          )} for ${decision.request.requesterName}. Money moved to their simulated bank account.`,
        );
      } else {
        await withdrawalApi.reject(decision.request.id, {
          reviewerNote: trimmed,
        });

        setSuccess(
          `Rejected the ${formatCurrency(
            decision.request.amount,
          )} request from ${decision.request.requesterName}. No money moved.`,
        );
      }

      setDecision(null);
      await load();
    } catch (requestError) {
      setFormError(
        extractErrorMessage(
          requestError,
          'We could not record that decision.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <>
        <PageHeader
          eyebrow="Restricted"
          title="Withdrawal approvals"
          description="Only the reviewer account can inspect and decide withdrawal requests."
        />

        <section className="ss-card">
          <EmptyState
            icon="bi-shield-lock"
            title="Reviewer access required"
            description="Sign in with the reviewer account to approve or reject withdrawal requests. Ask the project owner for the reviewer credentials."
          />
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Reviewer queue"
        title="Withdrawal approvals"
        description="Read the reason, check the balance impact and any risk hints, then approve or reject. Money moves only on approval."
      />

      <InlineAlert tone="danger" onClose={() => setError('')}>
        {error}
      </InlineAlert>
      <InlineAlert tone="success" onClose={() => setSuccess('')}>
        {success}
      </InlineAlert>

      <div className="filter-bar">
        <div className="btn-group" role="group" aria-label="Filter requests">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`btn btn-sm ${
                status === filter.value ? 'btn-primary' : 'btn-light'
              }`}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-sm btn-light ms-auto"
          onClick={load}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Refresh
        </button>
      </div>

      {loading ? (
        <PageLoader label="Loading withdrawal requests…" />
      ) : requests.length === 0 ? (
        <section className="ss-card">
          <EmptyState
            icon="bi-inbox"
            title={
              status === 'PENDING'
                ? 'No requests waiting for review'
                : 'Nothing to show for this filter'
            }
            description={
              status === 'PENDING'
                ? 'New withdrawal requests will appear here for review.'
                : 'Try another status filter to see reviewed requests.'
            }
          />
        </section>
      ) : (
        <div className="request-list">
          {requests.map((request) => {
            const meta = statusMeta(request.status);
            const account = accountMeta(request.accountType);
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
                        from {account.label}
                      </small>
                    </h3>
                    <p className="request-meta">
                      {request.requesterName} · {request.requesterEmail} ·
                      requested {formatDateTime(request.createdAt)}
                    </p>
                  </div>
                  <div className="request-balance">
                    <span>Balance after withdrawal</span>
                    <strong>
                      {request.remainingBalance != null
                        ? formatCurrency(request.remainingBalance)
                        : '—'}
                    </strong>
                  </div>
                </div>

                <p className="request-reason">
                  <strong>Reason:</strong> {request.description}
                </p>

                {request.riskFlags?.length > 0 ? (
                  <ul className="risk-flags">
                    {request.riskFlags.map((flag) => (
                      <li key={flag}>
                        <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="request-ok">
                    <i className="bi bi-check-circle" aria-hidden="true" /> No
                    unusual patterns detected.
                  </p>
                )}

                {!isPending ? (
                  <div className="request-review">
                    <span>
                      <strong>
                        {request.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                      </strong>{' '}
                      by {request.reviewedBy ?? 'reviewer'} ·{' '}
                      {formatDateTime(request.reviewedAt)}
                    </span>
                    {request.reviewerNote ? (
                      <span>Note: {request.reviewerNote}</span>
                    ) : null}
                  </div>
                ) : (
                  <div className="request-actions">
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => openDecision(request, 'reject')}
                    >
                      <i className="bi bi-x-lg" aria-hidden="true" /> Reject
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => openDecision(request, 'approve')}
                    >
                      <i className="bi bi-check2" aria-hidden="true" /> Approve
                      withdrawal
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(decision)}
        title={
          decision?.action === 'approve'
            ? 'Approve this withdrawal?'
            : 'Reject this withdrawal?'
        }
        subtitle={
          decision
            ? `${decision.request.requesterName} · ${formatCurrency(
                decision.request.amount,
              )} from ${accountMeta(decision.request.accountType).label}`
            : ''
        }
        onClose={closeDecision}
        footer={
          <>
            <button
              type="button"
              className="btn btn-light"
              onClick={closeDecision}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="review-form"
              className={`btn ${
                decision?.action === 'approve' ? 'btn-primary' : 'btn-danger'
              }`}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Recording…
                </>
              ) : decision?.action === 'approve' ? (
                'Approve and move money'
              ) : (
                'Reject request'
              )}
            </button>
          </>
        }
      >
        <InlineAlert tone="danger" onClose={() => setFormError('')}>
          {formError}
        </InlineAlert>

        <form id="review-form" onSubmit={submitDecision} noValidate>
          {decision?.action === 'approve' ? (
            <p className="ss-muted">
              This moves {formatCurrency(decision.request.amount)} out of the
              user&apos;s savings and back into their simulated bank account. It
              cannot be undone.
            </p>
          ) : (
            <p className="ss-muted">
              No money will move. The user will see your note, so explain what
              was missing or why the request cannot be approved.
            </p>
          )}

          <div>
            <label className="form-label" htmlFor="review-note">
              Reviewer note{' '}
              <span className="label-optional">
                {decision?.action === 'reject' ? 'required' : 'optional'}
              </span>
            </label>
            <textarea
              id="review-note"
              rows={3}
              maxLength={255}
              className={`form-control${formError ? ' is-invalid' : ''}`}
              placeholder={
                decision?.action === 'approve'
                  ? 'e.g. Verified the hospital bill'
                  : 'e.g. Please add a bill or use your emergency fund for this'
              }
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
