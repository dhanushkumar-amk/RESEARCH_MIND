import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import * as Lucide from 'lucide-react';
import { motion } from 'framer-motion';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreeTerms) {
      setError('You must agree to the terms and conditions');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    // Simulate signup, then redirect to OTP verification
    setTimeout(() => {
      setIsLoading(false);
      // In a real app we would send the verification email here
      // Redirect to OTP verification page and pass the email so they can see where it was sent
      navigate(ROUTES.VERIFY_OTP, { state: { email, fromRegister: true } });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a] font-sans antialiased relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/[0.02] rounded-full blur-[130px] pointer-events-none z-0" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-6">
        <div className="flex justify-center items-center gap-2.5 mb-4 font-sans">
          <div className="bg-emerald-500 text-white p-2 rounded-[6px] shadow-[0_4px_12px_rgba(16,185,129,0.15)] cursor-pointer" onClick={() => navigate(ROUTES.HOME)}>
            <Lucide.Brain className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-[#0a0a0a] cursor-pointer" onClick={() => navigate(ROUTES.HOME)}>
            ResearchMind
          </span>
        </div>
        <h2 className="text-[28px] font-extrabold text-[#0a0a0a] tracking-tight">
          Create account
        </h2>
        <p className="mt-2 text-xs text-neutral-450">
          Get started with your autonomous multi-agent workspace
        </p>
      </div>

      {/* Register Card */}
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
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Lucide.User className="h-4 w-4" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="block w-full pl-10 pr-3 py-2 border border-neutral-200 rounded-md text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-neutral-955 placeholder-neutral-400"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
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
                  className="block w-full pl-10 pr-3 py-2 border border-neutral-200 rounded-md text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-neutral-955 placeholder-neutral-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
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
                  className="block w-full pl-10 pr-10 py-2 border border-neutral-200 rounded-md text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-neutral-955 placeholder-neutral-400"
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Lucide.LockKeyhole className="h-4 w-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3 py-2 border border-neutral-200 rounded-md text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-neutral-955 placeholder-neutral-400"
                />
              </div>
            </div>

            {/* Agree to terms */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-250 text-emerald-605 focus:ring-emerald-500/10 mt-0.5 cursor-pointer"
                />
                <span className="text-xs text-neutral-500 font-medium leading-tight">
                  I agree to the{' '}
                  <span className="text-emerald-600 hover:underline">Terms of Service</span> and{' '}
                  <span className="text-emerald-600 hover:underline">Privacy Policy</span>.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-neutral-950 text-white hover:bg-neutral-800 font-semibold py-2.5 rounded-md text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer relative"
            >
              {isLoading ? (
                <>
                  <Lucide.Loader className="h-4 w-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <Lucide.UserPlus className="h-4 w-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <p className="mt-6 text-center text-xs text-neutral-450">
            Already have an account?{' '}
            <span 
              onClick={() => navigate(ROUTES.LOGIN)}
              className="font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer transition-colors"
            >
              Sign In
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;
