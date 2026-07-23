import React from 'react';
import { motion } from 'motion/react';
import { Phone, ShieldCheck, Lock, User, AlertCircle, Eye, EyeOff, Building2, CheckCircle2 } from 'lucide-react';
import { db } from '../lib/database';
import {  doc, setDoc, collection, getDocs, query, where, limit  } from '../lib/database';
import { UserRole } from '../types';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

import { normalizePhoneNumber } from '../utils/phoneUtils';

interface RegisterFormProps {
  onSuccess?: (role: UserRole) => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [formData, setFormData] = React.useState({
    phone: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    role: 'MEMBER' as UserRole,
    chapterName: '',
    businessName: '',
    state: '',
    city: '',
    address: '',
    area: ''
  });
  const [regLoading, setRegLoading] = React.useState(false);
  const [regError, setRegError] = React.useState<React.ReactNode | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const handlePasswordRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);
    try {
      const password = formData.password.trim();
      const confirmPassword = formData.confirmPassword.trim();
      const displayName = formData.displayName.trim();

      if (!displayName) {
        throw new Error('Please enter your full name.');
      }

      if (!password || !confirmPassword) {
        throw new Error('Please enter and confirm your password.');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match. Please ensure both fields are identical.');
      }

      if (password.length < 6) {
        throw new Error('Password should be at least 6 characters.');
      }

      if (formData.role === 'MEMBER' || formData.role === 'CHAPTER_ADMIN') {
        if (formData.role === 'CHAPTER_ADMIN' && !formData.chapterName.trim()) {
          throw new Error('Chapter Name is required.');
        }
        if (!formData.state.trim()) throw new Error('State is required.');
        if (!formData.city.trim()) throw new Error('City is required.');
        if (!formData.area.trim()) throw new Error('Area is required.');
        if (!formData.address.trim()) throw new Error('Address is required.');
      }

      const cleanPhone = formData.phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) throw new Error('Please enter a valid 10-digit phone number.');
      
      const normalizedPhone = normalizePhoneNumber(formData.phone);
      
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .limit(1);

      if (checkError) throw checkError;
      if (existingUser && existingUser.length > 0) {
        throw new Error('This phone number is already registered. Please use a different phone number.');
      }

      // Generate a new UID manually since we're not using Firebase Auth
      const newUserRef = doc(collection(db, 'users'));
      const uid = newUserRef.id;

      // Create user profile in Firestore with password
      const userProfile = {
        uid,
        name: displayName,
        phone: normalizedPhone,
        password: password, // Store plain text password as requested
        role: formData.role,
        membershipStatus: 'ACTIVE',
        chapterName: formData.role === 'CHAPTER_ADMIN' ? formData.chapterName : undefined,
        businessName: formData.role === 'CHAPTER_ADMIN' ? formData.businessName : undefined,
        state: formData.state,
        city: formData.city,
        area: formData.area,
        address: formData.address,
        createdAt: new Date().toISOString()
      };

      await setDoc(newUserRef, userProfile);

      // Create authentication account
      const { error: signUpError } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password: password
      });
      if (signUpError && signUpError.message !== 'User already registered') {
        throw new Error(`Authentication account creation failed: ${signUpError.message}`);
      }

      // Save user session in localStorage
      localStorage.setItem('user', JSON.stringify({ 
        uid, 
        phone: normalizedPhone,
        profile: userProfile
      }));

      setIsSuccess(true);
      if (onSuccess) onSuccess(formData.role);
    } catch (err: any) {
      console.error('Registration error:', err.message || err);
      let message = err.message || 'Failed to create account.';
      
      setRegError(
        <div className="space-y-3">
          <p>{message}</p>
          {message.includes('already exists') && (
            <div className="flex flex-col gap-2 mt-2">
              <Link 
                to="/login" 
                className="w-full py-2 bg-neutral-100 text-neutral-900 rounded-lg font-bold text-xs hover:bg-neutral-200 transition-all text-center"
              >
                Go to Login
              </Link>
            </div>
          )}
        </div>
      );
    } finally {
      setRegLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8 space-y-8">
        <div className="w-24 h-24 bg-secondary/10 text-secondary rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-secondary/10 rotate-3">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-navy tracking-tight uppercase">Success!</h2>
          <p className="text-muted-foreground font-medium text-sm leading-relaxed">Your account has been created. We're redirecting you to your dashboard now...</p>
        </div>
        <div className="flex justify-center">
          <div className="w-10 h-10 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handlePasswordRegister} className="space-y-10">
      {regError && (
        <div className="p-5 bg-red-950/40 border border-red-900/30 text-red-400 rounded-[2rem] text-xs flex items-start gap-4">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="font-bold leading-relaxed">{regError}</div>
        </div>
      )}

      <div className="space-y-4">
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
          <User size={12} className="text-primary" /> Full Name
        </label>
        <input
          required
          type="text"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          placeholder="Enter your full name"
          className="w-full px-6 py-5 rounded-[2rem] border border-white/5 bg-[#111827] focus:bg-[#151C2E] focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-bold text-white placeholder:text-neutral-500"
        />
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
          <Phone size={12} className="text-primary" /> Phone Number
        </label>
        <input
          required
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="Enter phone number"
          className="w-full px-6 py-5 rounded-[2rem] border border-white/5 bg-[#111827] focus:bg-[#151C2E] focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-bold text-white placeholder:text-neutral-500"
        />
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
          <Lock size={12} className="text-primary" /> Password
        </label>
        <div className="relative">
          <input
            required
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Create a password"
            className="w-full px-6 py-5 rounded-[2rem] border border-white/5 bg-[#111827] focus:bg-[#151C2E] focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-bold text-white placeholder:text-neutral-500 pr-16"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
          <Lock size={12} className="text-primary" /> Confirm Password
        </label>
        <div className="relative">
          <input
            required
            type={showConfirmPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="Confirm your password"
            className="w-full px-6 py-5 rounded-[2rem] border border-white/5 bg-[#111827] focus:bg-[#151C2E] focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-bold text-white placeholder:text-neutral-500 pr-16"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
          >
            {showConfirmPassword ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
          <ShieldCheck size={12} className="text-primary" /> Select Role
        </label>
        <select
          required
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
          className="w-full px-6 py-5 rounded-[2rem] border border-white/5 bg-[#111827] focus:bg-[#151C2E] focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-bold text-white"
        >
          <option value="MEMBER" className="bg-[#111827] text-white">Member</option>
          <option value="CHAPTER_ADMIN" className="bg-[#111827] text-white">Chapter Admin</option>
          <option value="MASTER_ADMIN" className="bg-[#111827] text-white">Master Admin</option>
        </select>
        <p className="text-[10px] text-neutral-400 italic font-medium ml-2 leading-relaxed">Admin roles require verification before full access is granted.</p>
      </div>

      {formData.role === 'CHAPTER_ADMIN' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8 p-6 bg-[#111827] rounded-[3rem] border border-white/5"
        >
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] mb-4 ml-2">Chapter Details</p>
          
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] ml-2">Chapter Name <span className="text-red-500">*</span></label>
            <input
              required
              type="text"
              value={formData.chapterName}
              onChange={(e) => setFormData({ ...formData, chapterName: e.target.value })}
              placeholder="Enter chapter name"
              className="w-full px-6 py-4 rounded-[1.5rem] border border-white/5 bg-[#151C2E] focus:border-primary outline-none transition-all font-bold text-white text-xs placeholder:text-neutral-500"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] ml-2">Business Name (Optional)</label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="Enter business name"
              className="w-full px-6 py-4 rounded-[1.5rem] border border-white/5 bg-[#151C2E] focus:border-primary outline-none transition-all font-bold text-white text-xs placeholder:text-neutral-500"
            />
          </div>
        </motion.div>
      )}

      {(formData.role === 'MEMBER' || formData.role === 'CHAPTER_ADMIN') && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8 p-6 bg-[#111827] rounded-[3rem] border border-white/5"
        >
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] mb-4 ml-2">Location Details</p>
          
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] ml-2">State</label>
            <input
              required
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="Enter state"
              className="w-full px-6 py-4 rounded-[1.5rem] border border-white/5 bg-[#151C2E] focus:border-primary outline-none transition-all font-bold text-white text-xs placeholder:text-neutral-500"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] ml-2">City</label>
            <input
              required
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Enter city"
              className="w-full px-6 py-4 rounded-[1.5rem] border border-white/5 bg-[#151C2E] focus:border-primary outline-none transition-all font-bold text-white text-xs placeholder:text-neutral-500"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] ml-2">Area</label>
            <input
              required
              type="text"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              placeholder="Enter area"
              className="w-full px-6 py-4 rounded-[1.5rem] border border-white/5 bg-[#151C2E] focus:border-primary outline-none transition-all font-bold text-white text-xs placeholder:text-neutral-500"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.3em] ml-2">Address</label>
            <textarea
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter full address"
              rows={3}
              className="w-full px-6 py-4 rounded-[1.5rem] border border-white/5 bg-[#151C2E] focus:border-primary outline-none transition-all font-bold text-white text-xs resize-none placeholder:text-neutral-500"
            />
          </div>
        </motion.div>
      )}

      <div className="flex justify-center mb-6">
        <div id="recaptcha-container-register"></div>
      </div>

      <button
        type="submit"
        disabled={regLoading}
        className="w-full py-6 bg-primary text-white rounded-[2rem] font-bold uppercase tracking-[0.2em] text-xs hover:bg-primary/90 transition-all shadow-2xl active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-4"
      >
        {regLoading ? (
          <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          'Create Account'
        )}
      </button>
    </form>
  );
}
