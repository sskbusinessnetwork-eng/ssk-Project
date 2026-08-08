import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import bcrypt from 'bcryptjs';
import { LogIn, Phone, ShieldCheck, Lock, AlertCircle, Eye, EyeOff, ChevronDown, KeyRound, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { getDashboardPath, getCleanFullName } from '../utils/authUtils';
import { databaseService } from '../services/databaseService';
import {  db, doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs, limit  } from '../lib/database';
import { UserProfile } from '../types';
import { BrandLogo } from '../components/BrandLogo';

export function Login() {
  const { user, profile, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
    }
  }, [location.state]);
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
          <span>Loading SSK Business Network...</span>
        </div>
      </div>
    );
  }
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const rawInput = formData.identifier.trim();
      const password = formData.password.trim();

      if (!rawInput || !password) {
        throw new Error('Phone number and password are required.');
      }

      const cleanDigits = rawInput.replace(/\D/g, '');
      const last10Digits = cleanDigits.slice(-10);

      const phoneVariants = Array.from(new Set([
        rawInput,
        normalizePhoneNumber(rawInput),
        cleanDigits,
        last10Digits,
        `+91${last10Digits}`,
        `91${last10Digits}`,
        `+91 ${last10Digits}`,
        `0${last10Digits}`
      ])).filter(Boolean);

      const matchesPassword = (storedPassword?: string | null) => {
        if (!storedPassword) return false;
        const sPwd = String(storedPassword).trim();
        const inputPwd = password.trim();
        if (sPwd === inputPwd) return true;
        try {
          if (bcrypt.compareSync(inputPwd, sPwd)) return true;
        } catch (err) {
          // Ignore compare error if not a valid hash
        }
        return false;
      };

      // 1. Check Master Admins first
      const masterAdminCandidates: any[] = [];

      const { data: maByNum } = await supabase
        .from('master_admins')
        .select('*')
        .in('phone_number', phoneVariants);
      if (maByNum) masterAdminCandidates.push(...maByNum);

      const { data: maByPhone } = await supabase
        .from('master_admins')
        .select('*')
        .in('phone', phoneVariants);
      if (maByPhone) masterAdminCandidates.push(...maByPhone);

      const { data: allMa } = await supabase.from('master_admins').select('*');
      if (allMa) {
        const maMatched = allMa.filter(ma => {
          const p = String(ma.phone_number || ma.phone || '').replace(/\D/g, '');
          return last10Digits.length === 10 && p.slice(-10) === last10Digits;
        });
        masterAdminCandidates.push(...maMatched);
      }

      const masterAdminMatch = masterAdminCandidates.find(ma => matchesPassword(ma.password));

      if (masterAdminMatch) {
        const masterAdmin = masterAdminMatch;

        const maStatus = (masterAdmin.status || '').trim().toUpperCase();
        if (maStatus === 'DISABLED' || masterAdmin.disabled === true) {
          throw new Error("Your account has been disabled.");
        }
        if (maStatus === 'INACTIVE') {
          throw new Error("Your membership is inactive.");
        }

        login({
          ...masterAdmin,
          uid: masterAdmin.id,
          id: masterAdmin.id,
          name: getCleanFullName(masterAdmin.full_name || masterAdmin.name),
          phone: masterAdmin.phone_number || masterAdmin.phone || rawInput,
          role: 'MASTER_ADMIN',
          membershipStatus: 'ACTIVE',
          membership_status: 'ACTIVE',
          createdAt: masterAdmin.created_at
        } as any);

        const masterDashboardPath = getDashboardPath('MASTER_ADMIN');
        navigate(masterDashboardPath, { replace: true });
        return;
      }

      // 2. Check regular users
      const userCandidates: any[] = [];

      const { data: usersByPhone } = await supabase
        .from('users')
        .select('*')
        .in('phone', phoneVariants);
      if (usersByPhone) userCandidates.push(...usersByPhone);

      const { data: usersByPhoneNumber } = await supabase
        .from('users')
        .select('*')
        .in('phone_number', phoneVariants);
      if (usersByPhoneNumber) userCandidates.push(...usersByPhoneNumber);

      const { data: allUsers } = await supabase.from('users').select('*');
      if (allUsers) {
        const matchedAll = allUsers.filter(u => {
          const p = String(u.phone || u.phone_number || (u as any).phoneNumber || '').replace(/\D/g, '');
          return last10Digits.length === 10 && p.slice(-10) === last10Digits;
        });
        userCandidates.push(...matchedAll);
      }

      try {
        const allDbUsers = await databaseService.list<UserProfile>('users');
        const matchedDb = allDbUsers.filter(u => {
          const p = String(u.phone || (u as any).phoneNumber || (u as any).phone_number || '').replace(/\D/g, '');
          return last10Digits.length === 10 && p.slice(-10) === last10Digits;
        });
        userCandidates.push(...matchedDb);
      } catch (e) {
        console.warn("Database service lookup fallback failed:", e);
      }

      const uniqueUserCandidates = Array.from(
        new Map(userCandidates.filter(u => u && (u.id || u.uid)).map(u => [u.id || u.uid, u])).values()
      );

      const userMatch = uniqueUserCandidates.find(u => matchesPassword(u.password));

      if (userMatch) {
        const user = userMatch;

        const rawAccountStatus = (user.account_status || user.accountStatus || '').trim().toUpperCase();
        const rawStatus = (user.status || '').trim().toUpperCase();
        
        if (rawAccountStatus === 'DISABLED' || rawStatus === 'DISABLED' || user.disabled === true) {
          throw new Error("Your account has been disabled.");
        }

        let subscriptionEnd = null;
        let subscriptionStart = null;
        let memStatus = user.membership_status || user.membershipStatus || user.status || '';
        let accStatus = user.account_status;

        const { data: subData } = await supabase
          .from('member_subscriptions')
          .select('subscription_start, subscription_end, membership_status, account_status')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subData) {
          subscriptionEnd = subData.subscription_end;
          subscriptionStart = subData.subscription_start;
          if (subData.membership_status) memStatus = subData.membership_status;
          if (subData.account_status) accStatus = subData.account_status;
        }

        const rawMembershipStatus = (memStatus || '').trim().toUpperCase();

        if (rawMembershipStatus === 'INACTIVE' || rawAccountStatus === 'INACTIVE' || rawStatus === 'INACTIVE') {
           throw new Error("Your membership is inactive.");
        }
        
        if (rawMembershipStatus === 'EXPIRED') {
           throw new Error("Your membership has expired.");
        }

        if (subscriptionEnd) {
          // Parse DD/MM/YYYY or YYYY-MM-DD
          const strVal = String(subscriptionEnd).trim();
          let y = 0, m = 0, d = 0;
          const matchDDMMYYYY = strVal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
          if (matchDDMMYYYY) {
            d = parseInt(matchDDMMYYYY[1], 10);
            m = parseInt(matchDDMMYYYY[2], 10);
            y = parseInt(matchDDMMYYYY[3], 10);
          } else {
            const matchYYYYMMDD = strVal.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
            if (matchYYYYMMDD) {
              y = parseInt(matchYYYYMMDD[1], 10);
              m = parseInt(matchYYYYMMDD[2], 10);
              d = parseInt(matchYYYYMMDD[3], 10);
            } else {
              const dateObj = new Date(strVal);
              if (!isNaN(dateObj.getTime())) {
                y = dateObj.getFullYear();
                m = dateObj.getMonth() + 1;
                d = dateObj.getDate();
              }
            }
          }
          
          if (y > 0) {
            const ymd = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const now = new Date();
            const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            if (todayYMD > ymd) {
              throw new Error("Subscription Expired");
            }
          }
        }

        login({
          ...user,
          uid: user.id,
          id: user.id,
          name: getCleanFullName(user.name),
          phone: user.phone || user.phone_number || rawInput,
          role: user.role,
          position: user.position,
          membershipStatus: memStatus,
          membership_status: memStatus,
          account_status: accStatus,
          createdAt: user.created_at,
          chapter_id: user.chapter_id,
          must_change_password: user.must_change_password,
          subscription_start: subscriptionStart || user.subscription_start,
          subscription_end: subscriptionEnd || user.subscription_end,
          subscriptionStart: subscriptionStart || user.subscription_start,
          subscriptionEnd: subscriptionEnd || user.subscription_end
        } as any);

        if (user.must_change_password) {
          navigate('/set-password');
        } else {
          const userDashboardPath = getDashboardPath(user.role || 'MEMBER', user.position);
          navigate(userDashboardPath, { replace: true });
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
            <div className="hidden items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ display: 'none' }} aria-hidden="true">
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
