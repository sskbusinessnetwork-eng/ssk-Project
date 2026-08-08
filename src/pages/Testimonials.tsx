import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { databaseService } from '../services/databaseService';
import { supabase } from '../lib/supabaseClient';
import { UserProfile, Testimonial, Chapter } from '../types';
import { MessageSquare, Star, Search, Plus, Trash2, Send, Inbox, Sparkles, Building2, User, ChevronRight } from 'lucide-react';
import { isValid } from 'date-fns';
import { safeFormat as format } from '../utils/dateUtils';
import { cn } from '../lib/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { WriteTestimonialModal } from '../components/WriteTestimonialModal';

import { getDisplayPosition as formatPosition } from "../utils/authUtils";

export function Testimonials() {
  const { profile } = useAuth();
  const currentUserId = profile?.uid || (profile as any)?.id;
  const [searchParams] = useSearchParams();
  const urlReferralId = searchParams.get('referralId');
  const urlRecipientId = searchParams.get('recipientId');

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [chaptersMap, setChaptersMap] = useState<Record<string, Chapter>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'give' | 'chapter' | 'all'>('received');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Testimonial modal states
  const [showMemberSelectModal, setShowMemberSelectModal] = useState(false);
  const [selectedReceiver, setSelectedReceiver] = useState<UserProfile | null>(null);
  const [selectedReferral, setSelectedReferral] = useState<any | null>(null);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const isMasterAdmin = profile?.role === 'MASTER_ADMIN';
  const isChapterAdmin = profile?.role === 'CHAPTER_ADMIN' || (profile?.role === 'MEMBER' && profile?.position === 'chapter_admin');
  const userChapterId = profile?.chapter_id || (profile as any)?.chapterId || profile?.adminId;

  // Auto-open modal if referralId or recipientId is provided in URL params
  useEffect(() => {
    const action = searchParams.get('action');
    const openModal = searchParams.get('openModal');

    if (!urlReferralId && !urlRecipientId) {
      if (action === 'new' || openModal === 'true') {
        setShowMemberSelectModal(true);
      }
      return;
    }

    let isMounted = true;
    const autoOpenFromUrl = async () => {
      try {
        let recUser: UserProfile | null = null;
        let refObj: any = null;

        if (urlReferralId) {
          const { data } = await supabase.from('referrals').select('*').eq('id', urlReferralId).maybeSingle();
          if (data) {
            refObj = data;
            const targetRecId = urlRecipientId || data.toUserId || data.receiver_id || data.to_user_id || data.receiverMemberId;
            if (targetRecId) {
              if (users[targetRecId]) {
                recUser = users[targetRecId];
              } else {
                recUser = await databaseService.get<UserProfile>('users', targetRecId);
              }
            }
          }
        }

        if (!recUser && urlRecipientId) {
          if (users[urlRecipientId]) {
            recUser = users[urlRecipientId];
          } else {
            recUser = await databaseService.get<UserProfile>('users', urlRecipientId);
          }
        }

        if (isMounted && recUser) {
          setSelectedReceiver(recUser);
          if (refObj) setSelectedReferral(refObj);
          setShowWriteModal(true);
        }
      } catch (err) {
        console.warn('Auto open testimonial from URL warning:', err);
      }
    };

    autoOpenFromUrl();
    return () => { isMounted = false; };
  }, [urlReferralId, urlRecipientId, users]);

  useEffect(() => {
    if (!profile) return;
    
    // Load users and chapters
    const loadData = async () => {
      try {
        const [allUsers, allChapters] = await Promise.all([
          databaseService.list<UserProfile>('users'),
          databaseService.list<Chapter>('chapters')
        ]);

        const userMap: Record<string, UserProfile> = {};
        allUsers.forEach(u => {
          const uId = u.uid || (u as any).id;
          if (uId) userMap[uId] = u;
        });
        setUsers(userMap);

        const chapMap: Record<string, Chapter> = {};
        allChapters.forEach(c => {
          if (c.id) chapMap[c.id] = c;
        });
        setChaptersMap(chapMap);
      } catch (e) {
        console.error("Error loading users or chapters", e);
      }
    };
    loadData();
    
    // Subscribe to testimonials
    const unsubscribe = databaseService.subscribe(
      'testimonials',
      [],
      (data: any[]) => {
        setTestimonials(data as Testimonial[]);
        setLoading(false);
      }
    );

    const handleRefresh = async () => {
      try {
        const freshData = await databaseService.list<Testimonial>('testimonials');
        setTestimonials(freshData);
      } catch (e) {
        console.warn("Refresh testimonials notice:", e);
      }
    };

    window.addEventListener('testimonials-updated', handleRefresh);
    window.addEventListener('dashboard-refresh', handleRefresh);
    
    return () => {
      unsubscribe();
      window.removeEventListener('testimonials-updated', handleRefresh);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, [profile]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this testimonial?')) {
      try {
        await databaseService.delete('testimonials', id);
        window.dispatchEvent(new CustomEvent('testimonials-updated'));
      } catch (error) {
        console.error("Delete error", error);
        alert('Failed to delete.');
      }
    }
  };

  const handleOpenGiveTestimonial = (member?: UserProfile) => {
    if (member) {
      setSelectedReceiver(member);
      setShowWriteModal(true);
      setShowMemberSelectModal(false);
    } else {
      setShowMemberSelectModal(true);
    }
  };

  const receivedTestimonials = useMemo(() => {
    return testimonials.filter(t => {
      const recId = t.receiverMemberId || t.receiver_id || (t as any).receiverId;
      return String(recId || '') === String(currentUserId || '');
    });
  }, [testimonials, currentUserId]);

  const sentTestimonials = useMemo(() => {
    return testimonials.filter(t => {
      const authId = t.authorMemberId || t.author_id || (t as any).authorId;
      return String(authId || '') === String(currentUserId || '');
    });
  }, [testimonials, currentUserId]);

  const filteredTestimonials = useMemo(() => {
    let filtered = testimonials;

    if (activeTab === 'received') {
      filtered = receivedTestimonials;
    } else if (activeTab === 'sent') {
      filtered = sentTestimonials;
    } else if (activeTab === 'all' && isMasterAdmin) {
      // Master admin view all
    } else {
      filtered = receivedTestimonials;
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => {
        const receiver = users[t.receiverMemberId]?.name?.toLowerCase() || '';
        const author = users[t.authorMemberId]?.name?.toLowerCase() || '';
        const text = t.testimonial?.toLowerCase() || '';
        const title = t.title?.toLowerCase() || '';
        const chapter = (users[t.authorMemberId]?.chapterName || chaptersMap[users[t.authorMemberId]?.chapter_id || '']?.chapter_name || '').toLowerCase();
        return receiver.includes(q) || author.includes(q) || text.includes(q) || title.includes(q) || chapter.includes(q);
      });
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [testimonials, activeTab, searchQuery, currentUserId, isMasterAdmin, userChapterId, users, chaptersMap]);

  // Active members list for selection
  const selectableMembers = useMemo(() => {
    const list: UserProfile[] = (Object.values(users) as UserProfile[]).filter((u: UserProfile) => {
      const uId = u.uid || (u as any).id;
      return uId && uId !== currentUserId;
    });

    if (!memberSearchQuery.trim()) return list;

    const q = memberSearchQuery.toLowerCase().trim();
    return list.filter((u: UserProfile) => {
      const name = u.name?.toLowerCase() || '';
      const business = u.businessName?.toLowerCase() || '';
      const category = u.category?.toLowerCase() || '';
      const chapter = (u.chapterName || chaptersMap[u.chapter_id || '']?.chapter_name || '').toLowerCase();
      return name.includes(q) || business.includes(q) || category.includes(q) || chapter.includes(q);
    });
  }, [users, currentUserId, memberSearchQuery, chaptersMap]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] sm:text-[24px] font-black text-white uppercase tracking-tight flex items-center gap-2">
            <MessageSquare className="text-[#E53935]" size={24} />
            Testimonials
          </h2>
          <p className="text-[11px] sm:text-xs text-[#9CA3AF] font-bold uppercase tracking-wider">
            Share and view member appreciations & testimonials
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenGiveTestimonial()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 cursor-pointer w-full sm:w-auto"
        >
          <Plus size={16} strokeWidth={3} />
          Give Testimonial
        </button>
      </div>

      {/* Analytics Summary Bar (For Admins) */}
      {(isMasterAdmin || isChapterAdmin) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#111827] p-4 rounded-[20px] border border-white/5">
            <div className="text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider">Total Testimonials</div>
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
            <div className="text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider">My Received</div>
            <div className="text-2xl font-black text-primary">{receivedTestimonials.length}</div>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex bg-[#111827] p-1.5 rounded-2xl border border-white/5 overflow-x-auto custom-scrollbar gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('received')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
              activeTab === 'received' ? "bg-primary text-white shadow-md" : "text-[#9CA3AF] hover:text-white hover:bg-white/5"
            )}
          >
            <Inbox size={15} />
            Received Testimonials
            {receivedTestimonials.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
                {receivedTestimonials.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
              activeTab === 'sent' ? "bg-primary text-white shadow-md" : "text-[#9CA3AF] hover:text-white hover:bg-white/5"
            )}
          >
            <Send size={15} />
            Sent Testimonials
            {sentTestimonials.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
                {sentTestimonials.length}
              </span>
            )}
          </button>

          {isMasterAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer",
                activeTab === 'all' ? "bg-primary text-white shadow-md" : "text-[#9CA3AF] hover:text-white hover:bg-white/5"
              )}
            >
              All Global
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
          <input
            type="text"
            placeholder="Search testimonials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-[240px] bg-[#111827] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'give' ? (
        <div className="bg-[#111827] rounded-[24px] p-6 sm:p-8 border border-white/5 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Sparkles size={32} />
          </div>
          <h3 className="text-xl font-bold text-white uppercase tracking-tight">Give a Testimonial</h3>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Select a member from your chapter or network to share your experience and appreciate their service.
          </p>
          <button
            type="button"
            onClick={() => handleOpenGiveTestimonial()}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-primary/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            Select Member & Write Testimonial
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-[#9CA3AF]">Loading testimonials...</div>
          ) : filteredTestimonials.length === 0 ? (
            <div className="col-span-full text-center py-12 text-[#9CA3AF] bg-[#111827] rounded-[24px] border border-white/5 space-y-3">
              <MessageSquare size={44} className="mx-auto opacity-20 text-white" />
              <p className="text-sm font-bold text-white">No testimonials found.</p>
              <p className="text-xs text-[#9CA3AF]">
                {activeTab === 'received' ? 'You have not received any testimonials yet.' :
                 activeTab === 'sent' ? 'You have not submitted any testimonials yet.' :
                 'No testimonials match your filter criteria.'}
              </p>
              {activeTab === 'sent' && (
                <button
                  type="button"
                  onClick={() => handleOpenGiveTestimonial()}
                  className="mt-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Give Your First Testimonial
                </button>
              )}
            </div>
          ) : (
            filteredTestimonials.map((t) => {
              const isReceivedTab = activeTab === 'received';
              const isSentTab = activeTab === 'sent';

              // Person being displayed as primary avatar/info
              const targetUserId = isReceivedTab ? t.authorMemberId : t.receiverMemberId;
              const personUser = users[targetUserId];
              const personName = personUser?.name || (isReceivedTab ? 'Sender' : 'Receiver');
              const personPhoto = personUser?.photoURL || (personUser as any)?.avatar_url;
              const personPosition = formatPosition(personUser?.position, personUser?.role);
              const personChapter = personUser?.chapterName || chaptersMap[personUser?.chapter_id || '']?.chapter_name || 'Chapter';

              const canDelete = isMasterAdmin || isChapterAdmin || t.authorMemberId === currentUserId;

              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    setSelectedTestimonial(t);
                    setShowDetailModal(true);
                  }}
                  className="bg-[#111827] rounded-xl p-3 border border-white/5 flex flex-col gap-2 relative group hover:border-white/10 transition-all shadow-md cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar
                        src={personPhoto}
                        name={personName}
                        size="w-8 h-8"
                        className="border border-white/10 rounded-full"
                        fallbackClassName="text-xs rounded-full"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                           <span className="text-white font-bold text-sm truncate">{personName}</span>
                           {t.status === 'APPROVED' && <Star size={10} className="text-emerald-500 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-primary font-semibold truncate">
                          {personPosition}
                        </div>
                      </div>
                    </div>
                    {isSentTab && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border shrink-0",
                        t.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        t.status === 'REJECTED' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      )}>
                        {t.status || 'PENDING'}
                      </span>
                    )}
                  </div>
                  <p className="text-[#9CA3AF] text-xs italic truncate">
                    "{t.testimonial}"
                  </p>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Select Member Modal */}
      <Modal
        isOpen={showMemberSelectModal}
        onClose={() => setShowMemberSelectModal(false)}
        title="SELECT MEMBER TO GIVE TESTIMONIAL"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
            <input
              type="text"
              placeholder="Search member by name, chapter, or business..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full bg-[#151C2E] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {selectableMembers.length === 0 ? (
              <div className="text-center py-8 text-[#9CA3AF] text-xs">
                No matching members found.
              </div>
            ) : (
              selectableMembers.map((member) => {
                const memId = member.uid || (member as any).id;
                const photo = member.photoURL || (member as any).avatar_url;
                const pos = formatPosition(member.position, member.role);
                const chap = member.chapterName || chaptersMap[member.chapter_id || '']?.chapter_name || 'Chapter';

                return (
                  <div
                    key={memId}
                    onClick={() => handleOpenGiveTestimonial(member)}
                    className="flex items-center justify-between p-3 rounded-[16px] bg-[#151C2E] hover:bg-[#1C2538] border border-white/5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={photo} name={member.name} size="md" />
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-primary transition-colors">
                          {member.name}
                        </div>
                        <div className="text-[10px] text-primary font-semibold">
                          {pos}
                        </div>
                        <div className="text-[10px] text-[#9CA3AF]">
                          {chap} {member.businessName ? `• ${member.businessName}` : ''}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenGiveTestimonial(member);
                      }}
                      className="px-3 py-1.5 bg-primary/10 group-hover:bg-primary text-primary group-hover:text-white border border-primary/20 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                    >
                      <span>Select</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTestimonial(null);
        }}
        title="Testimonial Details"
      >
        {selectedTestimonial && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar
                src={users[activeTab === 'received' ? selectedTestimonial.authorMemberId : selectedTestimonial.receiverMemberId]?.photoURL}
                name={users[activeTab === 'received' ? selectedTestimonial.authorMemberId : selectedTestimonial.receiverMemberId]?.name}
                size="w-12 h-12"
                className="border border-white/10 rounded-full"
              />
              <div>
                <p className="font-bold text-white text-lg">
                  {users[activeTab === 'received' ? selectedTestimonial.authorMemberId : selectedTestimonial.receiverMemberId]?.name || 'Member'}
                </p>
                <p className="text-primary text-sm font-semibold">
                  {formatPosition(users[activeTab === 'received' ? selectedTestimonial.authorMemberId : selectedTestimonial.receiverMemberId]?.position, users[activeTab === 'received' ? selectedTestimonial.authorMemberId : selectedTestimonial.receiverMemberId]?.role)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 text-[#F59E0B]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  fill={i < (selectedTestimonial.rating || 5) ? "currentColor" : "transparent"}
                  strokeWidth={i < (selectedTestimonial.rating || 5) ? 0 : 2}
                  className={i >= (selectedTestimonial.rating || 5) ? "text-[#374151]" : ""}
                />
              ))}
            </div>

            {selectedTestimonial.title && (
              <h3 className="text-white font-extrabold text-base">{selectedTestimonial.title}</h3>
            )}
            
            <p className="text-[#D1D5DB] text-sm leading-relaxed italic bg-[#151C2E] p-4 rounded-xl border border-white/5">
              "{selectedTestimonial.testimonial}"
            </p>

            <div className="flex justify-between items-center text-xs text-[#9CA3AF] pt-2 border-t border-white/5">
              <span>{format(new Date(selectedTestimonial.createdAt), 'dd MMM yyyy')}</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border",
                selectedTestimonial.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                selectedTestimonial.status === 'REJECTED' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                "bg-amber-500/10 text-amber-400 border-amber-500/20"
              )}>
                {selectedTestimonial.status || 'PENDING'}
              </span>
            </div>
            
            {(isMasterAdmin || isChapterAdmin || selectedTestimonial.authorMemberId === currentUserId) && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleDelete(selectedTestimonial.id);
                    setShowDetailModal(false);
                    setSelectedTestimonial(null);
                  }}
                  className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-xs font-bold transition-colors"
                >
                  Delete Testimonial
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Existing Testimonial Submission Modal */}
      {selectedReceiver && (
        <WriteTestimonialModal
          isOpen={showWriteModal}
          onClose={() => {
            setShowWriteModal(false);
            setSelectedReceiver(null);
            setSelectedReferral(null);
          }}
          author={profile}
          receiver={selectedReceiver}
          referralId={selectedReferral?.id || urlReferralId || undefined}
          referralObj={selectedReferral}
        />
      )}
    </div>
  );
}
