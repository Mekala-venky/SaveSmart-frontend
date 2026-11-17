# SaveSmart Frontend

React single-page app for the SaveSmart personal finance tracker. It talks to the
SaveSmart Spring Boot API for authentication, salary, expenses, the simulated bank
account, savings accounts, approved withdrawals, savings goals, the dashboard and
insights.

> **Savings and banking are simulated only.** The UI never connects to a bank, never
> reads a real account and never moves real money. Balances, statements, withdrawal
> requests and goal progress are records in the SaveSmart database.

---

## Tech stack

| Concern        | Choice                                              |
| -------------- | --------------------------------------------------- |
| UI library     | React 18                                            |
| Build tool     | Vite 6                                              |
| Routing        | React Router 6                                      |
| HTTP           | Axios (shared client with JWT interceptor)          |
| Styling        | Bootstrap 5 + Bootstrap Icons, custom `global.css`  |
| Charts         | Recharts                                            |
| Icons          | Bootstrap Icons + Lucide React                      |

No Bootstrap JavaScript is loaded — modals, menus and dialogs are plain React
components.

---

## Requirements

- Node.js 20 or later (npm included)
- The SaveSmart backend running at `http://localhost:8080`
- A reachable MySQL database for the backend

---

## Project structure

```
src/
├─ main.jsx                  App bootstrap
├─ App.jsx                   Route table
├─ services/api.js           Axios client, token storage, all API calls
├─ context/AuthContext.jsx   Login state, register/login/logout, session restore
├─ utils/format.js           Currency, date and number formatting
├─ layouts/AppLayout.jsx     Sidebar + top bar shell for signed-in pages
├─ components/               Modal, ConfirmDialog, StatCard, ProgressBar,
│                            EmptyState, InlineAlert, PageHeader, PageLoader,
│                            ProtectedRoute
├─ pages/
│  ├─ Login.jsx
│  ├─ Register.jsx
│  ├─ Dashboard.jsx          Monthly summary, charts, recent transactions, goals
│  ├─ Salary.jsx             Create / update the single current salary
│  ├─ Expenses.jsx           CRUD, filters and category breakdown
│  ├─ Savings.jsx            Accounts, save from bank, withdrawal requests, history
│  ├─ Bank.jsx               Simulated bank balance and statement
│  ├─ Approvals.jsx          Reviewer queue with risk hints, approve / reject
│  ├─ Goals.jsx              Goal CRUD, progress and add-money
│  ├─ Insights.jsx           Health score, savings rate, yearly chart, suggestions
│  ├─ Profile.jsx            View / update name and phone
│  └─ NotFound.jsx
└─ styles/global.css         Theme, layout and component styling
```

---

## Setup

```powershell
cd E:\SaveSmart\SaveSmart-frontend
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

During development Vite proxies `/api` to `http://localhost:8080` (see
`vite.config.js`), so the browser stays on one origin and no CORS setup is needed
locally.

### Environment variables

Copy `.env.example` to `.env` (optional locally):

| Variable            | Default | Purpose                                                        |
| ------------------- | ------- | -------------------------------------------------------------- |
| `VITE_API_BASE_URL` | `/api`  | API root used by Axios. In production use the full backend URL. |

Production example:

```
VITE_API_BASE_URL=https://savesmart-api.onrender.com/api
```

Vite only exposes variables prefixed with `VITE_`, and they are baked in at build
time — rebuild after changing this value.

### Scripts

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with HMR            |
| `npm run build`   | Production build into `dist/`                 |
| `npm run preview` | Serve the built `dist/` locally for a smoke test |

---

## Backend routes used

All requests except register and login send `Authorization: Bearer <token>`. The
token is stored in `localStorage` and attached by the Axios request interceptor; a
`401` response clears the session and returns the user to the login page.

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET` / `PUT /api/users/profile`
- `GET` / `POST` / `PUT /api/salary`
- `GET` / `POST /api/expenses`
- `PUT` / `DELETE /api/expenses/{expenseId}`
- `GET` / `POST /api/savings/accounts`
- `GET /api/savings/accounts/{accountId}/transactions`
- `POST /api/savings/accounts/{accountId}/transactions/deposit`
- `GET` / `POST /api/bank/account`
- `POST /api/bank/account/deposit`
- `POST /api/bank/account/withdraw`
- `GET /api/bank/transactions`
- `GET` / `POST /api/savings/withdrawal-requests`
- `DELETE /api/savings/withdrawal-requests/{requestId}`
- `GET /api/savings/withdrawal-requests/review?status=PENDING` *(ADMIN)*
- `POST /api/savings/withdrawal-requests/review/{requestId}/approve` *(ADMIN)*
- `POST /api/savings/withdrawal-requests/review/{requestId}/reject` *(ADMIN)*
- `GET` / `POST /api/savings/goals`
- `GET` / `PUT` / `DELETE /api/savings/goals/{goalId}`
- `POST /api/savings/goals/{goalId}/add-money`
- `GET /api/dashboard`
- `GET /api/dashboard/monthly`
- `GET /api/dashboard/yearly`
- `GET /api/insights`

Full request/response examples live in
[`../docs/SaveSmart.postman_collection.json`](../docs/SaveSmart.postman_collection.json).

---

## Behaviour notes

- The **Bank account** page sets up the one simulated bank balance and shows its
  statement. It is a duplicate balance for the demo — no real bank is connected.
- **Save money** in Savings debits the simulated bank and credits the savings account.
- **Request withdrawal** only creates a `PENDING` request with a mandatory reason; no
  balance changes. The user sees the status and the reviewer's note, and can cancel
  while it is pending.
- The **Approvals** page appears only for users whose login response has
  `role: "ADMIN"`. It shows each request's reason, remaining balance and automated
  risk hints. Rejecting requires a note; approving re-checks the balance and moves
  money from savings back to the simulated bank.
- The dashboard savings rate is `(monthlySalary − monthlyExpenses) / monthlySalary × 100`
  and shows `0` until a salary exists.
- Net saved is deposits minus approved withdrawals for the selected month.
- Goal contributions only update goal progress; no savings account is debited.
- A goal contribution above the remaining target is rejected by the API and shown
  inline in the form.
- Yearly analysis annualises the current monthly salary × 12 because SaveSmart keeps
  a single current salary.
- Insight ratings from the API (`Excellent`, `Good`, `Fair`, `Needs attention`) map
  to Bootstrap alert colours.

### Reviewer demo account

The backend creates the reviewer at startup. Sign in with
`reviewer@savesmart.app` / `Reviewer123` (override with `SAVESMART_REVIEWER_*`
environment variables on the backend). Tokens issued before a backend restart may
not carry the `ADMIN` role, so sign in again after restarting.

---

## Build and deploy

```powershell
npm run build
```

The output is written to `dist/`. The build warns that the main chunk exceeds
500 kB; that is expected because Recharts is bundled and does not affect
correctness.

### Vercel

1. Import the repository in Vercel.
2. Set **Root Directory** to `SaveSmart-frontend`.
3. Framework preset **Vite**; build command `npm run build`; output `dist`.
4. Add `VITE_API_BASE_URL` pointing at the deployed backend, including the `/api`
   suffix.
5. Deploy. `vercel.json` rewrites every path to `index.html`, so refreshing
   `/goals`, `/insights` and other client-side routes works.
6. Add the exact Vercel domain to the backend's `CORS_ALLOWED_ORIGINS` and restart
   the backend.

### Static hosting elsewhere

Upload `dist/` to any static host and configure an SPA fallback so unknown paths
serve `index.html`.

---

## Troubleshooting

| Symptom                                        | Fix                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| "Cannot reach the SaveSmart API"               | Start the backend on port 8080, or set `VITE_API_BASE_URL` and rebuild.          |
| Every request returns `401`                    | Log in again — the token may be expired or signed with an older `JWT_SECRET`.    |
| CORS error in the browser console              | Add the frontend origin to the backend's `CORS_ALLOWED_ORIGINS`.                 |
| Blank page after refresh on the deployed site  | Make sure the SPA rewrite/fallback to `index.html` is active.                    |
| Environment change has no effect               | `VITE_*` values are compile-time; restart `npm run dev` or rebuild.              |

## Disclaimer

SaveSmart is an educational/demo project. It does not connect to real bank accounts
and does not move real money. Do not use it to store banking credentials, and do not
treat its calculations as financial advice.
