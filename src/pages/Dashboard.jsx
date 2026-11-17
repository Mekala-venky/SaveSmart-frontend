import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import EmptyState from '../components/EmptyState.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PageLoader from '../components/PageLoader.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import StatCard from '../components/StatCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardApi, extractErrorMessage } from '../services/api.js';
import {
  CHART_COLORS,
  MONTH_OPTIONS,
  accountMeta,
  formatCurrency,
  formatDate,
  formatPercent,
  monthName,
} from '../utils/format.js';

const now = new Date();

function rateTone(rate) {
  if (rate >= 20) {
    return 'success';
  }

  if (rate >= 10) {
    return 'warning';
  }

  return 'danger';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await dashboardApi.get({ month, year });
      setDashboard(data);
    } catch (requestError) {
      setError(
        extractErrorMessage(requestError, 'We could not load your dashboard.'),
      );
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 3, current - 2, current - 1, current].filter(
      (value, index, list) => list.indexOf(value) === index,
    );
  }, []);

  const categoryData = useMemo(
    () =>
      (dashboard?.expensesByCategory ?? []).map((entry) => ({
        name: entry.category,
        value: Number(entry.amount),
        percentage: entry.percentage,
      })),
    [dashboard],
  );

  const firstName = user?.fullName?.split(' ')[0] || 'there';
  const salaryConfigured = dashboard?.salaryConfigured;
  const rate = Number(dashboard?.savingsPercentage ?? 0);
  const emergencyMonths =
    dashboard && dashboard.totalExpenses > 0
      ? dashboard.emergencyFundBalance / dashboard.totalExpenses
      : 0;
  const goalRatio =
    dashboard && dashboard.totalGoals > 0
      ? (dashboard.achievedGoals / dashboard.totalGoals) * 100
      : 0;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`Hello, ${firstName}`}
        description="Here is how your money is moving this month."
        actions={
          <div className="period-picker">
            <select
              className="form-select"
              aria-label="Month"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              aria-label="Year"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {years.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <InlineAlert tone="danger" onClose={() => setError('')}>
        {error}
      </InlineAlert>

      {loading ? (
        <PageLoader label="Loading your dashboard…" />
      ) : !dashboard ? (
        <EmptyState
          icon="bi-cloud-slash"
          title="Dashboard unavailable"
          description="We could not load your dashboard. Try again in a moment."
          action={
            <button type="button" className="btn btn-primary" onClick={load}>
              Retry
            </button>
          }
        />
      ) : (
        <>
          {!salaryConfigured ? (
            <div className="setup-banner">
              <div className="setup-banner-icon">
                <i className="bi bi-cash-coin" aria-hidden="true" />
              </div>
              <div>
                <strong>Add your monthly salary to unlock insights</strong>
                <p>
                  SaveSmart uses your salary to calculate your savings rate and
                  monthly available amount.
                </p>
              </div>
              <Link to="/salary" className="btn btn-primary">
                Add salary
              </Link>
            </div>
          ) : null}

          <div className="row g-3 g-xl-4">
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                icon="bi-cash-stack"
                label="Monthly salary"
                value={formatCurrency(dashboard.monthlySalary)}
                hint={`${monthName(dashboard.month)} ${dashboard.year}`}
                tone="teal"
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                icon="bi-receipt"
                label="Spent this month"
                value={formatCurrency(dashboard.totalExpenses)}
                hint={
                  categoryData.length > 0
                    ? `${categoryData.length} categor${
                        categoryData.length === 1 ? 'y' : 'ies'
                      }`
                    : 'No expenses yet'
                }
                tone="rose"
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                icon="bi-wallet2"
                label="Available to save"
                value={formatCurrency(dashboard.availableAmount)}
                hint={
                  salaryConfigured
                    ? `${formatPercent(rate)} of salary`
                    : 'Add salary to calculate'
                }
                tone="indigo"
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                icon="bi-piggy-bank"
                label="Net saved this month"
                value={formatCurrency(dashboard.netSavedThisMonth)}
                hint="Deposits minus withdrawals"
                tone="amber"
              />
            </div>
          </div>

          <div className="row g-3 g-xl-4 mt-1">
            <div className="col-12 col-xl-7">
              <section className="ss-card h-100">
                <div className="ss-card-head">
                  <div>
                    <h2>Spending by category</h2>
                    <p>
                      {monthName(dashboard.month)} {dashboard.year} ·{' '}
                      {formatCurrency(dashboard.totalExpenses)} total
                    </p>
                  </div>
                  <Link to="/expenses" className="btn btn-sm btn-light">
                    Manage expenses
                  </Link>
                </div>

                {categoryData.length === 0 ? (
                  <EmptyState
                    icon="bi-pie-chart"
                    title="No expenses recorded"
                    description="Add your first expense for this month to see the category split."
                    action={
                      <Link to="/expenses" className="btn btn-primary">
                        Add an expense
                      </Link>
                    }
                  />
                ) : (
                  <div className="row align-items-center g-3">
                    <div className="col-12 col-md-6">
                      <div className="donut-wrapper">
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={categoryData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={68}
                              outerRadius={100}
                              paddingAngle={3}
                            >
                              {categoryData.map((entry, index) => (
                                <Cell
                                  key={entry.name}
                                  fill={
                                    CHART_COLORS[index % CHART_COLORS.length]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => formatCurrency(value)}
                            />
                          </PieChart>
                        </ResponsiveContainer>

                        <div className="donut-center">
                          <span>Total</span>
                          <strong>
                            {formatCurrency(dashboard.totalExpenses)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <ul className="category-legend">
                        {categoryData.map((entry, index) => (
                          <li key={entry.name}>
                            <span
                              className="legend-dot"
                              style={{
                                background:
                                  CHART_COLORS[index % CHART_COLORS.length],
                              }}
                            />
                            <span className="legend-name">{entry.name}</span>
                            <span className="legend-amount">
                              {formatCurrency(entry.value)}
                            </span>
                            <span className="legend-percent">
                              {formatPercent(entry.percentage, 0)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="col-12 col-xl-5 d-flex flex-column gap-3 gap-xl-4">
              <section className="ss-card">
                <div className="ss-card-head">
                  <div>
                    <h2>Savings & bank</h2>
                    <p>Simulated balances across your accounts</p>
                  </div>
                  <Link to="/bank" className="btn btn-sm btn-light">
                    Bank
                  </Link>
                </div>

                <div className="balance-total">
                  <span>Total saved</span>
                  <strong>{formatCurrency(dashboard.totalSavingsBalance)}</strong>
                </div>

                <div className="account-mini-list">
                  <div className="account-mini">
                    <span className="account-mini-icon teal">
                      <i className="bi bi-piggy-bank" aria-hidden="true" />
                    </span>
                    <div>
                      <span>Future savings</span>
                      <strong>
                        {formatCurrency(dashboard.futureSavingsBalance)}
                      </strong>
                    </div>
                  </div>
                  <div className="account-mini">
                    <span className="account-mini-icon amber">
                      <i className="bi bi-shield-check" aria-hidden="true" />
                    </span>
                    <div>
                      <span>Emergency fund</span>
                      <strong>
                        {formatCurrency(dashboard.emergencyFundBalance)}
                      </strong>
                    </div>
                  </div>
                  <div className="account-mini">
                    <span className="account-mini-icon teal">
                      <i className="bi bi-bank" aria-hidden="true" />
                    </span>
                    <div>
                      <span>Simulated bank balance</span>
                      <strong>{formatCurrency(dashboard.bankBalance)}</strong>
                    </div>
                  </div>
                </div>

                <div className="ss-footnote">
                  <i className="bi bi-info-circle" aria-hidden="true" />
                  {emergencyMonths > 0
                    ? `Your emergency fund covers about ${emergencyMonths.toFixed(
                        1,
                      )} month${
                        emergencyMonths === 1 ? '' : 's'
                      } of this month's expenses.`
                    : 'Add expenses and an emergency fund to see your coverage.'}
                </div>
              </section>

              <section className="ss-card">
                <div className="ss-card-head">
                  <div>
                    <h2>This month's savings rate</h2>
                    <p>Share of salary left after expenses</p>
                  </div>
                  <Link to="/insights" className="btn btn-sm btn-light">
                    Insights
                  </Link>
                </div>

                <div className="rate-block">
                  <div className="rate-value">
                    <strong>{formatPercent(rate)}</strong>
                    <span
                      className={`badge-soft badge-${rateTone(rate)}`}
                    >
                      {rate >= 20
                        ? 'On track'
                        : rate >= 10
                          ? 'Getting there'
                          : salaryConfigured
                            ? 'Needs attention'
                            : 'No salary yet'}
                    </span>
                  </div>
                  <ProgressBar value={rate} tone={rateTone(rate)} />
                  <p className="ss-muted">
                    {salaryConfigured
                      ? `You kept ${formatCurrency(
                          dashboard.availableAmount,
                        )} of your ${formatCurrency(
                          dashboard.monthlySalary,
                        )} salary this month.`
                      : 'Add your salary to start tracking your savings rate.'}
                  </p>
                </div>
              </section>

              <section className="ss-card">
                <div className="ss-card-head">
                  <div>
                    <h2>Savings goals</h2>
                    <p>
                      {dashboard.achievedGoals} of {dashboard.totalGoals}{' '}
                      achieved
                    </p>
                  </div>
                  <Link to="/goals" className="btn btn-sm btn-light">
                    View goals
                  </Link>
                </div>

                {dashboard.totalGoals === 0 ? (
                  <EmptyState
                    icon="bi-bullseye"
                    title="No goals yet"
                    description="Create a goal like an emergency fund or a holiday."
                    action={
                      <Link to="/goals" className="btn btn-primary btn-sm">
                        Create a goal
                      </Link>
                    }
                  />
                ) : (
                  <div className="rate-block">
                    <div className="rate-value">
                      <strong>{formatPercent(goalRatio, 0)}</strong>
                      <span className="ss-muted">
                        {dashboard.totalGoals - dashboard.achievedGoals} still in
                        progress
                      </span>
                    </div>
                    <ProgressBar value={goalRatio} tone="indigo" />
                  </div>
                )}
              </section>
            </div>
          </div>

          <section className="ss-card mt-3 mt-xl-4">
            <div className="ss-card-head">
              <div>
                <h2>Recent savings activity</h2>
                <p>Your five latest simulated deposits and withdrawals</p>
              </div>
              <Link to="/savings" className="btn btn-sm btn-light">
                All transactions
              </Link>
            </div>

            {dashboard.recentTransactions.length === 0 ? (
              <EmptyState
                icon="bi-arrow-left-right"
                title="No savings activity yet"
                description="Deposit money into a simulated savings account to see it here."
                action={
                  <Link to="/savings" className="btn btn-primary btn-sm">
                    Go to savings
                  </Link>
                }
              />
            ) : (
              <ul className="transaction-list">
                {dashboard.recentTransactions.map((transaction) => {
                  const isDeposit = transaction.transactionType === 'DEPOSIT';
                  const meta = accountMeta(transaction.accountType);

                  return (
                    <li key={transaction.id}>
                      <span
                        className={`transaction-icon ${
                          isDeposit ? 'in' : 'out'
                        }`}
                      >
                        <i
                          className={`bi ${
                            isDeposit ? 'bi-arrow-down-left' : 'bi-arrow-up-right'
                          }`}
                          aria-hidden="true"
                        />
                      </span>
                      <div className="transaction-main">
                        <strong>
                          {isDeposit ? 'Deposit' : 'Withdrawal'} ·{' '}
                          {meta.label}
                        </strong>
                        <span>
                          {transaction.description || 'Savings transfer'} ·{' '}
                          {formatDate(transaction.transactionDate)}
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
          </section>
        </>
      )}
    </>
  );
}
