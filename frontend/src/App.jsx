import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth.store.js';

import LandingPage    from './pages/LandingPage.jsx';
import LoginPage      from './pages/LoginPage.jsx';
import RegisterPage   from './pages/RegisterPage.jsx';
import DashboardPage  from './pages/DashboardPage.jsx';
import CVPage         from './pages/CVPage.jsx';
import AssessmentPage from './pages/AssessmentPage.jsx';
import JobsPage       from './pages/JobsPage.jsx';
import ApplicationsPage from './pages/ApplicationsPage.jsx';
import ProfilePage    from './pages/ProfilePage.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';

const ProtectedRoute = ({ children }) => {
  const { token, initialized } = useAuthStore();
  if (!initialized) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  return token ? children : <Navigate to="/login" replace />;
};

const GuestRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? <Navigate to="/dashboard" replace /> : children;
};

export default function App() {
  const init = useAuthStore(s => s.init);

  useEffect(() => { init(); }, [init]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { borderRadius: '12px', fontFamily: 'Inter', fontSize: '14px' },
          success: { iconTheme: { primary: '#2563EB', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* Protected */}
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="dashboard"    element={<DashboardPage />} />
          <Route path="cv"           element={<CVPage />} />
          <Route path="assessment"   element={<AssessmentPage />} />
          <Route path="jobs"         element={<JobsPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="profile"      element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
