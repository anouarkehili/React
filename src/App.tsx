import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/auth/LoginPage';
import Dashboard from './components/dashboard/Dashboard';
import Layout from './components/layout/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GymProvider } from './contexts/GymContext';
import LoadingSpinner from './components/common/LoadingSpinner';
import QuickSaleModal from './components/sales/QuickSaleModal';
import './styles/arabic.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [showQuickSale, setShowQuickSale] = React.useState(false);

  // Listen for global quick sale event
  React.useEffect(() => {
    const handleOpenQuickSale = () => setShowQuickSale(true);
    window.addEventListener('openQuickSale', handleOpenQuickSale);
    return () => window.removeEventListener('openQuickSale', handleOpenQuickSale);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="app" dir="rtl">
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
          />
          <Route 
            path="/dashboard/*" 
            element={
              user ? (
                <GymProvider>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </GymProvider>
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      
      {/* Global Quick Sale Modal */}
      {user && (
        <QuickSaleModal 
          isOpen={showQuickSale} 
          onClose={() => setShowQuickSale(false)} 
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;