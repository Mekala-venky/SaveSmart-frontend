import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Approvals from './pages/Approvals.jsx';
import Bank from './pages/Bank.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Expenses from './pages/Expenses.jsx';
import Goals from './pages/Goals.jsx';
import Insights from './pages/Insights.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Profile from './pages/Profile.jsx';
import Register from './pages/Register.jsx';
import Salary from './pages/Salary.jsx';
import Savings from './pages/Savings.jsx';


export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="/bank" element={<Bank />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
