import React from 'react';
import { motion } from 'motion/react';
import { LogIn, Phone, ArrowLeft, ShieldCheck, Users, Building2 } from 'lucide-react';
import { signIn } from '../firebase';
import { OTPAuth } from '../components/OTPAuth';
import { useAuth } from '../hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';

export function Register() {
  const { user, loading } = useAuth();
  const [method, setMethod] = React.useState<'select' | 'google' | 'phone'>('select');

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors mb-6 group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Home
          </Link>
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-emerald-500/20">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Join the Network</h1>
          <p className="text-slate-500">Choose your preferred registration method to get started.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
          {method === 'select' && (
            <div className="space-y-4">
              <button
                onClick={signIn}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>

              <button
                onClick={() => setMethod('phone')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Phone size={20} />
                Register with Phone OTP
              </button>

              <div className="pt-6 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 mx-auto">
                      <ShieldCheck size={20} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Secure</p>
                  </div>
                  <div className="space-y-1">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 mx-auto">
                      <Users size={20} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verified</p>
                  </div>
                  <div className="space-y-1">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 mx-auto">
                      <Building2 size={20} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Professional</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {method === 'phone' && (
            <div>
              <button
                onClick={() => setMethod('select')}
                className="mb-6 text-sm font-bold text-emerald-600 flex items-center gap-1 hover:underline"
              >
                <ArrowLeft size={14} /> Other methods
              </button>
              <OTPAuth />
            </div>
          )}
        </div>

        <p className="text-center mt-8 text-sm text-slate-500">
          By joining, you agree to our <span className="text-slate-900 font-semibold underline cursor-pointer">Terms of Service</span> and <span className="text-slate-900 font-semibold underline cursor-pointer">Privacy Policy</span>.
        </p>
      </motion.div>
    </div>
  );
}
