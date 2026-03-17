import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  Share2, 
  Award, 
  Calendar,
  Clock,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Chapter, Referral, ThankYouSlip } from '../types';
import { format } from 'date-fns';

export function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    referralsPassed: 0,
    referralsReceived: 0,
    businessGenerated: 0,
    attendanceRate: '0%'
  });
  const [recentReferrals, setRecentReferrals] = useState<Referral[]>([]);
  const [chapter, setChapter] = useState<Chapter | null>(null);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      // Fetch stats
      const passedQuery = query(collection(db, 'referrals'), where('fromUserId', '==', profile.uid));
      const receivedQuery = query(collection(db, 'referrals'), where('toUserId', '==', profile.uid));
      const slipsQuery = query(collection(db, 'thank_you_slips'), where('fromUserId', '==', profile.uid));
      
      const [passedSnap, receivedSnap, slipsSnap] = await Promise.all([
        getDocs(passedQuery),
        getDocs(receivedQuery),
        getDocs(slipsQuery)
      ]);

      const totalBusiness = slipsSnap.docs.reduce((acc, doc) => acc + (doc.data().businessValue || 0), 0);

      setStats({
        referralsPassed: passedSnap.size,
        referralsReceived: receivedSnap.size,
        businessGenerated: totalBusiness,
        attendanceRate: '95%' // Mock for now
      });

      // Fetch recent referrals
      const recentQuery = query(
        collection(db, 'referrals'), 
        where('toUserId', '==', profile.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentSnap = await getDocs(recentQuery);
      setRecentReferrals(recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral)));

      // Fetch chapter info
      if (profile.chapterId) {
        const chapterSnap = await getDocs(query(collection(db, 'chapters'), where('id', '==', profile.chapterId)));
        if (!chapterSnap.empty) {
          setChapter({ id: chapterSnap.docs[0].id, ...chapterSnap.docs[0].data() } as Chapter);
        }
      }
    };

    fetchData();
  }, [profile]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back, {profile?.displayName?.split(' ')[0]}</h1>
        <p className="text-slate-500 mt-1">Here's what's happening in your network today.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Referrals Passed', value: stats.referralsPassed, icon: Share2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Referrals Received', value: stats.referralsReceived, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Business Generated', value: `₹${stats.businessGenerated.toLocaleString()}`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Attendance Rate', value: stats.attendanceRate, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", stat.bg, stat.color)}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Referrals */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recent Referrals Received</h2>
            <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View All <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {recentReferrals.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentReferrals.map((ref) => (
                  <div key={ref.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{ref.contactName}</p>
                      <p className="text-sm text-slate-500">{ref.requirement}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "inline-block px-2 py-1 text-xs font-bold rounded-full uppercase tracking-wider",
                        ref.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {ref.status}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">{format(new Date(ref.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Share2 size={32} />
                </div>
                <p className="text-slate-500">No referrals received yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chapter Info */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Your Chapter</h2>
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Building2 size={80} />
            </div>
            
            {chapter ? (
              <div className="relative z-10 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-emerald-400">{chapter.name}</h3>
                  <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                    <MapPin size={14} /> {chapter.location}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar size={18} className="text-emerald-500" />
                    <span>Every {chapter.meetingDay}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock size={18} className="text-emerald-500" />
                    <span>{chapter.meetingTime}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin size={18} className="text-emerald-500" />
                    <span className="truncate">{chapter.meetingVenue}</span>
                  </div>
                </div>

                <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors text-sm">
                  View Chapter Details
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">You are not assigned to a chapter yet.</p>
                <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold text-sm">
                  Find a Chapter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { Building2 } from 'lucide-react';
