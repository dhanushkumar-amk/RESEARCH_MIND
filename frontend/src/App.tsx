import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ROUTES } from '@/constants';
import ProtectedRoute from '@/components/common/ProtectedRoute';

// Lazy load pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const VerifyOtpPage = lazy(() => import('@/pages/VerifyOtpPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ResearchPage = lazy(() => import('@/pages/ResearchPage'));
const LibraryPage = lazy(() => import('@/pages/LibraryPage'));
const ReportPage = lazy(() => import('@/pages/ReportPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SourceDetailPage = lazy(() => import('@/pages/SourceDetailPage'));
const HistoryPage = lazy(() => import('@/pages/HistoryPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const HelpPage = lazy(() => import('@/pages/HelpPage'));
const ErrorPage = lazy(() => import('@/pages/ErrorPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// A sleek loading component for lazy routing
const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      <p className="text-xs font-semibold text-neutral-500 font-mono animate-pulse">Loading Workspace...</p>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path={ROUTES.HOME} element={<LandingPage />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.VERIFY_OTP} element={<VerifyOtpPage />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path={ROUTES.ONBOARDING} element={<OnboardingPage />} />
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.RESEARCH} element={<ResearchPage />} />
            <Route path={ROUTES.LIBRARY} element={<LibraryPage />} />
            <Route path={ROUTES.REPORT} element={<ReportPage />} />
            <Route path="/reports" element={<ReportPage />} />
            <Route path={ROUTES.ANALYTICS} element={<AnalyticsPage />} />
            <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
            <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
            <Route path={ROUTES.SOURCE_DETAIL} element={<SourceDetailPage />} />
            <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
            <Route path={ROUTES.PRICING} element={<PricingPage />} />
            <Route path={ROUTES.HELP} element={<HelpPage />} />
            <Route path={ROUTES.ERROR} element={<ErrorPage />} />
            <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
