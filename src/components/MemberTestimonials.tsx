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

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const data = await databaseService.list('testimonials', [
          where('receiverMemberId', '==', targetUser.uid)
        ]);
        
        // Sort manually by date desc
        const sorted = (data as Testimonial[]).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setTestimonials(sorted);
        
        // Load authors
        if (sorted.length > 0) {
          const authorIds = Array.from(new Set(sorted.map(t => t.authorMemberId)));
          const allUsers = await databaseService.list<UserProfile>('users');
          const authorMap: Record<string, UserProfile> = {};
          allUsers.forEach(u => {
            if (authorIds.includes(u.uid)) {
              authorMap[u.uid] = u;
            }
          });
          setAuthors(authorMap);
        }
      } catch (error) {
        console.error("Error fetching testimonials:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTestimonials();
  }, [targetUser.uid, isModalOpen]); // refetch when modal closes

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

      {loading ? (
        <div className="text-center py-6 text-[#9CA3AF] text-sm">Loading testimonials...</div>
      ) : testimonials.length === 0 ? (
        <div className="bg-[#111827] rounded-[20px] border border-white/5 p-8 text-center text-[#9CA3AF]">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No testimonials yet.</p>
          {currentUser && currentUser.uid !== targetUser.uid && (
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
          {testimonials.slice(0, 3).map((t) => (
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
                    {authors[t.authorMemberId]?.name?.substring(0,2).toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">
                      {authors[t.authorMemberId]?.name || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">
                      {authors[t.authorMemberId]?.businessName || 'Member'} • {authors[t.authorMemberId]?.chapterName || 'SSK'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-[#6B7280]">
                  {format(new Date(t.createdAt), 'MMM yyyy')}
                </span>
              </div>
            </div>
          ))}
          
          {testimonials.length > 3 && (
            <Link to="/testimonials" className="block text-center text-primary text-xs font-bold py-2 hover:underline">
              View All {testimonials.length} Testimonials
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
