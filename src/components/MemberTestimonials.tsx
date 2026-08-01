import { Avatar } from '../components/Avatar';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, MessageSquare, Plus } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { UserProfile, Testimonial } from '../types';
import {  where, orderBy  } from '../lib/database';
import { format as originalFormat, isValid } from 'date-fns';
import { WriteTestimonialModal } from './WriteTestimonialModal';
import { Link } from 'react-router-dom';

const format = (date: any, formatStr: string, options?: any) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return isValid(d) ? originalFormat(d, formatStr, options) : 'N/A';
};

interface MemberTestimonialsProps {
  currentUser: UserProfile | null;
  targetUser: UserProfile;
}

export function MemberTestimonials({ currentUser, targetUser }: MemberTestimonialsProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authors, setAuthors] = useState<Record<string, UserProfile>>({});
  const [activeTab, setActiveTab] = useState<'RECEIVED' | 'SENT'>('RECEIVED');

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const receivedData = await databaseService.list('testimonials', [
          where('receiverMemberId', '==', targetUser.uid)
        ]);
        const sentData = await databaseService.list('testimonials', [
          where('authorMemberId', '==', targetUser.uid)
        ]);
        
        const allData = [...(receivedData as Testimonial[]), ...(sentData as Testimonial[])];
        
        // Deduplicate
        const uniqueData = Array.from(new Map(allData.map(item => [item.id, item])).values());

        // Sort manually by date desc
        const sorted = uniqueData.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setTestimonials(sorted);
        
        // Load authors and receivers
        if (sorted.length > 0) {
          const userIds = Array.from(new Set(sorted.flatMap(t => [t.authorMemberId, t.receiverMemberId]).filter(Boolean)));
          const allUsers = await databaseService.list<UserProfile>('users');
          const userMap: Record<string, UserProfile> = {};
          allUsers.forEach(u => {
            if (userIds.includes(u.uid)) {
              userMap[u.uid] = u;
            }
          });
          setAuthors(userMap);
        }
      } catch (error) {
        console.error("Error fetching testimonials:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTestimonials();
  }, [targetUser.uid, isModalOpen]); // refetch when modal closes

  const displayTestimonials = testimonials.filter(t => 
    activeTab === 'RECEIVED' ? t.receiverMemberId === targetUser.uid : t.authorMemberId === targetUser.uid
  );

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <MessageSquare size={20} className="text-[#F59E0B]" />
          Testimonials
        </h3>
        {currentUser && currentUser.uid !== targetUser.uid && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold bg-primary text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} /> Write
          </button>
        )}
      </div>

      <div className="flex border-b border-white/10 mb-4">
        <button
          onClick={() => setActiveTab('RECEIVED')}
          className={`px-4 py-2 text-[11px] font-bold tracking-wider uppercase transition-colors relative ${activeTab === 'RECEIVED' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Received
          {activeTab === 'RECEIVED' && (
            <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" layoutId="testimonialTab" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('SENT')}
          className={`px-4 py-2 text-[11px] font-bold tracking-wider uppercase transition-colors relative ${activeTab === 'SENT' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Sent
          {activeTab === 'SENT' && (
            <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" layoutId="testimonialTab" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-6 text-[#9CA3AF] text-sm">Loading testimonials...</div>
      ) : displayTestimonials.length === 0 ? (
        <div className="bg-[#111827] rounded-[20px] border border-white/5 p-8 text-center text-[#9CA3AF]">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">
            {activeTab === 'RECEIVED' ? 'No testimonials received yet.' : 'No testimonials sent yet.'}
          </p>
          {activeTab === 'RECEIVED' && currentUser && currentUser.uid !== targetUser.uid && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-3 text-primary text-xs font-bold hover:underline"
            >
              Be the first to write one
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayTestimonials.slice(0, 3).map((t) => {
            const displayUserId = activeTab === 'RECEIVED' ? t.authorMemberId : t.receiverMemberId;
            return (
            <div key={t.id} className="bg-[#111827] rounded-[20px] border border-white/5 p-5 flex flex-col gap-3 relative">
              <div className="flex items-center gap-1 text-[#F59E0B]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill={i < (t.rating || 5) ? "currentColor" : "transparent"} strokeWidth={i < (t.rating || 5) ? 0 : 2} className={i >= (t.rating || 5) ? "text-[#374151]" : ""} />
                ))}
              </div>
              
              {t.title && <h4 className="text-white font-bold text-sm">{t.title}</h4>}
              <p className="text-[#D1D5DB] text-sm italic leading-relaxed">"{t.testimonial}"</p>
              
              <div className="pt-3 border-t border-white/5 flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#1F2937] flex items-center justify-center font-bold text-xs text-white">
                    {authors[displayUserId]?.name?.substring(0,2).toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">
                      {authors[displayUserId]?.name || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">
                      {activeTab === 'RECEIVED' ? 'From' : 'To'} • {authors[displayUserId]?.businessName || 'Member'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-[#6B7280]">
                  {format(new Date(t.createdAt), 'MMM yyyy')}
                </span>
              </div>
            </div>
          )})}
          
          {displayTestimonials.length > 3 && (
            <Link to="/testimonials" className="block text-center text-primary text-xs font-bold py-2 hover:underline">
              View All {displayTestimonials.length} Testimonials
            </Link>
          )}
        </div>
      )}
      <WriteTestimonialModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        author={currentUser}
        receiver={targetUser}
      />
    </div>
  );
}
