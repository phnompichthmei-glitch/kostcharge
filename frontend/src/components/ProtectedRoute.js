import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (user === false) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
