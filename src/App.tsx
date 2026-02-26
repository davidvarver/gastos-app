import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import { AccountsPage } from './features/accounts/AccountsPage';
import { CategoriesPage } from './features/categories/CategoriesPage';
import { RecurringPage } from './features/transactions/RecurringPage';
import { ImportPage } from './features/import/ImportPage';
import { SavingsPage } from './features/savings/SavingsPage';
import { BudgetsPage } from './features/budgets/BudgetsPage';
import { LoginPage } from './features/auth/LoginPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { UpdatePasswordPage } from './features/auth/UpdatePasswordPage';
import { AuthProvider } from './features/auth/AuthProvider';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { Toaster } from 'sonner';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/recurring" element={<RecurringPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/savings" element={<SavingsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" theme="dark" />
    </AuthProvider>
  );
}

export default App;
