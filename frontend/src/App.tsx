import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ROUTES } from '@/constants';
import ProtectedRoute from '@/components/common/ProtectedRoute';

import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import VerifyOtpPage from '@/pages/VerifyOtpPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import OnboardingPage from '@/pages/OnboardingPage';
import DashboardPage from '@/pages/DashboardPage';
import ResearchPage from '@/pages/ResearchPage';
import LibraryPage from '@/pages/LibraryPage';
import ReportPage from '@/pages/ReportPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SettingsPage from '@/pages/SettingsPage';
import SourceDetailPage from '@/pages/SourceDetailPage';
import HistoryPage from '@/pages/HistoryPage';
import PricingPage from '@/pages/PricingPage';
import HelpPage from '@/pages/HelpPage';
import ErrorPage from '@/pages/ErrorPage';
import NotFoundPage from '@/pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
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
          <Route path={ROUTES.SOURCE_DETAIL} element={<SourceDetailPage />} />
          <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
          <Route path={ROUTES.PRICING} element={<PricingPage />} />
          <Route path={ROUTES.HELP} element={<HelpPage />} />
          <Route path={ROUTES.ERROR} element={<ErrorPage />} />
          <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
