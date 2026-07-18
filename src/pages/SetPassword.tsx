import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Lock, ShieldAlert, CheckCircle2, ArrowRight, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getDashboardPath } from '../utils/authUtils';
import { motion, AnimatePresence } from 'framer-motion';

export function SetPassword() {
  const { profile, login } = useAuth();
  const navigate = useNavigate();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorPopup, setErrorPopup] = useState<string | null>(null);
  const [successPopup, setSuccessPopup] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(pass)) return "Password must contain an uppercase letter.";
    if (!/[a-z]/.test(pass)) return "Password must contain a lowercase letter.";
    if (!/[0-9]/.test(pass)) return "Password must contain a number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return "Password must contain a special character.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setErrors({});
    setErrorPopup(null);
    let newErrors: Record<string, string> = {};

    if (!currentPassword) newErrors.currentPassword = "Current Password is required.";
    if (!newPassword) newErrors.newPassword = "New Password is required.";
    if (!confirmPassword) newErrors.confirmPassword = "Confirm Password is required.";

    const validationError = validatePassword(newPassword);
    if (newPassword && validationError) {
      newErrors.newPassword = validationError;
    }

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      newErrors.confirmPassword = "New Password and Confirm Password do not match.";
    }

    if (newPassword && currentPassword && newPassword === currentPassword) {
      newErrors.newPassword = "New Password cannot be the same as the Current Password.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // 1. Verify current password from Supabase
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('password')
        .eq('id', profile.uid)
        .single();
        
      if (userError) {
        throw new Error(`Failed to fetch user record: ${userError.message}`);
      }
      
      if (!userData) {
        throw new Error('User record not found.');
      }

      if (userData.password !== currentPassword) {
        newErrors.currentPassword = "❌ Incorrect current password. Please try again.";
        setErrors(newErrors);
        setLoading(false);
        return;
      }

      // 2. Update password in users table
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password: newPassword,
          must_change_password: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.uid);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      // 3. Update master_admins table if applicable
      if (profile.role === 'MASTER_ADMIN') {
        const phone = profile.phone || profile.phone_number;
        if (phone) {
          const { error: masterAdminUpdateError } = await supabase
            .from('master_admins')
            .update({ 
              password: newPassword,
              updated_at: new Date().toISOString()
            })
            .eq('phone_number', phone);
            
          if (masterAdminUpdateError) {
             console.error("Failed to update master_admins password", masterAdminUpdateError);
          }
        }
      }

      // 4. Update local context context
      const updatedProfile = { ...profile, must_change_password: false, password: newPassword };
      login(updatedProfile);
      
      setSuccessPopup(true);

    } catch (err: any) {
      console.error("Set password error:", err);
      setErrorPopup(err.message || 'An unknown database error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigate(getDashboardPath(profile?.role));
  };

  return (
    <div className="min-h-screen bg-[#0E1116] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#161B22] border border-white/[0.08] rounded-[24px] shadow-[0_15px_40px_rgba(0,0,0,0.35)] overflow-hidden relative">
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">Create New Password</h1>
            <p className="text-sm text-neutral-400">
              For your security, please change your default password before accessing your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-[0.5px] ml-1">
                Current Password *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errors.currentPassword) setErrors({ ...errors, currentPassword: '' });
                }}
                placeholder="Enter current password"
                className={`w-full h-[50px] px-4 bg-[#0F172A] border ${errors.currentPassword ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-xl outline-none transition-all text-white placeholder-white/50 text-sm`}
              />
              {errors.currentPassword && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.currentPassword}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-[0.5px] ml-1">
                New Password *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
                }}
                placeholder="Min. 8 chars, upper, lower, number, special"
                className={`w-full h-[50px] px-4 bg-[#0F172A] border ${errors.newPassword ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-xl outline-none transition-all text-white placeholder-white/50 text-sm`}
              />
              {errors.newPassword && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.newPassword}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-[0.5px] ml-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                }}
                placeholder="Repeat new password"
                className={`w-full h-[50px] px-4 bg-[#0F172A] border ${errors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-xl outline-none transition-all text-white placeholder-white/50 text-sm`}
              />
              {errors.confirmPassword && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.confirmPassword}</p>}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white rounded-[14px] font-bold uppercase tracking-widest text-xs hover:bg-[#DC2626] transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
          
          <div className="bg-[#0F172A]/50 p-4 rounded-xl border border-white/[0.05] text-xs text-neutral-400 space-y-2">
            <p className="font-bold text-[#E5E7EB]">Password Requirements:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Minimum 8 characters</li>
              <li>At least one uppercase letter (A-Z)</li>
              <li>At least one lowercase letter (a-z)</li>
              <li>At least one number (0-9)</li>
              <li>At least one special character (!@#$%^&*)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {successPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1A1F2B] border border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-full relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">✅ Password Updated Successfully</h3>
                <p className="text-sm text-neutral-400 mb-6">
                  Your password has been changed successfully. Please use your new password the next time you log in.
                </p>
                <button
                  onClick={handleContinue}
                  className="w-full py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-primary/90 transition-colors"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Modal */}
      <AnimatePresence>
        {errorPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1A1F2B] border border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-full relative"
            >
              <button 
                onClick={() => setErrorPopup(null)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              >
                <X size={20} />
              </button>
              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-400">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">❌ Password Update Failed</h3>
                <p className="text-sm text-neutral-400 mb-6">
                  {errorPopup}
                </p>
                <button
                  onClick={() => setErrorPopup(null)}
                  className="w-full py-3 bg-neutral-800 text-white border border-white/10 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-neutral-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
