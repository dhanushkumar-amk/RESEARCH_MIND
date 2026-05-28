import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HelpCircle, ArrowLeft, Home, Sparkles } from 'lucide-react';
import { ROUTES } from '@/constants';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased relative flex flex-col justify-center items-center px-4 overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-green-500/[0.02] rounded-full blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full text-center space-y-6 bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
      >
        {/* Help icon circle */}
        <div className="mx-auto w-14 h-14 bg-green-50 border border-green-100 text-[#16a34a] rounded-full flex items-center justify-center">
          <HelpCircle className="h-7 w-7 text-[#16a34a]" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded font-mono">
            ERROR 404
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            Research Node Not Found
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed font-semibold">
            The database page or model route you requested does not exist or has been deleted.
          </p>
        </div>

        {/* Action button */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="flex-1 bg-neutral-950 hover:bg-neutral-850 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Home className="h-4 w-4" />
            <span>Go to Dashboard</span>
          </button>
        </div>

        {/* Footer help notice */}
        <div className="border-t border-neutral-100 pt-4 flex items-center justify-center gap-1.5 text-[10px] text-neutral-400 font-semibold uppercase">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span>Need help? Check documentation</span>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
