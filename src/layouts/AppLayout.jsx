import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { initials } from '../utils/format.js';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'bi-grid-1x2-fill', end: true },
  { to: '/expenses', label: 'Expenses', icon: 'bi-receipt' },
  { to: '/salary', label: 'Salary', icon: 'bi-cash-stack' },
  { to: '/savings', label: 'Savings', icon: 'bi-piggy-bank' },
  { to: '/bank', label: 'Bank account', icon: 'bi-bank' },
  { to: '/goals', label: 'Goals', icon: 'bi-bullseye' },
  { to: '/insights', label: 'Insights', icon: 'bi-graph-up-arrow' },
  { to: '/profile', label: 'Profile', icon: 'bi-person-gear' },
];

const REVIEWER_NAV_ITEM = {
  to: '/approvals',
  label: 'Approvals',
  icon: 'bi-shield-check',
};

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/expenses': 'Expenses',
  '/salary': 'Salary',
  '/savings': 'Savings accounts',
  '/bank': 'Simulated bank account',
  '/goals': 'Savings goals',
  '/insights': 'Insights',
  '/approvals': 'Withdrawal approvals',
  '/profile': 'Profile',
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems =
    user?.role === 'ADMIN'
      ? [...NAV_ITEMS, REVIEWER_NAV_ITEM]
      : NAV_ITEMS;

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="ss-shell">
      <aside className={`ss-sidebar${menuOpen ? ' is-open' : ''}`}>
        <div className="ss-brand">
          <span className="ss-brand-mark">
            <i className="bi bi-safe2-fill" aria-hidden="true" />
          </span>
          <span className="ss-brand-text">
            <strong>SaveSmart</strong>
            <small>Your Money, Your Future</small>
          </span>
        </div>

        <nav className="ss-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `ss-nav-link${isActive ? ' active' : ''}`
              }
            >
              <i className={`bi ${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ss-sidebar-note">
          <i className="bi bi-shield-lock-fill" aria-hidden="true" />
          <strong>Simulated banking</strong>
          <p>
            Saving debits your simulated bank. Withdrawals are reviewed before
            any money moves. No real bank is connected.
          </p>
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="ss-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="ss-main">
        <header className="ss-topbar">
          <button
            type="button"
            className="btn-icon ss-menu-toggle"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
          >
            <i className="bi bi-list" aria-hidden="true" />
          </button>

          <div className="ss-topbar-title">
            <span>{PAGE_TITLES[location.pathname] ?? 'SaveSmart'}</span>
          </div>

          <div className="ss-topbar-user">
            <div className="ss-avatar" aria-hidden="true">
              {initials(user?.fullName)}
            </div>
            <div className="ss-topbar-user-text">
              <strong>{user?.fullName ?? 'SaveSmart user'}</strong>
              <span>{user?.email}</span>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
            >
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="ss-content">
          <Outlet />
        </main>

        <footer className="ss-footer">
          SaveSmart · demo project · all savings balances are simulated
        </footer>
      </div>
    </div>
  );
}
