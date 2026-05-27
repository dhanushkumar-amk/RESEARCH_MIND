import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants';
import * as Lucide from 'lucide-react';
import { motion } from 'framer-motion';

const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get email from router state if available
  const email = location.state?.email || 'your email';
  const fromForgotPassword = location.state?.fromForgotPassword || false;

  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [isResending, setIsResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Count down resend timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Handle typing OTP
  const handleChange = (element: HTMLInputElement, index: number) => {
    const value = element.value.replace(/[^0-9]/g, '');
    if (!value) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Focus next input
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      if (otp[index]) {
        // If current is filled, clear it
        newOtp[index] = '';
      } else if (index > 0) {
        // If current is empty, clear previous and focus it
        newOtp[index - 1] = '';
        if (inputRefs.current[index - 1]) {
          inputRefs.current[index - 1].focus();
        }
      }
      setOtp(newOtp);
      e.preventDefault();
    }
  };

  // Handle pasting code
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (pastedData.length >= 6) {
      const codeDigits = pastedData.substring(0, 6).split('');
      setOtp(codeDigits);
      // Focus last input
      if (inputRefs.current[5]) {
        inputRefs.current[5].focus();
      }
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter all 6 digits of the verification code');
      return;
    }

    setError('');
    setIsLoading(true);

    // Simulate verification
    setTimeout(() => {
      setIsLoading(false);
      
      if (fromForgotPassword) {
        // Redirect to Reset Password Page
        navigate(ROUTES.RESET_PASSWORD, { state: { email, verified: true } });
      } else {
        // Redirect to Onboarding Page (for signups) or Dashboard
        navigate(ROUTES.ONBOARDING);
      }
    }, 1200);
  };

  const handleResendCode = () => {
    if (resendTimer > 0) return;
    
    setError('');
    setSuccessMessage('');
    setIsResending(true);

    // Simulate resending
    setTimeout(() => {
      setIsResending(false);
      setResendTimer(30);
      setSuccessMessage('A new verification code has been sent to your email.');
      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    }, 1000);
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
          Verify your email
        </h2>
        <p className="mt-2 text-xs text-neutral-450 leading-relaxed max-w-sm mx-auto">
          We have sent a 6-digit verification code to <span className="font-semibold text-neutral-850 break-all">{email}</span>
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

          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 rounded-[8px] bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700 flex items-center gap-2"
            >
              <Lucide.CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          <form className="space-y-6" onSubmit={handleVerify}>
            {/* OTP Boxes */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-455 mb-3 text-center font-mono">
                Verification Code
              </label>
              <div className="flex justify-between gap-2 max-w-xs mx-auto">
                {otp.map((data, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength={1}
                    value={data}
                    ref={(el) => {
                      if (el) inputRefs.current[index] = el;
                    }}
                    onChange={(e) => handleChange(e.target, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={handlePaste}
                    className="w-10 h-12 text-center text-lg font-bold border border-neutral-200 rounded-[8px] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 bg-white text-neutral-900 transition-colors"
                  />
                ))}
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
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Lucide.ShieldAlert className="h-4 w-4" />
                  <span>Verify & Proceed</span>
                </>
              )}
            </button>
          </form>

          {/* Resend Actions */}
          <div className="mt-6 text-center text-xs text-neutral-500">
            {resendTimer > 0 ? (
              <p>
                Didn't receive the code? Resend in{' '}
                <span className="font-bold text-neutral-700">{resendTimer}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isResending}
                className="font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer transition-colors"
              >
                {isResending ? 'Resending Code...' : 'Resend Verification Code'}
              </button>
            )}
          </div>

          {/* Footer Back Link */}
          <div className="mt-6 flex justify-center border-t border-neutral-100 pt-4">
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

export default VerifyOtpPage;
