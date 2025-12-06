import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ChildLogin from './pages/auth/ChildLogin';

// Parent pages
import ParentDashboard from './pages/parent/Dashboard';

// Child pages
import ChildDashboard from './pages/child/Dashboard';

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-chomper-500 border-t-transparent"></div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: ('PARENT' | 'CHILD')[];
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    return <Navigate to={user.role === 'PARENT' ? '/parent' : '/child'} replace />;
  }

  return <>{children}</>;
}

// Public route (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'PARENT' ? '/parent' : '/child'} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/child-login"
        element={
          <PublicRoute>
            <ChildLogin />
          </PublicRoute>
        }
      />

      {/* Parent routes */}
      <Route
        path="/parent/*"
        element={
          <ProtectedRoute allowedRoles={['PARENT']}>
            <ParentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Child routes */}
      <Route
        path="/child/*"
        element={
          <ProtectedRoute allowedRoles={['CHILD']}>
            <ChildDashboard />
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
