import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Share2, 
  Award, 
  UserPlus, 
  Settings, 
  LogOut,
  Building2,
  Tags
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { logOut } from '../firebase';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function Sidebar() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logOut();
    navigate('/');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'chapter_admin', 'member', 'guest'] },
    { icon: Building2, label: 'Chapters', path: '/chapters', roles: ['admin'] },
    { icon: Users, label: 'Members', path: '/members', roles: ['admin', 'chapter_admin'] },
    { icon: Calendar, label: 'Meetings', path: '/meetings', roles: ['admin', 'chapter_admin', 'member'] },
    { icon: Share2, label: 'Referrals', path: '/referrals', roles: ['admin', 'chapter_admin', 'member'] },
    { icon: Award, label: 'Thank You Slips', path: '/thank-you-slips', roles: ['admin', 'chapter_admin', 'member'] },
    { icon: UserPlus, label: 'Guests', path: '/guests', roles: ['admin', 'chapter_admin', 'member'] },
    { icon: Tags, label: 'Categories', path: '/categories', roles: ['admin'] },
    { icon: Settings, label: 'Settings', path: '/settings', roles: ['admin', 'chapter_admin', 'member', 'guest'] },
  ];

  const filteredMenu = menuItems.filter(item => profile && item.roles.includes(profile.role));

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-emerald-400">SSK Network</h1>
        <p className="text-xs text-slate-400 mt-1">Business Networking Ecosystem</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredMenu.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive 
                  ? "bg-emerald-500/10 text-emerald-400" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 mb-4">
          <img 
            src={profile?.photoURL || 'https://picsum.photos/seed/user/40/40'} 
            className="w-10 h-10 rounded-full border border-slate-700"
            referrerPolicy="no-referrer"
          />
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">{profile?.displayName}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
