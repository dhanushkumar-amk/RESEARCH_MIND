import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import * as Lucide from 'lucide-react';
import { motion } from 'framer-motion';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    // Simulate sending OTP
    setTimeout(() => {
      setIsLoading(false);
      // Redirect to OTP verification page and set state showing we came from forgot password
      navigate(ROUTES.VERIFY_OTP, { state: { email, fromForgotPassword: true } });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a] font-sans antialiased relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/[0.02] rounded-full blur-[130px] pointer-events-none z-0" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-6">
        <div className="flex justify-center items-center gap-2.5 mb-4">
          <div className="bg-emerald-500 text-white p-2 rounded-[6px] shadow-[0_4px_12px_rgba(16,185,129,0.15)] cursor-pointer" onClick={() => navigate(ROUTES.HOME)}>
            <Lucide.Brain className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-[#0a0a0a] cursor-pointer" onClick={() => navigate(ROUTES.HOME)}>
            ResearchMind
          </span>
        </div>
        <h2 className="text-[28px] font-extrabold text-[#0a0a0a] tracking-tight">
          Forgot password?
        </h2>
        <p className="mt-2 text-xs text-neutral-455">
          Enter your email to receive a 6-digit verification code
        </p>
      </div>

      {/* Card */}
      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white border border-neutral-200 rounded-[16px] shadow-[0_12px_30px_rgba(0,0,0,0.03)] p-6 sm:p-8"
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 rounded-[8px] bg-red-50 border border-red-100 text-xs font-semibold text-red-650 flex items-center gap-2"
            >
              <Lucide.AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-450 mb-1.5 font-mono">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lucide.Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-10 pr-3 py-2 border border-neutral-200 rounded-[6px] text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 bg-white text-neutral-900 placeholder-neutral-400 transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0a0a0a] text-white hover:bg-neutral-800 font-bold py-2.5 rounded-[6px] text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer relative"
            >
              {isLoading ? (
                <>
                  <Lucide.Loader className="h-4 w-4 animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <Lucide.Send className="h-4 w-4" />
                  <span>Send Verification Code</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-6 flex justify-center">
            <span 
              onClick={() => navigate(ROUTES.LOGIN)}
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-emerald-600 cursor-pointer transition-colors"
            >
              <Lucide.ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
