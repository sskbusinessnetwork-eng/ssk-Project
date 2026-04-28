import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { getDashboardPath } from '../utils/authUtils';
import { RegisterForm } from '../components/RegisterForm';

export function Register() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (user && profile) {
    if (profile.role === 'MEMBER' || profile.role === 'CHAPTER_ADMIN') {
      return <Navigate to="/network" replace />;
    }
    const dashboardPath = getDashboardPath(profile.role);
    return <Navigate to={dashboardPath} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background decorative elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-navy transition-colors mb-10 group text-[10px] font-black uppercase tracking-[0.2em]">
            Back to Home
          </Link>
          <div className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/20 rotate-3 hover:rotate-0 transition-transform duration-500 overflow-hidden bg-white p-1">
            <img 
              src="https://i.pinimg.com/736x/f8/86/19/f8861925810bc3b81b6066e5a6e7495b.jpg" 
              className="w-full h-full object-cover rounded-[2.2rem]"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-navy mb-4 tracking-tighter uppercase">Join the Business Network</h1>
          <p className="text-muted-foreground font-medium px-4 text-sm leading-relaxed">Create your account to start networking and growing your business network.</p>
        </div>

        <div className="bg-white rounded-[3rem] md:rounded-[4rem] soft-shadow border border-white/60 p-10 md:p-12">
          <RegisterForm onSuccess={(role) => {
            const dashboardPath = getDashboardPath(role);
            navigate(dashboardPath, { replace: true });
          }} />
        </div>

        <p className="text-center mt-12 text-sm font-bold text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-black hover:underline uppercase tracking-widest text-xs ml-2">
            Login here
          </Link>
        </p>

        <p className="text-center mt-8 text-[10px] text-slate-300 font-black uppercase tracking-[0.3em] leading-relaxed px-8">
          By joining, you agree to our <span className="text-navy underline cursor-pointer">Terms</span> and <span className="text-navy underline cursor-pointer">Privacy Policy</span>.
        </p>
      </motion.div>
    </div>
  );
}
