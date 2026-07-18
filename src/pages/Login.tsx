import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Phone, ShieldCheck, Lock, AlertCircle, Eye, EyeOff, ChevronDown, KeyRound, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { getDashboardPath } from '../utils/authUtils';
import {  db, doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs, limit  } from '../lib/database';
import { UserProfile } from '../types';

export function Login() {
  const { user, profile, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [mode, setMode] = React.useState<'login' | 'forgot'>('login');
  const [forgotStep, setForgotStep] = React.useState<'identifier' | 'otp' | 'reset'>('identifier');
  const [confirmationResult, setConfirmationResult] = React.useState<any | null>(null);
  const [resetToken, setResetToken] = React.useState<string | null>(null);
  const [supabaseConnected, setSupabaseConnected] = React.useState<boolean | null>(null);

  // Check Supabase Connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error) {
          console.error("Supabase connection error:", error);
          setSupabaseConnected(false);
        } else {
          setSupabaseConnected(true);
        }
      } catch (err) {
        console.error("Supabase connection check failed:", err);
        setSupabaseConnected(false);
      }
    };
    checkConnection();
  }, []);

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
    if (user && !isForgotPasswordFlow && !isResetStep) {
      if (!authLoading && profile && isLoginFlow) {
        const dashboardPath = getDashboardPath(profile.role);
        navigate(dashboardPath, { replace: true });
      }
    }
  }, [user, profile, authLoading, navigate, isLoginFlow, isForgotPasswordFlow, isResetStep]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
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
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        phone: normalizedPhone,
        password: password,
      });

      if (authError) {
         if (authError.message.toLowerCase().includes("invalid login credentials") || authError.message.toLowerCase().includes("credentials")) {
             throw new Error("Incorrect password or mobile number not registered.");
         }
         throw new Error(authError.message || "Unable to sign in. Please try again.");
      }

      if (!authData.user) {
        throw new Error("Unable to sign in. Please try again.");
      }

      // 1. Check if user is Master Admin
      const { data: masterAdmin } = await supabase
        .from('master_admins')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (masterAdmin) {
        if (masterAdmin.status !== 'ACTIVE') {
          await supabase.auth.signOut();
          throw new Error("Your account has been disabled.");
        }

        login({
          uid: masterAdmin.auth_user_id,
          name: masterAdmin.full_name,
          phone: masterAdmin.phone_number,
          role: 'MASTER_ADMIN',
          membershipStatus: 'ACTIVE',
          createdAt: masterAdmin.created_at
        });

        navigate('/master-admin/dashboard', { replace: true });
        return;
      }

      // 2. Check if user is a regular member / chapter admin
      const { data: regularUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (regularUser) {
        if (regularUser.status !== 'ACTIVE') {
          await supabase.auth.signOut();
          throw new Error("Your account has been disabled.");
        }

        login({
          uid: regularUser.id,
          name: regularUser.name,
          phone: regularUser.phone,
          role: regularUser.role,
          position: regularUser.position,
          membershipStatus: regularUser.status,
          createdAt: regularUser.created_at,
          chapter_id: regularUser.chapter_id,
          must_change_password: regularUser.must_change_password
        });
        
        if (regularUser.must_change_password) {
          navigate('/set-password');
        } else {
          const dashboardPath = getDashboardPath(regularUser.role || 'MEMBER');
          navigate(dashboardPath, { replace: true });
        }
        return;
      }

      await supabase.auth.signOut();
      throw new Error("User profile not found.");
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

      if (!appVerifier) {
        throw new Error("reCAPTCHA not initialized. Please try again.");
      }

      
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalizedPhone });
      if (otpError) throw otpError;
      const result = { confirm: async (code) => {
        const { data, error } = await supabase.auth.verifyOtp({ phone: normalizedPhone, token: code, type: 'sms' });
        if (error) throw error;
        return { user: { uid: data.user?.id } };
      } };

      setConfirmationResult(result);
      (window as any).confirmationResult = result;
      
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
      
      const result = await confirmationResult.confirm(otpCode);
      const idToken = result.user.uid;
      setResetToken(idToken);
      
      await supabase.auth.signOut();
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
      
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      if (resetError) throw resetError;


      setSuccess('Password reset email sent! Please check your inbox.');
      setMode('login');
      setForgotStep('identifier');
      setFormData(prev => ({ ...prev, password: '', newPassword: '', confirmPassword: '', otp: '' }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (phone: string, pass: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      
      const q = query(collection(db, 'users'), where('phone', '==', normalizedPhone), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('User not found. Please check your phone number.');
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as UserProfile & { password?: string };
      const uid = userDoc.id;

      let storedPassword = userData.password;

      if (!storedPassword) {
        const authDoc = await getDoc(doc(db, 'auth_data', uid));
        if (authDoc.exists()) {
          storedPassword = authDoc.data().password;
        }
      }

      if (!storedPassword || storedPassword !== pass) {
        throw new Error('Wrong password. Please try again.');
      }

      login({ uid, ...userData } as UserProfile);
      
      if (userData.must_change_password) {
        navigate('/set-password');
      } else {
        const dashboardPath = getDashboardPath(userData.role || 'MEMBER');
        navigate(dashboardPath);
      }
    } catch (err: any) {
      console.error("Quick login error:", err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 md:p-8 overflow-hidden font-sans bg-[#0A0A0A]">
      
      {/* Premium Minimalist Dark Geometry and Red Highlights */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        
        {/* Subtle decorative mesh lines */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]" />
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
          className="mb-6 text-center"
        >
          <div className="w-20 h-20 rounded-[22px] bg-white p-1.5 shadow-2xl mb-5 mx-auto border border-neutral-800 overflow-hidden relative group">
            <img 
              src="https://i.pinimg.com/736x/f8/86/19/f8861925810bc3b81b6066e5a6e7495b.jpg" 
              alt="Logo"
              className="w-full h-full object-cover rounded-xl"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          
          <h1 className="text-2xl font-black text-white tracking-widest uppercase mb-1">
            SSK <span className="text-primary font-bold">NETWORKS</span>
          </h1>
          <p className="text-neutral-500 text-[10px] font-extrabold uppercase tracking-[0.25em] max-w-[280px] mx-auto leading-tight">
            PLATINUM ONBOARDING SUITE
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full bg-neutral-950/80 backdrop-blur-xl rounded-[32px] shadow-[0_32px_64px_rgba(0,0,0,0.6)] p-6 sm:p-8 border border-neutral-900"
        >
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                onSubmit={handleLogin}
                className="space-y-6"
              >
                {/* Phone Input */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-1">
                    <Phone size={12} className="text-primary" /> Registered Phone
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-3 border-r border-neutral-800">
                      <img src="https://flagcdn.com/w20/in.png" alt="IN" className="w-4 h-auto rounded-sm" />
                      <ChevronDown size={11} className="text-neutral-500" />
                    </div>
                    <input
                      required
                      type="tel"
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      placeholder="Enter 10 digit number"
                      className="w-full pl-20 pr-5 py-3.5 rounded-2xl bg-neutral-900/50 border border-neutral-800 focus:bg-[#0E0E0E] focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-white placeholder:text-neutral-600 text-sm"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">
                      <Lock size={12} className="text-primary" /> Security Key
                    </label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setSuccess(null);
                      }}
                      className="text-[9px] font-black text-primary uppercase tracking-[0.2em] hover:underline hover:opacity-90"
                    >
                      FORGOT KEY?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-5 py-3.5 rounded-2xl bg-neutral-900/50 border border-neutral-800 focus:bg-[#0E0E0E] focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-white placeholder:text-neutral-600 tracking-widest text-sm pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 text-red-400 text-xs font-bold bg-red-950/20 p-3 rounded-xl border border-red-900/30"
                  >
                    <AlertCircle size={14} className="shrink-0 text-red-500" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Success Message */}
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 text-emerald-400 text-xs font-bold bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/30"
                  >
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                    <span>{success}</span>
                  </motion.div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-primary/95 transition-all shadow-xl shadow-primary/10 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn size={14} />
                      Verify & Open Dashboard
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-6"
              >
                {/* Error Message */}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-950/20 p-3 rounded-xl border border-red-900/30"
                  >
                    <AlertCircle size={14} className="shrink-0 text-red-500" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Success Message */}
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/30"
                  >
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                    <span>{success}</span>
                  </motion.div>
                )}

                {forgotStep === 'identifier' && (
                  <form onSubmit={handleSendOTP} className="space-y-6">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-1">
                        <Phone size={12} className="text-primary" /> Registered Phone
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-3 border-r border-neutral-800">
                          <img src="https://flagcdn.com/w20/in.png" alt="IN" className="w-4 h-auto rounded-sm" />
                          <ChevronDown size={11} className="text-neutral-500" />
                        </div>
                        <input
                          required
                          type="tel"
                          value={formData.identifier}
                          onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                          placeholder="Enter 10 digit number"
                          className="w-full pl-20 pr-5 py-3.5 rounded-2xl bg-neutral-900/50 border border-neutral-800 focus:bg-[#0E0E0E] focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-white placeholder:text-neutral-600 text-sm"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-primary/95 transition-all shadow-xl active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                    >
                      {loading ? 'Sending Request...' : 'Transmit Verification OTP'}
                    </button>
                  </form>
                )}

                {forgotStep === 'otp' && (
                  <form onSubmit={handleVerifyOTP} className="space-y-6">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-1">
                        <KeyRound size={12} className="text-primary" /> Passcode (OTP)
                      </label>
                      <input
                        required
                        type="text"
                        maxLength={6}
                        value={formData.otp}
                        onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                        placeholder="000000"
                        className="w-full px-5 py-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 focus:bg-[#0E0E0E] focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all text-center text-2xl font-black tracking-[0.4em] text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-primary/95 transition-all shadow-xl active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                    >
                      {loading ? 'Authorizing...' : 'Authorize OTP Code'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotStep('identifier')}
                      className="w-full text-[9px] font-black text-neutral-500 hover:text-white uppercase tracking-[0.2em] transition-colors"
                    >
                      RE-ENTER PHONE NUMBER
                    </button>
                  </form>
                )}

                {forgotStep === 'reset' && (
                  <form onSubmit={handleResetPassword} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-1">
                          <Lock size={12} className="text-primary" /> New Security Key
                        </label>
                        <input
                          required
                          type="password"
                          value={formData.newPassword}
                          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                          placeholder="Min. 6 characters"
                          className="w-full px-5 py-3.5 rounded-2xl bg-neutral-900/50 border border-neutral-800 focus:bg-[#0E0E0E] focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-white placeholder:text-neutral-600 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-1">
                          <Lock size={12} className="text-primary" /> Confirm Security Key
                        </label>
                        <input
                          required
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          placeholder="Repeat security key"
                          className="w-full px-5 py-3.5 rounded-2xl bg-neutral-900/50 border border-neutral-800 focus:bg-[#0E0E0E] focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-white placeholder:text-neutral-600 text-sm"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-primary/95 transition-all shadow-xl active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                    >
                      {loading ? 'Transmitting Key...' : 'Update Security Key'}
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
                  className="w-full flex items-center justify-center gap-2 text-[9px] font-black text-neutral-500 hover:text-white uppercase tracking-[0.2em] transition-colors"
                >
                  <ArrowLeft size={12} /> BACK TO SECURITY PORTAL
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer info links */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center space-y-4"
        >
          {supabaseConnected !== null && (
            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
              {supabaseConnected ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-500/80">Supabase Connected</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-red-500/80">Supabase Disconnected</span>
                </>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-neutral-900/50">
            <Link to="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
              <ArrowLeft size={12} /> ESCAPE TO MAIN PORTAL
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
