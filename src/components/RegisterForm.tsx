import React from 'react';
import { motion } from 'motion/react';
import { Phone, ShieldCheck, Lock, User, AlertCircle, Eye, EyeOff, Building2, CheckCircle2 } from 'lucide-react';
import { auth, signInWithCustomToken, RecaptchaVerifier } from '../firebase';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { UserRole } from '../types';
import { Link } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../utils/firebaseUtils';

import { normalizePhoneNumber } from '../utils/phoneUtils';
import { safeFetch } from '../utils/apiUtils';

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

  React.useEffect(() => {
    if (!(window as any).recaptchaVerifierRegister) {
      try {
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container-register', {
          size: 'invisible',
          callback: () => {
            console.log('Register reCAPTCHA verified');
          }
        });
        
        verifier.render().then(() => {
          (window as any).recaptchaVerifierRegister = verifier;
          console.log("Register reCAPTCHA initialized and rendered");
        });
      } catch (err: any) {
        console.error("Register reCAPTCHA initialization failed:", err.message || err);
      }
    }
  }, []);

  // Cleanup reCAPTCHA on unmount
  React.useEffect(() => {
    return () => {
      if ((window as any).recaptchaVerifierRegister) {
        try {
          (window as any).recaptchaVerifierRegister.clear();
          (window as any).recaptchaVerifierRegister = null;
        } catch (e: any) {
          console.error("Error clearing register reCAPTCHA:", e.message || e);
        }
      }
    };
  }, []);

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
      
      // Set logging_in flag to prevent useAuth from clearing localStorage prematurely
      sessionStorage.setItem('logging_in', 'true');
      
      const data = await safeFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizedPhone,
          password,
          name: displayName,
          role: formData.role,
          chapterName: formData.role === 'CHAPTER_ADMIN' ? formData.chapterName : undefined,
          businessName: formData.role === 'CHAPTER_ADMIN' ? formData.businessName : undefined,
          state: formData.state,
          city: formData.city,
          area: formData.area,
          address: formData.address
        })
      });

      // Sign in with custom token
      await signInWithCustomToken(auth, data.token);

      // Save user session in localStorage as requested
      localStorage.setItem('user', JSON.stringify({ uid: data.uid, phone: normalizedPhone }));
      sessionStorage.removeItem('logging_in');

      setIsSuccess(true);
      if (onSuccess) onSuccess(data.role || formData.role);
    } catch (err: any) {
      sessionStorage.removeItem('logging_in');
      console.error('Registration error:', err.message || err);
      let message = err.message || 'Failed to create account.';
      let isExistingAccount = false;

      if (err.code === 'auth/email-already-in-use' || err.message?.includes('email-already-in-use') || err.message?.includes('already exists')) {
        message = 'An account with this phone number already exists.';
        isExistingAccount = true;
      } else if (err.code === 'auth/weak-password') {
        message = 'The password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'A network error occurred. This is often caused by a firewall, ad-blocker, or restricted network. Please ensure your internet connection is stable and try disabling any ad-blockers.';
      } else if (err.code === 'permission-denied' || err.message?.includes('insufficient permissions')) {
        message = 'You do not have permission to create this account. Please contact support.';
      }

      setRegError(
        <div className="space-y-3">
          <p>{message}</p>
          {isExistingAccount && (
            <div className="flex flex-col gap-2 mt-2">
              <Link 
                to="/login" 
                className="w-full py-2 bg-slate-100 text-slate-900 rounded-lg font-bold text-xs hover:bg-slate-200 transition-all text-center"
              >
                Go to Login
              </Link>
              <Link 
                to="/login?mode=reset" 
                className="w-full py-2 bg-primary/10 text-primary rounded-lg font-bold text-xs hover:bg-primary/20 transition-all text-center"
              >
                Reset Password
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
      <div className="text-center py-12 space-y-8">
        <div className="w-24 h-24 bg-secondary/10 text-secondary rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-secondary/10 rotate-3">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-navy tracking-tight uppercase">Success!</h2>
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
        <div className="p-5 bg-red-50 border border-red-100 text-red-600 rounded-[2rem] text-xs flex items-start gap-4">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="font-bold leading-relaxed">{regError}</div>
        </div>
      )}

      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
          <User size={12} className="text-primary" /> Full Name
        </label>
        <input
          required
          type="text"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          placeholder="Enter your full name"
          className="w-full px-8 py-5 rounded-[2rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-black text-navy placeholder:text-slate-300"
        />
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
          <Phone size={12} className="text-primary" /> Phone Number
        </label>
        <input
          required
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="Enter phone number"
          className="w-full px-8 py-5 rounded-[2rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-black text-navy placeholder:text-slate-300"
        />
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
          <Lock size={12} className="text-primary" /> Password
        </label>
        <div className="relative">
          <input
            required
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Create a password"
            className="w-full px-8 py-5 rounded-[2rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-black text-navy placeholder:text-slate-300 pr-16"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-navy transition-colors"
          >
            {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
          <Lock size={12} className="text-primary" /> Confirm Password
        </label>
        <div className="relative">
          <input
            required
            type={showConfirmPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="Confirm your password"
            className="w-full px-8 py-5 rounded-[2rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-black text-navy placeholder:text-slate-300 pr-16"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-navy transition-colors"
          >
            {showConfirmPassword ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 ml-2">
          <ShieldCheck size={12} className="text-primary" /> Select Role
        </label>
        <select
          required
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
          className="w-full px-8 py-5 rounded-[2rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-black text-navy"
        >
          <option value="MEMBER">Member</option>
          <option value="CHAPTER_ADMIN">Chapter Admin</option>
          <option value="MASTER_ADMIN">Master Admin</option>
        </select>
        <p className="text-[10px] text-slate-500 italic font-medium ml-2 leading-relaxed">Admin roles require verification before full access is granted.</p>
      </div>

      {formData.role === 'CHAPTER_ADMIN' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8 p-8 bg-slate-50 rounded-[3rem] border-2 border-slate-100"
        >
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 ml-2">Chapter Details</p>
          
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Chapter Name <span className="text-rose-500">*</span></label>
            <input
              required
              type="text"
              value={formData.chapterName}
              onChange={(e) => setFormData({ ...formData, chapterName: e.target.value })}
              placeholder="Enter chapter name"
              className="w-full px-6 py-4 rounded-[1.5rem] border-2 border-white bg-white focus:border-primary outline-none transition-all font-black text-navy text-xs"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Business Name (Optional)</label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="Enter business name"
              className="w-full px-6 py-4 rounded-[1.5rem] border-2 border-white bg-white focus:border-primary outline-none transition-all font-black text-navy text-xs"
            />
          </div>
        </motion.div>
      )}

      {(formData.role === 'MEMBER' || formData.role === 'CHAPTER_ADMIN') && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8 p-8 bg-slate-50 rounded-[3rem] border-2 border-slate-100"
        >
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 ml-2">Location Details</p>
          
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">State</label>
            <input
              required
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="Enter state"
              className="w-full px-6 py-4 rounded-[1.5rem] border-2 border-white bg-white focus:border-primary outline-none transition-all font-black text-navy text-xs"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">City</label>
            <input
              required
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Enter city"
              className="w-full px-6 py-4 rounded-[1.5rem] border-2 border-white bg-white focus:border-primary outline-none transition-all font-black text-navy text-xs"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Area</label>
            <input
              required
              type="text"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              placeholder="Enter area"
              className="w-full px-6 py-4 rounded-[1.5rem] border-2 border-white bg-white focus:border-primary outline-none transition-all font-black text-navy text-xs"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Address</label>
            <textarea
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter full address"
              rows={3}
              className="w-full px-6 py-4 rounded-[1.5rem] border-2 border-white bg-white focus:border-primary outline-none transition-all font-black text-navy text-xs resize-none"
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
        className="w-full py-6 bg-navy text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-secondary transition-all shadow-2xl shadow-navy/20 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-4"
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
