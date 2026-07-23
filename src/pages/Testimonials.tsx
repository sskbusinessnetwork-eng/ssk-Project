import { Avatar } from '../components/Avatar';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { databaseService } from '../services/databaseService';
import { notificationService } from '../services/notificationService';
import { UserProfile, Testimonial } from '../types';
import {  where, orderBy  } from '../lib/database';
import { MessageSquare, Star, Search, Filter, Plus, Trash2, CheckCircle2, Clock, MapPin, Building2, User, X, Check, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export function Testimonials() {
  const { profile } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'written' | 'chapter' | 'all'>('received');
  const [searchQuery, setSearchQuery] = useState('');
  
  const isChapterAdmin = profile?.role === 'CHAPTER_ADMIN' || (profile?.role === 'MEMBER' && profile?.position === 'chapter_admin');

  useEffect(() => {
    if (!profile) return;
    
    // Load users
    const loadUsers = async () => {
      try {
        const allUsers = await databaseService.list<UserProfile>('users');
        const userMap: Record<string, UserProfile> = {};
        allUsers.forEach(u => { userMap[u.uid] = u; });
        setUsers(userMap);
      } catch (e) {
        console.error("Error loading users", e);
      }
    };
    loadUsers();
    
    // Subscribe to testimonials based on role
    let constraints: any[] = [];
    if (profile.role === 'MASTER_ADMIN') {
      // no constraint
    } else if (isChapterAdmin) {
      const adminId = profile.chapter_id || profile.uid;
      constraints = [where('chapterId', '==', adminId)];
    } else {
      // For MEMBER, we only fetch what they wrote or received, BUT wait,
      // "View public testimonials" - maybe members can see all chapter testimonials?
      // Let's fetch all chapter testimonials if member, to allow search.
      const adminId = profile.chapter_id || profile.adminId;
      if (adminId) {
        constraints = [where('chapterId', '==', adminId)];
      } else {
        constraints = [where('receiverMemberId', '==', profile.uid)];
      }
    }
    
    const unsubscribe = databaseService.subscribe(
      'testimonials',
      constraints,
      (data: any[]) => {
        setTestimonials(data as Testimonial[]);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [profile]);
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this testimonial?')) {
      try {
        await databaseService.delete('testimonials', id);
      } catch (error) {
        console.error("Delete error", error);
        alert('Failed to delete.');
      }
    }
  };
  
  const filteredTestimonials = useMemo(() => {
    let filtered = testimonials;
    
    // Tab filter
    if (activeTab === 'received') {
      filtered = filtered.filter(t => t.receiverMemberId === profile?.uid);
    } else if (activeTab === 'written') {
      filtered = filtered.filter(t => t.authorMemberId === profile?.uid);
    } else if (activeTab === 'chapter') {
      // everything already fetched is chapter for chapter admin
    }
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => {
        const receiver = users[t.receiverMemberId]?.name?.toLowerCase() || '';
        const author = users[t.authorMemberId]?.name?.toLowerCase() || '';
        const text = t.testimonial?.toLowerCase() || '';
        const title = t.title?.toLowerCase() || '';
        return receiver.includes(q) || author.includes(q) || text.includes(q) || title.includes(q);
      });
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [testimonials, activeTab, searchQuery, profile, users]);
  
  return (
    <div className="space-y-6 pb-20">
       <div>
        <h2 className="text-[20px] sm:text-[24px] font-black text-white uppercase tracking-tight flex items-center gap-2">
          <MessageSquare className="text-[#E53935]" size={24} />
          Testimonials
        </h2>
        <p className="text-[11px] sm:text-xs text-[#9CA3AF] font-bold uppercase tracking-wider">
          Manage and view member testimonials
        </p>
      </div>
      
      {/* Analytics (For Admins) */}
      {(profile?.role === 'MASTER_ADMIN' || isChapterAdmin) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#111827] p-4 rounded-[20px] border border-white/5">
             <div className="text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider">Total</div>
             <div className="text-2xl font-black text-white">{testimonials.length}</div>
          </div>
          <div className="bg-[#111827] p-4 rounded-[20px] border border-white/5">
             <div className="text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider">This Month</div>
             <div className="text-2xl font-black text-[#10B981]">
               {testimonials.filter(t => new Date(t.createdAt).getMonth() === new Date().getMonth()).length}
             </div>
          </div>
          <div className="bg-[#111827] p-4 rounded-[20px] border border-white/5">
             <div className="text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider">Avg Rating</div>
             <div className="text-2xl font-black text-[#F59E0B]">
               {testimonials.length > 0 ? (testimonials.reduce((acc, t) => acc + (Number(t.rating) || 5), 0) / testimonials.length).toFixed(1) : '0.0'}
             </div>
          </div>
          <div className="bg-[#111827] p-4 rounded-[20px] border border-white/5">
             <div className="text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider">Most Appreciated</div>
             <div className="text-sm font-bold text-white truncate mt-1">
               {/* Simple logic for most appreciated */}
               {testimonials.length > 0 ? users[Object.entries(testimonials.reduce((acc, t) => {
                 acc[t.receiverMemberId] = (acc[t.receiverMemberId] || 0) + 1;
                 return acc;
               }, {} as Record<string, number>)).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0]]?.name || 'N/A' : 'N/A'}
             </div>
          </div>
        </div>
      )}
      
      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex bg-[#111827] p-1 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar">
          <button 
            onClick={() => setActiveTab('received')}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap", activeTab === 'received' ? "bg-primary text-white" : "text-[#9CA3AF] hover:text-white")}
          >
            Received
          </button>
          <button 
            onClick={() => setActiveTab('written')}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap", activeTab === 'written' ? "bg-primary text-white" : "text-[#9CA3AF] hover:text-white")}
          >
            Written
          </button>
          {isChapterAdmin && (
            <button 
              onClick={() => setActiveTab('chapter')}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap", activeTab === 'chapter' ? "bg-primary text-white" : "text-[#9CA3AF] hover:text-white")}
            >
              Chapter
            </button>
          )}
          {profile?.role === 'MASTER_ADMIN' && (
            <button 
              onClick={() => setActiveTab('all')}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap", activeTab === 'all' ? "bg-primary text-white" : "text-[#9CA3AF] hover:text-white")}
            >
              All Global
            </button>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
          <input 
            type="text" 
            placeholder="Search testimonials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-[250px] bg-[#111827] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder-[#6B7280] focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>
      
      {/* Testimonials List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
           <div className="col-span-full text-center py-12 text-[#9CA3AF]">Loading testimonials...</div>
        ) : filteredTestimonials.length === 0 ? (
           <div className="col-span-full text-center py-12 text-[#9CA3AF] bg-[#111827] rounded-[20px] border border-white/5">
             <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
             No testimonials found.
           </div>
        ) : (
          filteredTestimonials.map(t => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111827] rounded-[20px] p-5 border border-white/5 flex flex-col gap-3 relative group"
            >
              {(profile?.role === 'MASTER_ADMIN' || isChapterAdmin || t.authorMemberId === profile?.uid) && (
                <button 
                  onClick={() => handleDelete(t.id)}
                  className="absolute top-4 right-4 text-[#9CA3AF] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              )}
              
              <div className="flex items-center gap-1 text-[#F59E0B]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill={i < (t.rating || 5) ? "currentColor" : "transparent"} strokeWidth={i < (t.rating || 5) ? 0 : 2} className={i >= (t.rating || 5) ? "text-[#374151]" : ""} />
                ))}
              </div>
              
              {t.title && <h3 className="text-white font-bold text-[15px]">{t.title}</h3>}
              
              <p className="text-[#D1D5DB] text-[14px] leading-relaxed italic">
                "{t.testimonial}"
              </p>
              
              <div className="mt-2 pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                    {users[t.authorMemberId]?.name?.substring(0,2).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-white">
                      <Link to={`/profile?id=${t.authorMemberId}`} className="hover:text-primary transition-colors">
                        {users[t.authorMemberId]?.name || 'Unknown'}
                      </Link>
                    </div>
                    <div className="text-[10px] text-[#9CA3AF]">{users[t.authorMemberId]?.businessName || 'Member'}</div>
                  </div>
                </div>
                
                <div className="text-[10px] text-[#6B7280]">
                  {format(new Date(t.createdAt), 'MMM d, yyyy')}
                </div>
              </div>
              
              <div className="text-[10px] font-medium text-[#9CA3AF] mt-1">
                To: <Link to={`/profile?id=${t.receiverMemberId}`} className="text-white hover:text-primary">{users[t.receiverMemberId]?.name || 'Unknown'}</Link>
              </div>
            </motion.div>
          ))
        )}
      </div>
      
    </div>
  );
}
