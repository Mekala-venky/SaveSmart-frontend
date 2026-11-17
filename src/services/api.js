import axios from 'axios';

const TOKEN_KEY = 'savesmart.token';
const USER_KEY = 'savesmart.user';

export const tokenStore = {
  get() {
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

export const userStore = {
  get() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(USER_KEY);
  },
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';

    // Only an expired/invalid session should sign the user out. A failed
    // login attempt must stay on the login screen with an inline error.
    if (status === 401 && !url.includes('/auth/login')) {
      tokenStore.clear();
      userStore.clear();
      window.dispatchEvent(new Event('savesmart:unauthorized'));
    }

    return Promise.reject(error);
  },
);

/** Resolve an Axios error into a message that is safe to show to the user. */
export function extractErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (error?.code === 'ECONNABORTED') {
    return 'The request took too long. Check your connection and try again.';
  }

  if (!error?.response) {
    return 'Cannot reach the SaveSmart API. Make sure the backend is running.';
  }

  const data = error.response.data;

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
    const first = Object.values(data.fieldErrors)[0];

    if (first) {
      return first;
    }
  }

  if (data?.message) {
    return data.message;
  }

  if (typeof data?.error === 'string' && data.error !== 'Bad Request') {
    return data.error;
  }

  switch (error.response.status) {
    case 400:
      return 'The request was not valid. Please review the values and try again.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'We could not find what you were looking for.';
    case 409:
      return 'That record already exists.';
    default:
      return fallback;
  }
}

const data = (request) => request.then((response) => response.data);

export const authApi = {
  register: (payload) => data(api.post('/auth/register', payload)),
  login: (payload) => data(api.post('/auth/login', payload)),
};

export const userApi = {
  getProfile: () => data(api.get('/users/profile')),
  updateProfile: (payload) => data(api.put('/users/profile', payload)),
};

export const salaryApi = {
  get: () => data(api.get('/salary')),
  create: (payload) => data(api.post('/salary', payload)),
  update: (payload) => data(api.put('/salary', payload)),
};

export const expenseApi = {
  list: () => data(api.get('/expenses')),
  create: (payload) => data(api.post('/expenses', payload)),
  update: (expenseId, payload) =>
    data(api.put(`/expenses/${expenseId}`, payload)),
  remove: (expenseId) => data(api.delete(`/expenses/${expenseId}`)),
};

export const savingsApi = {
  getAccounts: () => data(api.get('/savings/accounts')),
  createAccount: (payload) =>
    data(api.post('/savings/accounts', payload)),
  getTransactions: (accountId) =>
    data(api.get(`/savings/accounts/${accountId}/transactions`)),
  deposit: (accountId, payload) =>
    data(api.post(`/savings/accounts/${accountId}/transactions/deposit`, payload)),
};

/**
 * Secured withdrawals. A request only moves money after a reviewer approves
 * it, so the user never calls a direct withdraw endpoint.
 */
export const withdrawalApi = {
  create: (payload) => data(api.post('/savings/withdrawal-requests', payload)),
  list: () => data(api.get('/savings/withdrawal-requests')),
  cancel: (requestId) =>
    data(api.delete(`/savings/withdrawal-requests/${requestId}`)),
  reviewQueue: (status = 'PENDING') =>
    data(
      api.get('/savings/withdrawal-requests/review', {
        params: status && status !== 'ALL' ? { status } : {},
      }),
    ),
  approve: (requestId, payload = {}) =>
    data(
      api.post(
        `/savings/withdrawal-requests/review/${requestId}/approve`,
        payload,
      ),
    ),
  reject: (requestId, payload) =>
    data(
      api.post(
        `/savings/withdrawal-requests/review/${requestId}/reject`,
        payload,
      ),
    ),
};

export const bankApi = {
  getAccount: () => data(api.get('/bank/account')),
  createAccount: (payload) => data(api.post('/bank/account', payload)),
  deposit: (payload) => data(api.post('/bank/account/deposit', payload)),
  withdraw: (payload) => data(api.post('/bank/account/withdraw', payload)),
  getTransactions: () => data(api.get('/bank/transactions')),
};

export const goalApi = {
  list: () => data(api.get('/savings/goals')),
  get: (goalId) => data(api.get(`/savings/goals/${goalId}`)),
  create: (payload) => data(api.post('/savings/goals', payload)),
  update: (goalId, payload) =>
    data(api.put(`/savings/goals/${goalId}`, payload)),
  addMoney: (goalId, amount) =>
    data(api.post(`/savings/goals/${goalId}/add-money`, { amount })),
  remove: (goalId) => data(api.delete(`/savings/goals/${goalId}`)),
};

export const dashboardApi = {
  get: (params) => data(api.get('/dashboard', { params })),
  getMonthly: (params) => data(api.get('/dashboard/monthly', { params })),
  getYearly: (params) => data(api.get('/dashboard/yearly', { params })),
};

export const insightsApi = {
  get: () => data(api.get('/insights')),
};

export default api;
