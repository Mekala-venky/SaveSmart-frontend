const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrWithPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('en-IN');

/** Format an amount as Indian rupees. Pass `true` to keep paise. */
export function formatCurrency(value, withPaise = false) {
  const amount = Number(value ?? 0);

  if (Number.isNaN(amount)) {
    return '—';
  }

  return withPaise ? inrWithPaise.format(amount) : inr.format(amount);
}

export function formatNumber(value) {
  const amount = Number(value ?? 0);
  return Number.isNaN(amount) ? '—' : numberFormatter.format(amount);
}

/** Parse an ISO date (yyyy-mm-dd) or datetime without timezone surprises. */
function parseDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const text = String(value);
  const datePart = text.slice(0, 10).split('-').map(Number);

  if (datePart.length === 3 && datePart.every((part) => !Number.isNaN(part))) {
    return new Date(datePart[0], datePart[1] - 1, datePart[2]);
  }

  return new Date(text);
}

export function formatDate(value) {
  const date = parseDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  const date = parseDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPercent(value, digits = 1) {
  const amount = Number(value ?? 0);
  return Number.isNaN(amount) ? '—' : `${amount.toFixed(digits)}%`;
}

export const MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
].map((label, index) => ({ value: index + 1, label }));

export function monthName(month) {
  return MONTH_OPTIONS.find((option) => option.value === Number(month))?.label ?? '';
}

export const CATEGORY_OPTIONS = [
  'Rent',
  'Groceries',
  'Food & Dining',
  'Transport',
  'Utilities',
  'Health',
  'Education',
  'Entertainment',
  'Shopping',
  'Travel',
  'Investments',
  'Other',
];

export const CHART_COLORS = [
  '#0f766e',
  '#14b8a6',
  '#f59e0b',
  '#6366f1',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#06b6d4',
  '#8b5cf6',
  '#ef4444',
  '#64748b',
  '#eab308',
];

export function categoryColor(category) {
  const index = CATEGORY_OPTIONS.indexOf(category);
  return CHART_COLORS[(index < 0 ? 0 : index) % CHART_COLORS.length];
}

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function futureISO(daysFromNow = 30) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function daysUntil(value) {
  const target = parseDate(value);

  if (!target) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function initials(name) {
  if (!name) {
    return 'SS';
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export const ACCOUNT_TYPES = [
  {
    value: 'FUTURE_SAVINGS',
    label: 'Future Savings',
    icon: 'bi-piggy-bank',
    description: 'Money you are putting aside for future plans.',
    tone: 'teal',
  },
  {
    value: 'EMERGENCY_FUND',
    label: 'Emergency Fund',
    icon: 'bi-shield-check',
    description: 'A safety net for unexpected expenses.',
    tone: 'amber',
  },
];

export function accountMeta(type) {
  return (
    ACCOUNT_TYPES.find((account) => account.value === type) ?? {
      value: type,
      label: type,
      icon: 'bi-wallet2',
      description: 'Savings account',
      tone: 'teal',
    }
  );
}

export function goalStatus(goal) {
  const progress = Number(goal?.progressPercentage ?? 0);
  const days = daysUntil(goal?.targetDate);

  if (progress >= 100) {
    return { label: 'Achieved', tone: 'success' };
  }

  if (days !== null && days < 0) {
    return { label: 'Overdue', tone: 'danger' };
  }

  if (days !== null && days <= 30) {
    return { label: `${days} day${days === 1 ? '' : 's'} left`, tone: 'warning' };
  }

  return {
    label: days !== null ? `${days} days left` : 'In progress',
    tone: 'info',
  };
}
