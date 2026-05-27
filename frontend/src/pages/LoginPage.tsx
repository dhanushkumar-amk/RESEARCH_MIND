import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import * as Lucide from 'lucide-react';
import { motion } from 'framer-motion';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      // In a real app we'd set token/auth state
      navigate(ROUTES.DASHBOARD);
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
          Welcome back
        </h2>
        <p className="mt-2 text-xs text-neutral-450">
          Access your autonomous research agent workspace
        </p>
      </div>

      {/* Login Card */}
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

          <form className="space-y-4" onSubmit={handleSubmit}>
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

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-wider text-neutral-455 font-mono">
                  Password
                </label>
                <span 
                  onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer transition-colors"
                >
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lucide.Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2 border border-neutral-200 rounded-[6px] text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 bg-white text-neutral-900 placeholder-neutral-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showPassword ? (
                    <Lucide.EyeOff className="h-4 w-4" />
                  ) : (
                    <Lucide.Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-[4px] border-neutral-200 text-emerald-500 focus:ring-emerald-500/10"
                />
                <span className="text-[11px] font-semibold text-neutral-500">Keep me signed in</span>
              </label>
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
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Lucide.LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-widest">
              <span className="bg-white px-3.5 text-neutral-400">Or continue with</span>
            </div>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  setIsLoading(false);
                  navigate(ROUTES.DASHBOARD);
                }, 1000);
              }}
              className="flex items-center justify-center gap-2 border border-neutral-200 hover:border-neutral-300 rounded-[6px] py-2 bg-white text-xs font-semibold text-neutral-600 transition-all hover:bg-neutral-50 cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              Google
            </button>
            <button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  setIsLoading(false);
                  navigate(ROUTES.DASHBOARD);
                }, 1000);
              }}
              className="flex items-center justify-center gap-2 border border-neutral-200 hover:border-neutral-300 rounded-[6px] py-2 bg-white text-xs font-semibold text-neutral-600 transition-all hover:bg-neutral-50 cursor-pointer"
            >
              <Lucide.Github className="h-4 w-4" />
              GitHub
            </button>
          </div>

          {/* Footer Link */}
          <p className="mt-6 text-center text-xs text-neutral-450">
            New to ResearchMind?{' '}
            <span 
              onClick={() => navigate(ROUTES.REGISTER)}
              className="font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer transition-colors"
            >
              Create an account
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
