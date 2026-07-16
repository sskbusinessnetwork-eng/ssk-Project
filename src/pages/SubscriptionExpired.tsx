import React from 'react';
import { motion } from 'motion/react';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function SubscriptionExpired() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-navy/5 border border-[#F3F4F6] p-8 text-center space-y-8"
      >
        <div className="w-24 h-24 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert size={48} />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-navy tracking-tight uppercase leading-none font-display">
            Subscription Expired
          </h1>
          <p className="text-[#6B7280] font-medium text-sm leading-relaxed">
            Your subscription has expired. Please contact your Chapter Admin to renew your access to the SSK Business Network.
          </p>
        </div>

        <div className="pt-4 space-y-4">
          <button
            onClick={handleLogout}
            className="w-full h-14 bg-navy text-white rounded-[16px] font-bold uppercase tracking-widest text-xs hover:bg-[#111827] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.03)] shadow-navy/20"
          >
            <LogOut size={18} />
            Logout & Contact Admin
          </button>
          
          <p className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-[0.2em]">
            SSK Business Network
          </p>
        </div>
      </motion.div>
    </div>
  );
}
