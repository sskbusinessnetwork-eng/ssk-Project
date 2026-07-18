import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Lock, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { getDashboardPath } from '../utils/authUtils';

export function SetPassword() {
  const { profile, login } = useAuth();
  const navigate = useNavigate();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    
    setError(null);
    setLoading(true);

    try {
      // 1. Verify current password
      let storedPassword = profile.password;
      if (!storedPassword) {
        const authDoc = await getDoc(doc(db, 'auth_data', profile.uid));
        if (authDoc.exists()) {
          storedPassword = authDoc.data().password;
        }
      }
      
      if (!storedPassword || storedPassword !== currentPassword) {
        throw new Error('Current password is incorrect.');
      }

      // 2. Validate new password
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match.');
      }
      
      const validationError = validatePassword(newPassword);
      if (validationError) {
        throw new Error(validationError);
      }

      // 3. Update password in auth_data and update must_change_password flag
      await setDoc(doc(db, 'auth_data', profile.uid), { password: newPassword }, { merge: true });
      await updateDoc(doc(db, 'users', profile.uid), { 
        must_change_password: false,
        password: newPassword // Also update here to be safe if the app relies on it
      });

      // 4. Update local context and navigate
      const updatedProfile = { ...profile, must_change_password: false, password: newPassword };
      login(updatedProfile);
      
      navigate(getDashboardPath(profile.role));

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[24px] shadow-sm border border-neutral-200 overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">Create New Password</h1>
            <p className="text-sm text-neutral-500">
              For your security, please change your default password before accessing your account.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-start gap-2">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                Current Password
              </label>
              <input
                required
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                New Password
              </label>
              <input
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters with upper, lower, number, special"
                className="w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">
                Confirm New Password
              </label>
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-all text-sm"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-md active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? 'Updating Security...' : 'Set Secure Password'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </form>
          
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800 space-y-2">
            <p className="font-bold">Password Requirements:</p>
            <ul className="list-disc pl-4 space-y-1 text-blue-700/80">
              <li>Minimum 8 characters</li>
              <li>At least one uppercase letter (A-Z)</li>
              <li>At least one lowercase letter (a-z)</li>
              <li>At least one number (0-9)</li>
              <li>At least one special character (!@#$%^&*)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
