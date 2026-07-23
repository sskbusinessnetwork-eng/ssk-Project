import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import bcrypt from 'bcryptjs';
import { LogIn, Phone, ShieldCheck, Lock, AlertCircle, Eye, EyeOff, ChevronDown, KeyRound, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { getDashboardPath, getCleanFullName } from '../utils/authUtils';
import {  db, doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs, limit  } from '../lib/database';
import { UserProfile } from '../types';
import { BrandLogo } from '../components/BrandLogo';

export function Login() {
  const { user, profile, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
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
        
  const [formData, setFormData] = React.useState({
    identifier: '', // Phone number
    password: '',
  });

  // If user is logged in, handle redirection
  useEffect(() => {
    if (user && !authLoading && profile) {
      const dashboardPath = getDashboardPath(profile.role, profile.position);
      navigate(dashboardPath, { replace: true });
    }
  }, [user, profile, authLoading, navigate]);

  if (authLoading || (user && profile)) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="relative">
          <div className="absolute -inset-4 rounded-[32px] bg-primary/20 blur-xl animate-pulse" />
          <BrandLogo size="xl" />
        </div>
        <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest pt-4">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary/30 border-t-primary"></div>
          <span>Loading SSK Network...</span>
        </div>
      </div>
    );
  }
  
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
      
      // 1. Check Master Admins first
      const { data: masterAdmins, error: masterAdminError } = await supabase
        .from('master_admins')
        .select('*')
        .in('phone_number', [phone, normalizedPhone])
        .limit(1);

      if (masterAdmins && masterAdmins.length > 0) {
        const masterAdmin = masterAdmins[0];
        
        const isMasterMatch = masterAdmin.password === password || (masterAdmin.password && masterAdmin.password.startsWith('$2') && bcrypt.compareSync(password, masterAdmin.password));
        if (!isMasterMatch) {
          throw new Error('Invalid phone number or password.');
        }

        if (masterAdmin.status !== 'ACTIVE') {
          throw new Error("Your account has been disabled.");
        }

        login({
          uid: masterAdmin.id,
          name: getCleanFullName(masterAdmin.full_name),
          phone: masterAdmin.phone_number,
          role: 'MASTER_ADMIN',
          membershipStatus: 'ACTIVE',
          createdAt: masterAdmin.created_at
        });

        const dashboardPath = getDashboardPath('MASTER_ADMIN');
        navigate(dashboardPath, { replace: true });
        return;
      }

      // 2. Check regular users
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .in('phone', [phone, normalizedPhone])
        .limit(1);

      if (users && users.length > 0) {
        const user = users[0];
        
        const isUserMatch = user.password === password || (user.password && user.password.startsWith('$2') && bcrypt.compareSync(password, user.password));
        if (!isUserMatch) {
          throw new Error('Invalid phone number or password.');
        }

        if (user.status !== 'ACTIVE') {
          throw new Error("Your account has been disabled.");
        }

        login({
          uid: user.id,
          name: getCleanFullName(user.name),
          phone: user.phone,
          role: user.role,
          position: user.position,
          membershipStatus: user.status,
          createdAt: user.created_at,
          chapter_id: user.chapter_id,
          must_change_password: user.must_change_password
        });
        
        if (user.must_change_password) {
          navigate('/set-password');
        } else {
          const dashboardPath = getDashboardPath(user.role || 'MEMBER', user.position);
          navigate(dashboardPath, { replace: true });
        }
        return;
      }

      throw new Error('Invalid phone number or password.');
    } catch (err: any) {
      console.error("Login error:", err);
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
          className="mb-8 text-center flex flex-col items-center"
        >
          <BrandLogo size="xl" showText={true} lightText={true} subtitle="PLATINUM ONBOARDING SUITE" className="flex-col gap-4 text-center" />
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full bg-neutral-950/80 backdrop-blur-xl rounded-[32px] shadow-[0_32px_64px_rgba(0,0,0,0.6)] p-6 sm:p-8 border border-neutral-900"
        >
          <AnimatePresence mode="wait">
            
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
