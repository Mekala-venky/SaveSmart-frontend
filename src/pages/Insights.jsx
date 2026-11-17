import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import EmptyState from '../components/EmptyState.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PageLoader from '../components/PageLoader.jsx';
import StatCard from '../components/StatCard.jsx';
import {
  dashboardApi,
  extractErrorMessage,
  insightsApi,
} from '../services/api.js';
import { formatCurrency, formatPercent } from '../utils/format.js';

const SEVERITY_META = {
  SUCCESS: { icon: 'bi-check-circle-fill', label: 'On track', tone: 'success' },
  INFO: { icon: 'bi-info-circle-fill', label: 'Tip', tone: 'info' },
  WARNING: {
    icon: 'bi-exclamation-triangle-fill',
    label: 'Attention',
    tone: 'warning',
  },
};

function scoreColor(score) {
  if (score >= 80) {
    return '#0f766e';
  }

  if (score >= 60) {
    return '#14b8a6';
  }

  if (score >= 40) {
    return '#f59e0b';
  }

  return '#e11d48';
}

function ratingTone(rating) {
  switch (rating) {
    case 'Excellent':
      return 'success';
    case 'Good':
      return 'info';
    case 'Fair':
      return 'info';
    case 'Needs attention':
      return 'warning';
    default:
      return 'muted';
  }
}

function compactAxis(value) {
  const amount = Number(value ?? 0);

  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }

  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}k`;
  }

  return `₹${amount}`;
}

export default function Insights() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [insights, setInsights] = useState(null);
  const [yearly, setYearly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [error, setError] = useState('');
  const [yearlyError, setYearlyError] = useState('');

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await insightsApi.get();
      setInsights(data);
    } catch (requestError) {
      setError(
        extractErrorMessage(requestError, 'We could not load your insights.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadYearly = useCallback(async (selectedYear) => {
    setYearlyLoading(true);
    setYearlyError('');

    try {
      const data = await dashboardApi.getYearly({ year: selectedYear });
      setYearly(data);
    } catch (requestError) {
      setYearlyError(
        extractErrorMessage(
          requestError,
          'We could not load your yearly analysis.',
        ),
      );
    } finally {
      setYearlyLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  useEffect(() => {
    loadYearly(year);
  }, [year, loadYearly]);

  const years = useMemo(
    () => [currentYear - 2, currentYear - 1, currentYear],
    [currentYear],
  );

  const chartData = useMemo(
    () =>
      (yearly?.months ?? []).map((month) => ({
        month: month.monthName.slice(0, 3),
        expenses: Number(month.totalExpenses),
        netSaved: Number(month.netSaved),
      })),
    [yearly],
  );

  const gaugeData = useMemo(
    () => [
      {
        name: 'Health score',
        value: Number(insights?.healthScore ?? 0),
        fill: scoreColor(Number(insights?.healthScore ?? 0)),
      },
    ],
    [insights],
  );

  return (
    <>
      <PageHeader
        eyebrow="Analysis"
        title="Insights"
        description="A monthly health check built from your salary, spending, savings and goals."
        actions={
          <button
            type="button"
            className="btn btn-light"
            onClick={loadInsights}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Refresh
          </button>
        }
      />

      <InlineAlert tone="danger" onClose={() => setError('')}>
        {error}
      </InlineAlert>

      {loading ? (
        <PageLoader label="Scoring your finances…" />
      ) : !insights ? (
        <EmptyState
          icon="bi-graph-up"
          title="Insights unavailable"
          description="Add salary and expenses, then refresh to see your health score."
          action={
            <button type="button" className="btn btn-primary" onClick={loadInsights}>
              Try again
            </button>
          }
        />
      ) : (
        <>
          <div className="row g-3 g-xl-4">
            <div className="col-12 col-lg-5">
              <section className="ss-card score-card h-100">
                <div className="ss-card-head">
                  <div>
                    <h2>Financial health score</h2>
                    <p>0–100 based on your current habits</p>
                  </div>
                  <span
                    className={`badge-soft badge-${ratingTone(insights.rating)}`}
                  >
                    {insights.rating}
                  </span>
                </div>

                <div className="score-gauge">
                  <ResponsiveContainer width="100%" height={230}>
                    <RadialBarChart
                      innerRadius="74%"
                      outerRadius="100%"
                      data={gaugeData}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis
                        type="number"
                        domain={[0, 100]}
                        tick={false}
                      />
                      <RadialBar
                        dataKey="value"
                        fill={scoreColor(Number(insights.healthScore ?? 0))}
                        background={{ fill: '#e2e8f0' }}
                        cornerRadius={20}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>

                  <div className="score-gauge-center">
                    <strong>{insights.healthScore}</strong>
                    <span>out of 100</span>
                  </div>
                </div>

                <div className="score-summary">
                  <div>
                    <span>Savings rate</span>
                    <strong>{formatPercent(insights.savingsRate)}</strong>
                  </div>
                  <div>
                    <span>Insights</span>
                    <strong>{insights.insights.length}</strong>
                  </div>
                </div>
              </section>
            </div>

            <div className="col-12 col-lg-7">
              <section className="ss-card h-100">
                <div className="ss-card-head">
                  <div>
                    <h2>What to focus on</h2>
                    <p>Prioritised suggestions from your current month</p>
                  </div>
                </div>

                {insights.insights.length === 0 ? (
                  <EmptyState
                    icon="bi-check2-circle"
                    title="Nothing to flag"
                    description="Keep tracking your salary and expenses for fresh insights."
                  />
                ) : (
                  <ul className="insight-list">
                    {insights.insights.map((insight, index) => {
                      const meta =
                        SEVERITY_META[insight.severity] ?? SEVERITY_META.INFO;

                      return (
                        <li
                          key={`${insight.title}-${index}`}
                          className={`insight-item insight-${meta.tone}`}
                        >
                          <span className="insight-icon">
                            <i className={`bi ${meta.icon}`} aria-hidden="true" />
                          </span>
                          <div>
                            <div className="insight-head">
                              <strong>{insight.title}</strong>
                              <span className={`badge-soft badge-${meta.tone}`}>
                                {meta.label}
                              </span>
                            </div>
                            <p>{insight.message}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>

          <section className="ss-card mt-3 mt-xl-4">
            <div className="ss-card-head">
              <div>
                <h2>Yearly analysis · {year}</h2>
                <p>Monthly expenses compared with net saved</p>
              </div>
              <select
                className="form-select form-select-sm year-select"
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

            <InlineAlert tone="danger" onClose={() => setYearlyError('')}>
              {yearlyError}
            </InlineAlert>

            {yearly ? (
              <>
                <div className="row g-3 mb-3">
                  <div className="col-6 col-lg-3">
                    <div className="mini-stat">
                      <span>Total expenses</span>
                      <strong>{formatCurrency(yearly.totalExpenses)}</strong>
                    </div>
                  </div>
                  <div className="col-6 col-lg-3">
                    <div className="mini-stat">
                      <span>Total deposits</span>
                      <strong>{formatCurrency(yearly.totalDeposits)}</strong>
                    </div>
                  </div>
                  <div className="col-6 col-lg-3">
                    <div className="mini-stat">
                      <span>Total withdrawals</span>
                      <strong>{formatCurrency(yearly.totalWithdrawals)}</strong>
                    </div>
                  </div>
                  <div className="col-6 col-lg-3">
                    <div className="mini-stat">
                      <span>Net saved · {formatPercent(yearly.savingsPercentage)}</span>
                      <strong>{formatCurrency(yearly.netSaved)}</strong>
                    </div>
                  </div>
                </div>

                {yearlyLoading ? (
                  <PageLoader label="Loading yearly chart…" />
                ) : (
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        barGap={6}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                        />
                        <YAxis
                          tickFormatter={compactAxis}
                          tickLine={false}
                          axisLine={false}
                          width={62}
                          fontSize={12}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          cursor={{ fill: 'rgba(15, 118, 110, 0.06)' }}
                        />
                        <Legend iconType="circle" />
                        <Bar
                          dataKey="expenses"
                          name="Expenses"
                          fill="#f59e0b"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="netSaved"
                          name="Net saved"
                          fill="#0f766e"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="ss-footnote mt-3">
                  <i className="bi bi-info-circle" aria-hidden="true" />
                  Yearly analysis annualises your current monthly salary × 12,
                  since SaveSmart stores a single current salary.
                </div>
              </>
            ) : yearlyError ? (
              <EmptyState
                icon="bi-bar-chart"
                title="Chart unavailable"
                description="Try refreshing the yearly analysis."
                action={
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => loadYearly(year)}
                  >
                    Retry
                  </button>
                }
              />
            ) : (
              <PageLoader label="Loading yearly analysis…" />
            )}
          </section>
        </>
      )}
    </>
  );
}
