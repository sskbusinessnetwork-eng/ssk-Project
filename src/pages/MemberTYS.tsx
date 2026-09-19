import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { SubmitThankYouSlipModal } from '../components/modals/SubmitThankYouSlipModal';
import { 
  Award, Search, Filter, Building2, Phone, 
  ChevronRight, Clock, RefreshCw, AlertCircle, Calendar,
  User, ArrowRight
} from 'lucide-react';
import { safeFormat as format } from '../utils/dateUtils';
import { Chapter, isOfflineReferral } from '../types';

export interface PendingTysRecord {
  referralId: string;
  referralDate: string;
  customerName: string;
  contactPhone: string;
  businessRequirement: string;
  notes: string;
  rawStatus: string;
  // Member on whose behalf TYS will be sent (the recipient of the referral)
  member: any;
  memberId: string;
  memberName: string;
  memberCompany: string;
  memberCategory: string;
  memberCode: string;
  memberPhoto?: string;
  memberChapter: string;
  // Referrer (who gave the referral and will receive the thank you slip)
  referrer: any;
  referrerId: string;
  referrerName: string;
  referrerCompany: string;
  referrerCategory: string;
  referrerPhoto?: string;
  referrerChapter: string;
}

export function MemberTYS() {
  const { profile } = useAuth();
  
  // Chapter state
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');

  // Data states
  const [pendingRecords, setPendingRecords] = useState<PendingTysRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // TYS Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMemberForTYS, setSelectedMemberForTYS] = useState<any | null>(null);
  const [selectedReferralIdForTYS, setSelectedReferralIdForTYS] = useState<string | undefined>(undefined);

  // 1. Load chapters and resolve current Chapter Admin's chapter
  useEffect(() => {
    if (!profile) return;

    let isMounted = true;
    const fetchChapters = async () => {
      try {
        const { data: chaptersData } = await supabase
          .from('chapters')
          .select('*')
          .order('chapter_name');

        if (!isMounted) return;

        const chaps = (chaptersData || []) as Chapter[];
        setAllChapters(chaps);

        const currentUid = String(profile.uid || profile.id || '');
        const currentChapId = String(profile.chapter_id || (profile as any).chapterId || '').trim();

        let myChap = chaps.find(c => String(c.id) === currentChapId);

        if (!myChap) {
          myChap = chaps.find(c => 
            String(c.chapter_admin_id) === currentUid ||
            String(c.president_id) === currentUid ||
            String(c.vice_president_id) === currentUid ||
            String(c.treasurer_id) === currentUid
          );
        }

        if (myChap) {
          setCurrentChapter(myChap);
          setSelectedChapterId(myChap.id);
        } else if (profile.role === 'MASTER_ADMIN' && chaps.length > 0) {
          setCurrentChapter(chaps[0]);
          setSelectedChapterId(chaps[0].id);
        }
      } catch (err) {
        console.warn('Error resolving chapter for Member TYS:', err);
      }
    };

    fetchChapters();
    return () => { isMounted = false; };
  }, [profile]);

  // 2. Load Pending TYS records based on Referrals & Slips
  const loadTysData = useCallback(async () => {
    if (!selectedChapterId) return;

    setLoading(true);
    try {
      // 1. Fetch all users for lookup
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*');

      if (usersErr) throw usersErr;

      const usersMap: Record<string, any> = {};
      const chapterMemberIds = new Set<string>();

      (usersData || []).forEach((u: any) => {
        const uid = String(u.uid || u.id || '').toLowerCase();
        if (uid) usersMap[uid] = u;
        if (u.id) usersMap[String(u.id).toLowerCase()] = u;
        if (u.uid) usersMap[String(u.uid).toLowerCase()] = u;

        // Check if user belongs to this chapter
        const uChapId = String(u.chapter_id || u.chapterId || '').trim();
        const uChapName = String(u.chapter_name || u.chapterName || '').trim().toLowerCase();
        const targetChapName = currentChapter?.chapter_name?.trim().toLowerCase() || '';

        if (uChapId === selectedChapterId || (targetChapName && uChapName === targetChapName)) {
          chapterMemberIds.add(String(u.id || '').toLowerCase());
          chapterMemberIds.add(String(u.uid || '').toLowerCase());
        }
      });

      // 2. Fetch all Thank You Slips to find which referrals already have a TYS
      const { data: slipsData, error: slipsErr } = await supabase
        .from('thank_you_slips')
        .select('referral_id');

      if (slipsErr) throw slipsErr;

      // Collect IDs of referrals that have already received a Thank You Slip
      const thankedReferralIds = new Set<string>();
      (slipsData || []).forEach((s: any) => {
        const refId = String(s.referral_id || s.referralId || '');
        if (refId) thankedReferralIds.add(refId);
      });

      // 3. Fetch all Referrals
      const { data: refData, error: refErr } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (refErr) throw refErr;

      const pending: PendingTysRecord[] = [];

      (refData || []).forEach((r: any) => {
        // Exclude direct offline referrals which are not regular passed referrals
        if (isOfflineReferral(r)) return;

        const refId = String(r.id);
        const senderId = String(r.sender_id || r.from_user_id || '').toLowerCase();
        const receiverId = String(r.receiver_id || r.to_user_id || '').toLowerCase();

        // Check if this referral involves a member in this Chapter Admin's chapter
        const isReceiverInChapter = chapterMemberIds.has(receiverId);
        const isSenderInChapter = chapterMemberIds.has(senderId);
        const isChapterMatched = String(r.chapter_id || r.chapterId || '') === selectedChapterId;

        if (!isReceiverInChapter && !isSenderInChapter && !isChapterMatched) {
          return;
        }

        // Check whether Thank You Slip already exists for this referral
        const hasTys = thankedReferralIds.has(refId);
        if (hasTys) return;

        const senderObj = usersMap[senderId] || {};
        const receiverObj = usersMap[receiverId] || {};

        // In SSK Business Network, the member who RECEIVED the referral is the one who owes
        // and submits the Thank You Slip to the Referrer (who gave the business lead).
        const memberObj = isReceiverInChapter ? receiverObj : (receiverObj.id ? receiverObj : senderObj);
        const referrerObj = isReceiverInChapter ? senderObj : senderObj;

        const memberName = memberObj.name || memberObj.displayName || memberObj.full_name || r.receiver_name || 'Member';
        const memberCode = memberObj.member_id || memberObj.memberId || memberObj.unique_id || (memberObj.id ? `#${String(memberObj.id).slice(0, 6).toUpperCase()}` : '');
        const memberCompany = memberObj.companyName || memberObj.company_name || memberObj.businessName || '';
        const memberCategory = memberObj.category || memberObj.businessCategory || '';
        const memberChapter = memberObj.chapter_name || memberObj.chapterName || currentChapter?.chapter_name || '';

        const referrerName = referrerObj.name || referrerObj.displayName || referrerObj.full_name || r.sender_name || 'Referrer';
        const referrerCompany = referrerObj.companyName || referrerObj.company_name || referrerObj.businessName || '';
        const referrerCategory = referrerObj.category || referrerObj.businessCategory || '';
        const referrerChapter = referrerObj.chapter_name || referrerObj.chapterName || '';

        pending.push({
          referralId: refId,
          referralDate: r.created_at || r.createdAt || new Date().toISOString(),
          customerName: r.contact_name || r.customer_name || 'Client',
          contactPhone: r.contact_phone || r.customer_mobile || r.phone || '',
          businessRequirement: r.business_requirement || r.requirement || 'Business Referral',
          notes: r.notes || '',
          rawStatus: r.status || 'Pending',
          member: memberObj,
          memberId: String(memberObj.uid || memberObj.id || receiverId),
          memberName,
          memberCompany,
          memberCategory,
          memberCode,
          memberPhoto: memberObj.photoURL || memberObj.avatar_url,
          memberChapter,
          referrer: referrerObj,
          referrerId: String(referrerObj.uid || referrerObj.id || senderId),
          referrerName,
          referrerCompany,
          referrerCategory,
          referrerPhoto: referrerObj.photoURL || referrerObj.avatar_url,
          referrerChapter
        });
      });

      setPendingRecords(pending);
    } catch (err) {
      console.warn('Error loading Member TYS data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedChapterId, currentChapter]);

  useEffect(() => {
    loadTysData();
  }, [loadTysData]);

  // Real-time updates on slips, referrals, or users changes
  useEffect(() => {
    const handleSlipsUpdate = () => loadTysData();
    const handleReferralsUpdate = () => loadTysData();

    window.addEventListener('slips-updated', handleSlipsUpdate);
    window.addEventListener('referrals-updated', handleReferralsUpdate);

    const channel = supabase
      .channel('member-tys-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'thank_you_slips' }, () => {
        loadTysData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => {
        loadTysData();
      })
      .subscribe();

    return () => {
      window.removeEventListener('slips-updated', handleSlipsUpdate);
      window.removeEventListener('referrals-updated', handleReferralsUpdate);
      supabase.removeChannel(channel);
    };
  }, [loadTysData]);

  // Filtered pending records
  const filteredPending = useMemo(() => {
    return pendingRecords.filter(item => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        item.memberName.toLowerCase().includes(q) ||
        item.memberCode.toLowerCase().includes(q) ||
        item.memberCompany.toLowerCase().includes(q) ||
        item.referrerName.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.businessRequirement.toLowerCase().includes(q) ||
        item.contactPhone.toLowerCase().includes(q);

      const matchesCategory = selectedCategory === 'ALL' || 
        item.memberCategory === selectedCategory || 
        item.referrerCategory === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [pendingRecords, searchTerm, selectedCategory]);

  // Categories list for filter
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    pendingRecords.forEach(item => {
      if (item.memberCategory) set.add(item.memberCategory.trim());
      if (item.referrerCategory) set.add(item.referrerCategory.trim());
    });
    return Array.from(set).sort();
  }, [pendingRecords]);

  // Handle Chapter Admin clicking "Send Thank You Slip" on a pending record
  const handleStartTYS = (record: PendingTysRecord) => {
    setSelectedMemberForTYS(record.member);
    setSelectedReferralIdForTYS(record.referralId);
    setIsModalOpen(true);
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      
      {/* Header Banner - Responsive Stacking & Spacing */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#11131A] border border-white/10 p-4 sm:p-6 rounded-2xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2.5 z-10">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/20 shrink-0 mt-0.5 sm:mt-0">
              <Award className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  Member TYS
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center gap-1 shrink-0">
                  <Clock size={11} />
                  Pending Slips
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 font-medium line-clamp-2 sm:line-clamp-1">
                Submit Thank You Slips on behalf of members for pending converted referrals.
              </p>
            </div>
          </div>

          {/* Chapter Details & Pending Count Badges - Mobile Responsive Wrap */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-semibold max-w-full truncate">
              <Building2 size={13} className="text-primary shrink-0" />
              <span className="truncate">Chapter: <strong className="text-white">{currentChapter?.chapter_name || profile?.chapter_name || profile?.chapterName || 'Associated Chapter'}</strong></span>
            </span>

            {profile?.role === 'MASTER_ADMIN' && allChapters.length > 1 && (
              <select
                value={selectedChapterId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedChapterId(id);
                  const found = allChapters.find(c => c.id === id);
                  if (found) setCurrentChapter(found);
                }}
                className="w-full sm:w-auto px-2.5 py-1 rounded-lg bg-[#151C2E] border border-white/10 text-xs text-neutral-200 outline-none focus:border-primary cursor-pointer font-medium min-h-[36px] sm:min-h-0"
              >
                {allChapters.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.chapter_name}
                  </option>
                ))}
              </select>
            )}

            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold shrink-0">
              <AlertCircle size={13} />
              <span>{pendingRecords.length} Pending {pendingRecords.length === 1 ? 'Slip' : 'Slips'}</span>
            </span>
          </div>
        </div>

        {/* Quick Refresh Button */}
        <div className="flex items-center justify-end z-10 shrink-0">
          <button
            onClick={() => loadTysData()}
            className="w-full sm:w-auto px-3.5 py-2 sm:p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-semibold min-h-[42px] sm:min-h-[40px]"
            title="Refresh Pending List"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* PENDING THANK YOU SLIPS (Primary Mobile-Responsive Content) */}
      <div className="space-y-4 sm:space-y-5">
        
        {/* Search & Filter Bar - Fluid Stacking on Mobile */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search member, client name, requirement..."
              className="w-full pl-10 pr-12 py-2.5 h-11 sm:h-10 rounded-xl border border-white/10 bg-[#11131A] text-white text-xs sm:text-sm font-medium placeholder-neutral-500 focus:outline-none focus:border-primary transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-neutral-400 hover:text-white rounded-md hover:bg-white/10 min-h-[32px] flex items-center"
              >
                Clear
              </button>
            )}
          </div>

          {categoriesList.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={14} className="text-neutral-400 shrink-0 hidden sm:block" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto px-3 py-2.5 h-11 sm:h-10 rounded-xl border border-white/10 bg-[#11131A] text-xs sm:text-sm text-neutral-200 focus:outline-none focus:border-primary cursor-pointer font-medium"
              >
                <option value="ALL">All Categories</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Pending Cards List Display */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-4 sm:p-5 rounded-2xl bg-[#11131A] border border-white/5 animate-pulse space-y-3">
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="h-14 bg-white/5 rounded-xl" />
                <div className="h-10 bg-white/5 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredPending.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4 bg-[#11131A] border border-white/5 rounded-2xl space-y-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
              <Clock className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">No Pending Thank You Slips</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
              {searchTerm || selectedCategory !== 'ALL'
                ? 'No pending referrals match your search filters.'
                : 'All chapter referrals have had their Thank You Slips completed, or no new referrals are currently waiting for slips.'}
            </p>
            {(searchTerm || selectedCategory !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('ALL');
                }}
                className="text-xs text-primary font-bold hover:underline p-2"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
            {filteredPending.map((record) => (
              <div 
                key={record.referralId}
                className="p-4 sm:p-5 rounded-2xl bg-[#11131A] border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between group shadow-xl relative overflow-hidden space-y-3.5"
              >
                <div className="space-y-3 sm:space-y-3.5">
                  
                  {/* Top Row: Date & Pending Status Badge - Responsive Wrapping */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5 sm:pb-3">
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-neutral-400 font-medium">
                      <Calendar size={13} className="text-neutral-500 shrink-0" />
                      <span>Date: <strong className="text-neutral-200">{record.referralDate ? format(new Date(record.referralDate), 'dd MMM yyyy') : 'Recent'}</strong></span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-sm shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Pending TYS
                    </span>
                  </div>

                  {/* Client & Requirement Info Box */}
                  <div className="bg-[#151C2E]/70 p-3 sm:p-3.5 rounded-xl border border-white/5 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        Client / Requirement
                      </span>
                      {record.contactPhone && (
                        <a 
                          href={`tel:${record.contactPhone}`} 
                          className="text-[11px] sm:text-xs text-neutral-300 font-mono flex items-center gap-1 hover:text-primary transition-colors py-0.5"
                          title="Call Client"
                        >
                          <Phone size={11} className="text-primary shrink-0" />
                          <span>{record.contactPhone}</span>
                        </a>
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-white break-words">
                      {record.customerName}
                    </h4>

                    <p className="text-xs sm:text-sm text-neutral-300 line-clamp-2 break-words">
                      {record.businessRequirement}
                    </p>

                    {record.notes && (
                      <p className="text-[11px] italic text-neutral-400 pt-1 border-t border-white/5 break-words">
                        "{record.notes}"
                      </p>
                    )}
                  </div>

                  {/* Member & Referrer Relationship - Stacks neatly on small mobile, 2 cols on wider screens */}
                  <div className="grid grid-cols-1 min-[440px]:grid-cols-2 gap-2 sm:gap-2.5 text-xs">
                    {/* Member on whose behalf TYS will be sent (Receiver of Referral) */}
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-primary block">
                          TYS Sender (Member)
                        </span>
                        <p className="font-bold text-white text-xs sm:text-sm break-words line-clamp-1">
                          {record.memberName}
                        </p>
                        {record.memberCompany && (
                          <p className="text-[11px] text-neutral-400 truncate">
                            {record.memberCompany}
                          </p>
                        )}
                      </div>
                      <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        {record.memberCode && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400">
                            {record.memberCode}
                          </span>
                        )}
                        {record.memberCategory && (
                          <span className="text-[9px] text-neutral-500 truncate">
                            {record.memberCategory}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Referrer (Who gave the referral) */}
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                          Given By (Referrer)
                        </span>
                        <p className="font-bold text-white text-xs sm:text-sm break-words line-clamp-1">
                          {record.referrerName}
                        </p>
                        {record.referrerCompany && (
                          <p className="text-[11px] text-neutral-400 truncate">
                            {record.referrerCompany}
                          </p>
                        )}
                      </div>
                      <div className="pt-1">
                        {record.referrerCategory ? (
                          <span className="text-[9px] text-neutral-500 truncate block">
                            {record.referrerCategory}
                          </span>
                        ) : (
                          <span className="text-[9px] text-neutral-500 truncate block">
                            {record.referrerChapter || 'Member'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button: Complete TYS on behalf of Member - Min 44px Touch Target */}
                <div className="pt-3 border-t border-white/5">
                  <button
                    onClick={() => handleStartTYS(record)}
                    className="w-full min-h-[46px] sm:min-h-[48px] py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-98 group/btn"
                  >
                    <Award size={16} className="text-white shrink-0" />
                    <span>Send Thank You Slip</span>
                    <ChevronRight size={15} className="opacity-70 group-hover/btn:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Thank You Slip Modal for the Selected Referral & Member */}
      {isModalOpen && selectedMemberForTYS && (
        <SubmitThankYouSlipModal
          isOpen={isModalOpen}
          initialReferralId={selectedReferralIdForTYS}
          senderUser={selectedMemberForTYS}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMemberForTYS(null);
            setSelectedReferralIdForTYS(undefined);
          }}
          onSuccess={() => {
            // Re-fetch data upon successful submission
            loadTysData();
          }}
        />
      )}
    </div>
  );
}
