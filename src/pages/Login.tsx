import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Phone, ShieldCheck, Lock, AlertCircle, Eye, EyeOff, ChevronDown, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signOut, sendPasswordResetEmail, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { getDashboardPath } from '../utils/authUtils';
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { UserProfile } from '../types';

export function Login() {
  const { user, profile, loading: authLoading, login, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [mode, setMode] = React.useState<'login' | 'forgot'>('login');
  const [forgotStep, setForgotStep] = React.useState<'identifier' | 'otp' | 'reset'>('identifier');
  const [confirmationResult, setConfirmationResult] = React.useState<ConfirmationResult | null>(null);
  const [resetToken, setResetToken] = React.useState<string | null>(null);

  // Clear stale session on mount if not authenticated
  useEffect(() => {
    if (!localStorage.getItem('user')) {
      sessionStorage.clear();
    }
  }, []);
  
  // Separate flow flags as requested
  const isLoginFlow = mode === 'login';
  const isForgotPasswordFlow = mode === 'forgot';
  const isResetStep = forgotStep === 'reset';
  
  const [formData, setFormData] = React.useState({
    identifier: '', // Phone number
    password: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });

  // If user is logged in, handle redirection
  useEffect(() => {
    // PREVENT AUTO REDIRECT BUG
    if (user && !isForgotPasswordFlow && !isResetStep) {
      if (!authLoading && profile && isLoginFlow) {
        const dashboardPath = getDashboardPath(profile.role);
        navigate(dashboardPath, { replace: true });
      }
    }
  }, [user, profile, authLoading, navigate, isLoginFlow, isForgotPasswordFlow, isResetStep]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Prevent rendering login if already authenticated and NOT in forgot flow
  if (user && profile && isLoginFlow) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const phone = formData.identifier.trim();
      const password = formData.password.trim();

      if (!phone || !password) {
        throw new Error('Phone number and password are required.');
      }

      const normalizedPhone = normalizePhoneNumber(phone);
      
      // Manual Firestore Login
      const q = query(collection(db, 'users'), where('phone', '==', normalizedPhone), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('User not found. Please check your phone number.');
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as UserProfile & { password?: string };
      const uid = userDoc.id;

      // Check password from users collection or auth_data fallback
      let storedPassword = userData.password;

      if (!storedPassword) {
        // Fallback to auth_data if not in users
        const authDoc = await getDoc(doc(db, 'auth_data', uid));
        if (authDoc.exists()) {
          storedPassword = authDoc.data().password;
        }
      }

      if (!storedPassword || storedPassword !== password) {
        throw new Error('Wrong password. Please try again.');
      }

      // Success - use the login function from AuthContext
      login({ uid, ...userData } as UserProfile);
      
      const dashboardPath = getDashboardPath(userData.role || 'MEMBER');
      navigate(dashboardPath);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const phone = formData.identifier.trim();
      if (!phone) throw new Error("Phone number is required");
      
      if (phone.replace(/\D/g, "").length !== 10) {
        throw new Error("Invalid phone format. Please enter correct 10-digit number.");
      }

      const normalizedPhone = normalizePhoneNumber(phone);
      
      const appVerifier = (window as any).recaptchaVerifier;
      
      // DEBUG LOGS - Use boolean check to avoid circular JSON error in proxied consoles
      console.log("reCAPTCHA initialized:", !!appVerifier);
      console.log("Phone:", normalizedPhone);

      if (!appVerifier) {
        throw new Error("reCAPTCHA not initialized. Please try again.");
      }

      const result = await signInWithPhoneNumber(auth, normalizedPhone, appVerifier);
      
      setConfirmationResult(result);
      (window as any).confirmationResult = result; // Store on window as requested
      
      setForgotStep('otp');
      setSuccess('OTP sent to your phone!');
    } catch (err: any) {
      console.error("OTP send error:", err.message || err);
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) {
      setError('Session expired. Please request a new OTP.');
      setForgotStep('identifier');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const otpCode = formData.otp.trim();
      if (otpCode.length !== 6) {
        throw new Error('Please enter a valid 6-digit OTP.');
      }
      
      // Verification signs the user in
      const result = await confirmationResult.confirm(otpCode);
      
      // CRITICAL FIX: After OTP verification:
      // 1. Get the ID token for secure backend verification
      const idToken = await result.user.getIdToken();
      setResetToken(idToken);
      
      // 🔥 ADD THIS IMMEDIATELY: OTP must NOT log user in
      await signOut(auth);
      
      // 3. Continue to reset password screen
      setForgotStep('reset');
      setSuccess('Identity verified! Please set your new password.');
    } catch (err: any) {
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid OTP. Please check and try again.');
      } else if (err.code === 'auth/code-expired') {
        setError('OTP has expired. Please request a new one.');
        setForgotStep('identifier');
      } else {
        setError(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const normalizedPhone = normalizePhoneNumber(formData.identifier);
      const email = `${normalizedPhone.replace('+', '')}@ssk.internal`;
      
      await sendPasswordResetEmail(auth, email);

      setSuccess('Password reset email sent! Please check your inbox (or internal system).');
      setMode('login');
      setForgotStep('identifier');
      setFormData(prev => ({ ...prev, password: '', newPassword: '', confirmPassword: '', otp: '' }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const useDemoAccount = () => {
    setFormData({ ...formData, identifier: '9876543210', password: 'password123' });
    setError(null);
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 md:p-8 overflow-hidden font-sans">
      {/* Premium Polygonal Background */}
      <div className="absolute inset-0 z-0 bg-[#1a2a3a]">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_left,_#2c3e50_0%,_transparent_50%),_radial-gradient(circle_at_bottom_right,_#b8860b_0%,_transparent_50%)]" />
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 0 L100 0 L100 100 L0 100 Z" fill="none" />
          <path d="M0 0 L40 30 L0 70 Z" fill="#ffffff" opacity="0.1" />
          <path d="M100 0 L60 40 L100 60 Z" fill="#ffffff" opacity="0.1" />
          <path d="M30 100 L70 60 L100 100 Z" fill="#ffffff" opacity="0.1" />
          <path d="M0 100 L50 50 L20 100 Z" fill="#ffffff" opacity="0.1" />
        </svg>
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>

      <div className="flex justify-center mb-6">
        <div id="recaptcha-container"></div>
      </div>
      {/* Content Container */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white p-1 shadow-2xl mb-6 mx-auto border-4 border-white/20 overflow-hidden">
            <img 
              src="https://i.pinimg.com/736x/f8/86/19/f8861925810bc3b81b6066e5a6e7495b.jpg" 
              alt="Logo"
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-2 tracking-tight uppercase">
            {mode === 'login' ? 'Welcome Back' : 'Reset Password'}
          </h1>
          <p className="text-white/70 text-sm md:text-base font-medium max-w-[280px] mx-auto leading-tight">
            {mode === 'login' 
              ? 'Login to access your networking dashboard and grow your business.' 
              : forgotStep === 'identifier' ? 'Enter your phone number to receive an OTP.'
              : forgotStep === 'otp' ? 'Enter the 6-digit OTP sent to your phone.'
              : 'Set your new secure password.'}
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 md:p-10 border border-white/20"
        >
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-8"
              >
                {/* Phone Input */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                    <Phone size={14} className="text-[#b8860b]" /> Phone Number
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-3 border-r border-slate-200">
                      <img src="https://flagcdn.com/w20/in.png" alt="IN" className="w-5 h-auto rounded-sm" />
                      <ChevronDown size={12} className="text-slate-400" />
                    </div>
                    <input
                      required
                      type="tel"
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      placeholder="Enter phone number"
                      className="w-full pl-20 pr-6 py-4 rounded-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#b8860b] focus:ring-4 focus:ring-[#b8860b]/10 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      <Lock size={14} className="text-[#b8860b]" /> Password
                    </label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setSuccess(null);
                      }}
                      className="text-[10px] font-black text-[#b8860b] uppercase tracking-[0.2em] hover:opacity-70 transition-opacity"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative group">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter your password"
                      className="w-full px-6 py-4 rounded-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#b8860b] focus:ring-4 focus:ring-[#b8860b]/10 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 pr-14"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100"
                  >
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}

                {/* Success Message */}
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-primary text-xs font-bold bg-primary/5 p-3 rounded-xl border border-primary/10"
                  >
                    <CheckCircle2 size={16} />
                    {success}
                  </motion.div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#1a2a3a] text-white rounded-full font-bold uppercase tracking-[0.2em] text-sm hover:bg-[#2c3e50] transition-all shadow-xl shadow-navy/20 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn size={18} />
                      Login
                    </>
                  )}
                </button>

                {/* Divider */}
                <div id="demo-divider" className="hidden relative flex items-center gap-4">
                  <div className="flex-1 h-[1px] bg-slate-100" />
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Or</span>
                  <div className="flex-1 h-[1px] bg-slate-100" />
                </div>

                {/* Demo Button */}
                <button
                  id="demo-account-button"
                  type="button"
                  onClick={useDemoAccount}
                  className="hidden w-full py-4 bg-white text-slate-600 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-slate-50 transition-all border border-slate-200 active:scale-[0.98]"
                >
                  Use Demo Account
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Error Message */}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100"
                  >
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}

                {/* Success Message */}
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-primary text-xs font-bold bg-primary/5 p-3 rounded-xl border border-primary/10"
                  >
                    <CheckCircle2 size={16} />
                    {success}
                  </motion.div>
                )}

                {forgotStep === 'identifier' && (
                  <form onSubmit={handleSendOTP} className="space-y-8">
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                        <Phone size={14} className="text-[#b8860b]" /> Phone Number
                      </label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-3 border-r border-slate-200">
                          <img src="https://flagcdn.com/w20/in.png" alt="IN" className="w-5 h-auto rounded-sm" />
                          <ChevronDown size={12} className="text-slate-400" />
                        </div>
                        <input
                          required
                          type="tel"
                          value={formData.identifier}
                          onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                          placeholder="Enter phone number"
                          className="w-full pl-20 pr-6 py-4 rounded-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#b8860b] focus:ring-4 focus:ring-[#b8860b]/10 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-[#b8860b] text-white rounded-full font-bold uppercase tracking-[0.2em] text-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-70"
                    >
                      {loading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </form>
                )}

                {forgotStep === 'otp' && (
                  <form onSubmit={handleVerifyOTP} className="space-y-8">
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                        <KeyRound size={14} className="text-[#b8860b]" /> Enter OTP
                      </label>
                      <input
                        required
                        type="text"
                        maxLength={6}
                        value={formData.otp}
                        onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                        placeholder="000000"
                        className="w-full px-6 py-5 rounded-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#b8860b] focus:ring-4 focus:ring-[#b8860b]/10 outline-none transition-all text-center text-3xl font-black tracking-[0.5em] text-slate-800"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-[#b8860b] text-white rounded-full font-bold uppercase tracking-[0.2em] text-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-70"
                    >
                      {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotStep('identifier')}
                      className="w-full text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-colors"
                    >
                      Change Phone Number
                    </button>
                  </form>
                )}

                {forgotStep === 'reset' && (
                  <form onSubmit={handleResetPassword} className="space-y-8">
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                          <Lock size={14} className="text-[#b8860b]" /> New Password
                        </label>
                        <input
                          required
                          type="password"
                          value={formData.newPassword}
                          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                          placeholder="Min. 6 characters"
                          className="w-full px-6 py-4 rounded-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#b8860b] focus:ring-4 focus:ring-[#b8860b]/10 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                          <Lock size={14} className="text-[#b8860b]" /> Confirm Password
                        </label>
                        <input
                          required
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          placeholder="Repeat new password"
                          className="w-full px-6 py-4 rounded-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#b8860b] focus:ring-4 focus:ring-[#b8860b]/10 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-[#b8860b] text-white rounded-full font-bold uppercase tracking-[0.2em] text-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-70"
                    >
                      {loading ? 'Resetting...' : 'Update Password'}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setForgotStep('identifier');
                    setResetToken(null);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-colors"
                >
                  <ArrowLeft size={14} /> Back to Login
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 text-center space-y-4"
        >
          <p id="registration-prompt" className="hidden text-white/60 text-xs font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-white font-black hover:underline uppercase tracking-widest ml-1">
              Join the Business Network
            </Link>
          </p>
          <div className="pt-4 border-t border-white/10">
            <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-xs font-black uppercase tracking-widest transition-colors">
              <ArrowLeft size={14} /> Back to Home
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Decorative Star */}
      <div className="absolute bottom-10 right-10 opacity-20 hidden md:block">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M20 0L24.4903 15.5097L40 20L24.4903 24.4903L20 40L15.5097 24.4903L0 20L15.5097 15.5097L20 0Z" fill="white" />
        </svg>
      </div>
    </div>
  );
}
