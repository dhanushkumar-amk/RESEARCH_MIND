import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, RotateCcw, Home, Sparkles } from 'lucide-react';
import { ROUTES } from '@/constants';

const ErrorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get custom error message from router state if available
  const errorMsg = location.state?.errorMsg ?? 'A connection timeout occurred while communicating with the LiteLLM gateway.';
  const errorCode = location.state?.errorCode ?? '504 GATEWAY_TIMEOUT';

  const handleRetry = () => {
    // Reload original location or go to dashboard
    navigate(ROUTES.DASHBOARD);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased relative flex flex-col justify-center items-center px-4 overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-red-500/[0.02] rounded-full blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full text-center space-y-6 bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
      >
        {/* Error icon circle */}
        <div className="mx-auto w-14 h-14 bg-red-50 border border-red-100 text-red-650 rounded-full flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded font-mono">
            {errorCode}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            Unexpected System Error
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed font-semibold">
            {errorMsg}
          </p>
        </div>

        {/* Action row */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleRetry}
            className="flex-1 bg-neutral-950 hover:bg-neutral-850 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Retry Connection</span>
          </button>
          
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="flex-1 bg-white border border-neutral-200 hover:border-neutral-350 text-neutral-700 font-bold py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Home className="h-4 w-4 text-neutral-500" />
            <span>Go to Dashboard</span>
          </button>
        </div>

        {/* Footer help notice */}
        <div className="border-t border-neutral-100 pt-4 flex items-center justify-center gap-1.5 text-[10px] text-neutral-400 font-semibold uppercase">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span>Need help? Check help center</span>
        </div>
      </motion.div>
    </div>
  );
};

export default ErrorPage;
