import { useEffect } from 'react';
import React from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { AccountsPage } from './features/accounts/AccountsPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import { ImportPage } from './features/import/ImportPage';
import { AuthProvider, useAuth } from './features/auth/AuthProvider';
import { LoginPage } from './features/auth/LoginPage';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = React.useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1121] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#4ade80] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'accounts': return <AccountsPage />;
      case 'transactions': return <TransactionsPage />;
      case 'import': return <ImportPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </AppLayout>
  );
}

function App() {
  );
}

export default App;
