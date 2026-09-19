import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Handshake, 
  ChevronRight, 
  ChevronLeft,
  HelpCircle, 
  SlidersHorizontal, 
  Search, 
  X, 
  Calendar, 
  User, 
  Building2, 
  Phone, 
  MessageCircle, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ArrowUpRight,
  Filter,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Award
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { databaseService } from '../services/databaseService';
import { notificationService } from '../services/notificationService';
import { Referral, ThankYouSlip, UserProfile, isOfflineReferral } from '../types';
import { Modal } from '../components/Modal';
import { PassReferralModal } from '../components/modals/PassReferralModal';
import { SubmitThankYouSlipModal } from '../components/modals/SubmitThankYouSlipModal';
import { safeFormat as format } from '../utils/dateUtils';
import { cn } from '../lib/utils';
import { showError, showSuccess } from '../services/toastService';

/**
 * Line-style Referral Icon (Notepad with spiral binding & curved referral arrow)
 * Faithfully matches the mobile app visual reference.
 */
export function ReferralNotepadIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 48 48" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.75" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Spiral rings at top */}
      <path d="M17 6v6" />
      <path d="M25 6v6" />
      <path d="M33 6v6" />
      <path d="M41 6v6" />
      {/* Notepad body */}
      <rect x="13" y="9" width="31" height="32" rx="4" />
      {/* Horizontal ruled lines */}
      <path d="M21 19h15" />
      <path d="M21 26h15" />
      <path d="M21 33h10" />
      {/* Curved referral arrow on bottom-left */}
      <path d="M6 34c0-7 5-11 11-11" />
      <path d="M13 18l4 5-5 4" />
    </svg>
  );
}

export interface UnifiedActivityItem {
  id: string;
  type: 'referral' | 'thank_you_slip';
  date: string;
  rawDate: Date;
  fromUserId: string;
  toUserId: string;
  personName: string;
  personPhoto?: string;
  senderName: string;
  receiverName: string;
  amount?: number;
  status?: string;
  requirement?: string;
  notes?: string;
  contactName?: string;
  contactPhone?: string;
  referralId?: string;
  rawData: any;
}

export function Activity() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const currentUserId = String(profile?.uid || profile?.id || '');

  // Tab State: 'given' | 'received' | 'all'
  const [activeTab, setActiveTab] = useState<'given' | 'received' | 'all'>('given');

  // Core Data
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [thankYouSlips, setThankYouSlips] = useState<ThankYouSlip[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  // Modals & Action Sheet
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isPassReferralOpen, setIsPassReferralOpen] = useState(false);
  const [isSubmitSlipOpen, setIsSubmitSlipOpen] = useState(false);
  const [prefilledReferralId, setPrefilledReferralId] = useState<string | undefined>(undefined);
  const [selectedReferralForDetails, setSelectedReferralForDetails] = useState<Referral | null>(null);
  const [selectedSlipForDetails, setSelectedSlipForDetails] = useState<ThankYouSlip | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Referral Status Updating within Details Modal
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusVal, setStatusVal] = useState('');

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'referrals' | 'slips'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Handle URL Query Params for deep-links
  useEffect(() => {
    const action = searchParams.get('action');
    const type = searchParams.get('type');
    const tab = searchParams.get('tab');
    const refId = searchParams.get('referralId');

    if (tab === 'received') setActiveTab('received');
    if (tab === 'all') setActiveTab('all');

    if (refId) {
      setPrefilledReferralId(refId);
    }

    if (action === 'new') {
      if (type === 'thankyou' || refId) {
        setIsSubmitSlipOpen(true);
      } else {
        setIsPassReferralOpen(true);
      }
    }
  }, [searchParams]);

  // Fetch Users Mapping for name resolution
  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await supabase.from('users').select('*');
      if (data && data.length > 0) {
        const map: Record<string, UserProfile> = {};
        data.forEach((u: any) => {
          const uid = String(u.uid || u.id || '');
          if (uid) map[uid] = u;
        });
        setUsersMap(map);
      }
    } catch (e) {
      console.warn('Failed to load users map:', e);
    }
  }, []);

  // Fetch all Referrals and Thank You Slips
  const fetchActivities = useCallback(async () => {
    if (!currentUserId && profile?.role !== 'MASTER_ADMIN') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Referrals
      let refQuery = supabase
        .from('referrals')
        .select(`
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*)
        `)
        .order('created_at', { ascending: false });

      const { data: refData, error: refErr } = await refQuery;
      let loadedRefs: Referral[] = [];

      if (!refErr && refData) {
        loadedRefs = refData.map((r: any) => ({
          id: String(r.id),
          fromUserId: String(r.sender_id || r.from_user_id || ''),
          toUserId: String(r.receiver_id || r.to_user_id || ''),
          senderName: r.sender?.full_name || r.sender?.name || r.sender_name || 'Member',
          receiverName: r.receiver?.full_name || r.receiver?.name || r.receiver_name || 'Member',
          senderFullName: r.sender?.full_name || r.sender?.name || r.sender_name,
          receiverFullName: r.receiver?.full_name || r.receiver?.name || r.receiver_name,
          senderRole: r.sender?.role || r.sender?.position,
          receiverRole: r.receiver?.role || r.receiver?.position,
          senderPhoto: r.sender?.photo_url || r.sender?.photoURL,
          receiverPhoto: r.receiver?.photo_url || r.receiver?.photoURL,
          contactName: r.contact_name || r.customer_name || 'Client',
          contactPhone: r.contact_phone || r.phone || '',
          requirement: r.business_requirement || r.requirement || '',
          notes: r.notes || '',
          status: r.status || 'New',
          createdAt: r.created_at || r.createdAt || new Date().toISOString(),
          isOffline: isOfflineReferral(r)
        }));
      } else {
        // Fallback simple fetch
        const { data: fallbackRefs } = await supabase
          .from('referrals')
          .select('*')
          .order('created_at', { ascending: false });
        if (fallbackRefs) {
          loadedRefs = fallbackRefs.map((r: any) => ({
            id: String(r.id),
            fromUserId: String(r.sender_id || r.from_user_id || ''),
            toUserId: String(r.receiver_id || r.to_user_id || ''),
            senderName: r.sender_name || 'Member',
            receiverName: r.receiver_name || 'Member',
            contactName: r.contact_name || 'Client',
            contactPhone: r.contact_phone || '',
            requirement: r.business_requirement || r.requirement || '',
            notes: r.notes || '',
            status: r.status || 'New',
            createdAt: r.created_at || new Date().toISOString(),
            isOffline: isOfflineReferral(r)
          }));
        }
      }
      setReferrals(loadedRefs);

      // 2. Fetch Thank You Slips
      const { data: slipData } = await supabase
        .from('thank_you_slips')
        .select('*')
        .order('created_at', { ascending: false });

      if (slipData) {
        setThankYouSlips(slipData.map((s: any) => ({
          id: String(s.id),
          referralId: String(s.referral_id || s.referralId || ''),
          fromUserId: String(s.from_user_id || s.fromUserId || s.submitted_by || ''),
          toUserId: String(s.to_user_id || s.toUserId || ''),
          customerName: s.customer_name || s.customerName || '',
          businessValue: Number(s.business_value || s.businessValue || s.amount || 0),
          notes: s.notes || '',
          createdAt: s.created_at || s.createdAt || new Date().toISOString(),
          businessRequirement: s.business_requirement || s.requirement || ''
        })));
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, profile?.role]);

  useEffect(() => {
    fetchUsers();
    fetchActivities();
  }, [fetchUsers, fetchActivities]);

  // Real-time listener on referrals & thank_you_slips
  useEffect(() => {
    const channel = supabase
      .channel('activity-feed-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => {
        fetchActivities();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'thank_you_slips' }, () => {
        fetchActivities();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActivities]);

  // Helper: Resolve Member Name
  const getMemberName = useCallback((userId: string, defaultName?: string) => {
    if (!userId) return defaultName || 'Member';
    const u = usersMap[userId];
    if (u) {
      return u.name || (u as any).full_name || defaultName || 'Member';
    }
    return defaultName || 'Member';
  }, [usersMap]);

  // Format Date cleanly: "September 08 2026"
  const formatActivityDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'MMMM dd yyyy');
    } catch {
      return dateStr;
    }
  };

  // Combine and Unify Referrals & Thank You Slips
  const allActivities: UnifiedActivityItem[] = useMemo(() => {
    const items: UnifiedActivityItem[] = [];

    // 1. Process Referrals
    referrals.forEach(ref => {
      // Exclude offline placeholder referrals that are strictly internal markers
      if (ref.isOffline && !ref.contactName) return;

      const senderName = getMemberName(ref.fromUserId, ref.senderFullName || ref.senderName);
      const receiverName = getMemberName(ref.toUserId, ref.receiverFullName || ref.receiverName);

      items.push({
        id: `ref-${ref.id}`,
        type: 'referral',
        date: ref.createdAt,
        rawDate: new Date(ref.createdAt),
        fromUserId: ref.fromUserId,
        toUserId: ref.toUserId,
        senderName,
        receiverName,
        // In GIVEN tab: Person is the Receiver (who you passed to)
        // In RECEIVED tab: Person is the Sender (who passed to you)
        personName: activeTab === 'given' ? receiverName : senderName,
        status: ref.status,
        requirement: ref.requirement,
        notes: ref.notes,
        contactName: ref.contactName,
        contactPhone: ref.contactPhone,
        rawData: ref
      });
    });

    // 2. Process Thank You Slips
    thankYouSlips.forEach(slip => {
      const senderName = getMemberName(slip.fromUserId);
      const receiverName = getMemberName(slip.toUserId);

      items.push({
        id: `slip-${slip.id}`,
        type: 'thank_you_slip',
        date: slip.createdAt,
        rawDate: new Date(slip.createdAt),
        fromUserId: slip.fromUserId,
        toUserId: slip.toUserId,
        senderName,
        receiverName,
        personName: activeTab === 'given' ? receiverName : senderName,
        amount: slip.businessValue,
        requirement: slip.businessRequirement,
        notes: slip.notes,
        referralId: slip.referralId,
        rawData: slip
      });
    });

    // Sort chronologically descending (newest first)
    return items.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  }, [referrals, thankYouSlips, getMemberName, activeTab]);

  // Filter items by tab (Given vs Received), search query, type, and date range
  const filteredActivities = useMemo(() => {
    return allActivities.filter(item => {
      const isMasterAdmin = profile?.role === 'MASTER_ADMIN';

      // 1. Tab Filtering
      if (activeTab === 'given') {
        const isGiven = String(item.fromUserId) === currentUserId;
        if (!isGiven && !isMasterAdmin) return false;
        if (!isGiven && isMasterAdmin && activeTab !== 'all') return false;
      } else if (activeTab === 'received') {
        const isReceived = String(item.toUserId) === currentUserId;
        if (!isReceived && !isMasterAdmin) return false;
        if (!isReceived && isMasterAdmin && activeTab !== 'all') return false;
      }

      // 2. Type Filtering (All, Referrals, Thank You Slips)
      if (filterType === 'referrals' && item.type !== 'referral') return false;
      if (filterType === 'slips' && item.type !== 'thank_you_slip') return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.personName.toLowerCase().includes(q);
        const matchesSender = item.senderName.toLowerCase().includes(q);
        const matchesReceiver = item.receiverName.toLowerCase().includes(q);
        const matchesReq = (item.requirement || '').toLowerCase().includes(q);
        const matchesContact = (item.contactName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSender && !matchesReceiver && !matchesReq && !matchesContact) {
          return false;
        }
      }

      // 4. Date Range
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (item.rawDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (item.rawDate > end) return false;
      }

      return true;
    });
  }, [allActivities, activeTab, currentUserId, profile?.role, filterType, searchQuery, startDate, endDate]);

  // Aggregate stats for the current tab
  const stats = useMemo(() => {
    const refCount = filteredActivities.filter(a => a.type === 'referral').length;
    const slipCount = filteredActivities.filter(a => a.type === 'thank_you_slip').length;
    const totalAmount = filteredActivities
      .filter(a => a.type === 'thank_you_slip' && a.amount)
      .reduce((sum, a) => sum + (a.amount || 0), 0);

    return {
      total: filteredActivities.length,
      refCount,
      slipCount,
      totalAmount
    };
  }, [filteredActivities]);

  // Handle Item Click -> Open Respective Details Modal
  const handleItemClick = (item: UnifiedActivityItem) => {
    if (item.type === 'referral') {
      setSelectedReferralForDetails(item.rawData as Referral);
      setStatusVal(item.rawData.status || 'New');
    } else {
      setSelectedSlipForDetails(item.rawData as ThankYouSlip);
    }
  };

  // Update Referral Status handler
  const handleUpdateReferralStatus = async () => {
    if (!selectedReferralForDetails || !statusVal) return;
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('referrals')
        .update({ 
          status: statusVal,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReferralForDetails.id);

      if (error) throw error;

      showSuccess(`Referral status updated to ${statusVal}`);
      setSelectedReferralForDetails(prev => prev ? { ...prev, status: statusVal as any } : null);
      fetchActivities();
    } catch (err: any) {
      showError(err.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070E] text-white pb-36 relative select-none sm:select-auto">
      
      {/* 1. Header Bar: < ACTIVITY FEED (?) */}
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center justify-between py-2 border-b border-white/5 mb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1 text-neutral-400 hover:text-white active:scale-95 transition-all rounded-lg"
              aria-label="Go back"
            >
              <ChevronLeft size={22} className="text-[#E53935]" />
            </button>
            <h1 className="text-[17px] sm:text-[19px] font-black uppercase tracking-wider text-white">
              Activity Feed
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="p-1.5 text-neutral-400 hover:text-[#E53935] transition-colors rounded-lg"
            title="Activity Feed Information"
            aria-label="Help and instructions"
          >
            <HelpCircle size={20} className="text-[#E53935]/80 hover:text-[#E53935]" />
          </button>
        </div>

        {/* 2. Tabs Bar: [ GIVEN ] [ RECEIVED ] + [ Filter Icon ] */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 grid grid-cols-2 rounded-xl bg-[#111827] p-1 border border-white/5 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('given')}
              className={cn(
                "py-2.5 text-[13px] font-extrabold uppercase tracking-wider rounded-lg transition-all text-center",
                activeTab === 'given'
                  ? "bg-[#E53935] text-white shadow-md shadow-[#E53935]/30"
                  : "text-[#E53935] hover:bg-white/[0.03]"
              )}
            >
              Given
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('received')}
              className={cn(
                "py-2.5 text-[13px] font-extrabold uppercase tracking-wider rounded-lg transition-all text-center",
                activeTab === 'received'
                  ? "bg-[#E53935] text-white shadow-md shadow-[#E53935]/30"
                  : "text-[#E53935] hover:bg-white/[0.03]"
              )}
            >
              Received
            </button>
          </div>

          {/* Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center border transition-all active:scale-95 shrink-0 relative",
              (filterType !== 'all' || startDate || endDate || searchQuery)
                ? "bg-[#E53935]/15 border-[#E53935] text-[#E53935]"
                : "bg-[#111827] border-white/5 text-[#E53935] hover:bg-[#151C2E]"
            )}
            title="Filter activities"
            aria-label="Filter activities"
          >
            <SlidersHorizontal size={18} />
            {(filterType !== 'all' || startDate || endDate || searchQuery) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E53935] animate-ping" />
            )}
          </button>
        </div>

        {/* Master Admin All Activities switch */}
        {profile?.role === 'MASTER_ADMIN' && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#151C2E] rounded-lg border border-white/5 text-[11px] font-bold text-neutral-400 mb-3">
            <span>Admin Supervision:</span>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setActiveTab(activeTab === 'all' ? 'given' : 'all')}
                className={cn(
                  "px-2.5 py-0.5 rounded-full uppercase text-[10px] tracking-wider transition-all",
                  activeTab === 'all' ? "bg-amber-500 text-black font-extrabold" : "bg-white/5 text-neutral-300 hover:text-white"
                )}
              >
                {activeTab === 'all' ? 'Viewing All Chapter Activities' : 'Show All Global Activities'}
              </button>
            </div>
          </div>
        )}

        {/* Active Filter Indicators */}
        {(filterType !== 'all' || startDate || endDate || searchQuery) && (
          <div className="flex flex-wrap items-center gap-1.5 py-1.5 px-2 bg-white/[0.02] rounded-lg border border-white/5 mb-3 text-[11px]">
            <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px]">Filters:</span>
            {filterType !== 'all' && (
              <span className="bg-[#E53935]/20 text-[#E53935] px-2 py-0.5 rounded-md font-semibold border border-[#E53935]/30">
                {filterType === 'referrals' ? 'Referrals Only' : 'Thank You Slips Only'}
              </span>
            )}
            {searchQuery && (
              <span className="bg-white/10 text-white px-2 py-0.5 rounded-md font-semibold">
                "{searchQuery}"
              </span>
            )}
            {(startDate || endDate) && (
              <span className="bg-white/10 text-neutral-300 px-2 py-0.5 rounded-md">
                {startDate || '...'} to {endDate || '...'}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setFilterType('all');
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
              }}
              className="ml-auto text-neutral-400 hover:text-white underline text-[10px]"
            >
              Clear
            </button>
          </div>
        )}

        {/* Summary Metric Ribbon */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[#111827] border border-white/5 rounded-xl p-2.5 text-center">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Activities</span>
            <span className="text-base font-black text-white">{stats.total}</span>
          </div>
          <div className="bg-[#111827] border border-white/5 rounded-xl p-2.5 text-center">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Referrals</span>
            <span className="text-base font-black text-[#E53935]">{stats.refCount}</span>
          </div>
          <div className="bg-[#111827] border border-white/5 rounded-xl p-2.5 text-center">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Business Value</span>
            <span className="text-base font-black text-emerald-400">
              ₹{stats.totalAmount >= 100000 
                ? `${(stats.totalAmount / 100000).toFixed(1)}L` 
                : stats.totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* 3. Continuous Activity Feed List */}
        <div className="bg-[#111827] rounded-2xl border border-white/5 shadow-xl overflow-hidden divide-y divide-white/5">
          {loading ? (
            <div className="py-16 text-center text-neutral-400 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#E53935] border-t-transparent animate-spin" />
              <p className="text-xs font-semibold tracking-wider uppercase">Loading activity feed...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-16 px-6 text-center text-neutral-400 flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-neutral-500">
                <Calendar size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1">No activities found</p>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  {activeTab === 'given' 
                    ? "You haven't passed any referrals or submitted thank you slips yet." 
                    : "No referrals or thank you slips have been received yet."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActionMenuOpen(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#E53935] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#D32F2F] active:scale-95 transition-all"
              >
                <Plus size={16} /> Create Activity
              </button>
            </div>
          ) : (
            filteredActivities.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.03)" }}
                whileTap={{ scale: 0.995 }}
                onClick={() => handleItemClick(item)}
                className="flex items-center justify-between py-3.5 px-4 cursor-pointer transition-colors group"
              >
                {/* Left Side: Type-Specific Line Icon */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0 group-hover:border-[#E53935]/30 transition-colors">
                    {item.type === 'referral' ? (
                      <ReferralNotepadIcon className="w-6 h-6 text-neutral-400 group-hover:text-[#E53935] transition-colors" />
                    ) : (
                      <Handshake className="w-6 h-6 text-neutral-400 group-hover:text-[#E53935] transition-colors" />
                    )}
                  </div>

                  {/* Middle Content: Date on top, Member name and amount below */}
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-neutral-400 leading-tight mb-1">
                      {formatActivityDate(item.date)}
                    </div>
                    <div className="text-[14px] font-bold text-[#E53935] truncate leading-tight flex items-center gap-1.5">
                      <span className="truncate">{item.personName}</span>
                      {item.amount !== undefined && item.amount > 0 && (
                        <span className="font-extrabold text-[#E53935] shrink-0">
                          - ₹{item.amount.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Chevron to indicate opening */}
                <div className="pl-3 shrink-0">
                  <ChevronRight size={18} className="text-[#E53935]/70 group-hover:text-[#E53935] group-hover:translate-x-0.5 transition-all" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* 4. Floating "+" Button at Bottom */}
      <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-40">
        <button
          type="button"
          onClick={() => setIsActionMenuOpen(prev => !prev)}
          className="w-14 h-14 rounded-full bg-[#E53935] text-white flex items-center justify-center shadow-[0_10px_30px_rgba(229,57,53,0.55)] hover:bg-[#D32F2F] active:scale-90 transition-all outline-none border-2 border-white/20"
          aria-label="Add Activity"
          title="Create Referral or Thank You Slip"
        >
          <Plus 
            size={28} 
            strokeWidth={2.75}
            className={cn("transition-transform duration-300", isActionMenuOpen ? "rotate-45" : "rotate-0")} 
          />
        </button>
      </div>

      {/* 5. Floating Action Selection Sheet */}
      <AnimatePresence>
        {isActionMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsActionMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 cursor-pointer"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="fixed bottom-36 md:bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#111827] rounded-3xl p-4 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 flex flex-col gap-2.5"
            >
              <div className="text-center pb-2 border-b border-white/5">
                <span className="text-[11px] font-black uppercase tracking-widest text-neutral-400">
                  New Activity
                </span>
              </div>

              {/* Option 1: Send Referral */}
              <button
                type="button"
                onClick={() => {
                  setIsActionMenuOpen(false);
                  setIsPassReferralOpen(true);
                }}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#151C2E] hover:bg-[#1C2538] border border-white/5 hover:border-[#E53935]/40 transition-all text-left active:scale-98 group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#E53935]/15 border border-[#E53935]/30 flex items-center justify-center shrink-0 text-[#E53935] group-hover:scale-105 transition-transform">
                  <ReferralNotepadIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[14px] font-bold text-white group-hover:text-[#E53935] transition-colors">
                    Send Referral
                  </h4>
                  <p className="text-[11px] text-neutral-400 font-medium leading-tight">
                    Pass a business lead or referral to a member
                  </p>
                </div>
                <ChevronRight size={18} className="text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* Option 2: Send Thank You Slip */}
              <button
                type="button"
                onClick={() => {
                  setIsActionMenuOpen(false);
                  setPrefilledReferralId(undefined);
                  setIsSubmitSlipOpen(true);
                }}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#151C2E] hover:bg-[#1C2538] border border-white/5 hover:border-[#E53935]/40 transition-all text-left active:scale-98 group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 group-hover:scale-105 transition-transform">
                  <Handshake className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[14px] font-bold text-white group-hover:text-emerald-400 transition-colors">
                    Send Thank You Slip
                  </h4>
                  <p className="text-[11px] text-neutral-400 font-medium leading-tight">
                    Acknowledge and record closed deal value
                  </p>
                </div>
                <ChevronRight size={18} className="text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 6. Referral Details Modal */}
      <Modal
        isOpen={selectedReferralForDetails !== null}
        onClose={() => setSelectedReferralForDetails(null)}
        title="Referral Details"
      >
        {selectedReferralForDetails && (
          <div className="space-y-4 text-left">
            {/* ID & Type Banner */}
            <div className="flex items-center justify-between p-3 bg-[#151C2E] rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E53935]/15 text-[#E53935] flex items-center justify-center">
                  <ReferralNotepadIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Referral ID</span>
                  <span className="text-xs font-mono font-bold text-white">#REF-{selectedReferralForDetails.id.slice(-6).toUpperCase()}</span>
                </div>
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase px-2.5 py-1 rounded-full border",
                selectedReferralForDetails.status === 'Converted to Business' || selectedReferralForDetails.status === 'Completed'
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : selectedReferralForDetails.status === 'Closed - Not Converted' || selectedReferralForDetails.status === 'Rejected'
                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : "bg-blue-500/20 text-blue-400 border-blue-500/30"
              )}>
                {selectedReferralForDetails.status || 'New'}
              </span>
            </div>

            {/* Sender & Receiver Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 bg-[#111827] rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">From (Sender)</span>
                <p className="text-sm font-bold text-white">
                  {getMemberName(selectedReferralForDetails.fromUserId, selectedReferralForDetails.senderName)}
                </p>
                {selectedReferralForDetails.senderRole && (
                  <p className="text-[11px] font-semibold text-[#E53935]">{selectedReferralForDetails.senderRole}</p>
                )}
              </div>

              <div className="p-3 bg-[#111827] rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">To (Receiver)</span>
                <p className="text-sm font-bold text-white">
                  {getMemberName(selectedReferralForDetails.toUserId, selectedReferralForDetails.receiverName)}
                </p>
                {selectedReferralForDetails.receiverRole && (
                  <p className="text-[11px] font-semibold text-[#E53935]">{selectedReferralForDetails.receiverRole}</p>
                )}
              </div>
            </div>

            {/* Client / Contact Person Card */}
            <div className="p-3.5 bg-[#151C2E] rounded-xl border border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Client Contact</span>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{selectedReferralForDetails.contactName}</p>
                  <p className="text-xs text-neutral-400">{selectedReferralForDetails.contactPhone || 'No phone provided'}</p>
                </div>
                {selectedReferralForDetails.contactPhone && (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${selectedReferralForDetails.contactPhone}`}
                      className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                      title="Call Client"
                    >
                      <Phone size={16} />
                    </a>
                    <a
                      href={`https://wa.me/${selectedReferralForDetails.contactPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                      title="WhatsApp Client"
                    >
                      <MessageCircle size={16} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Requirement & Notes */}
            <div className="p-3.5 bg-[#111827] rounded-xl border border-white/5 space-y-2">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Requirement</span>
                <p className="text-xs text-neutral-200 mt-0.5 leading-relaxed">
                  {selectedReferralForDetails.requirement || 'No requirement specified.'}
                </p>
              </div>

              {selectedReferralForDetails.notes && (
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Notes</span>
                  <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">
                    {selectedReferralForDetails.notes}
                  </p>
                </div>
              )}
            </div>

            {/* If Current User is the Receiver: Status Changer & Thank You Slip CTA */}
            {String(selectedReferralForDetails.toUserId) === currentUserId && (
              <div className="p-3.5 bg-[#151C2E] rounded-xl border border-white/10 space-y-3">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider block">Update Status</span>
                <div className="flex gap-2">
                  <select
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                    className="flex-1 bg-[#111827] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-[#E53935]"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Converted to Business">Converted to Business</option>
                    <option value="Closed - Not Converted">Closed - Not Converted</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleUpdateReferralStatus}
                    disabled={isUpdatingStatus || statusVal === selectedReferralForDetails.status}
                    className="px-4 py-2 bg-[#E53935] text-white rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-[#D32F2F] active:scale-95 transition-all shrink-0"
                  >
                    {isUpdatingStatus ? 'Saving...' : 'Update'}
                  </button>
                </div>

                {/* Direct CTA to convert to Thank You Slip */}
                <button
                  type="button"
                  onClick={() => {
                    const refId = selectedReferralForDetails.id;
                    setSelectedReferralForDetails(null);
                    setPrefilledReferralId(refId);
                    setIsSubmitSlipOpen(true);
                  }}
                  className="w-full py-2.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Handshake size={16} /> Generate Thank You Slip for this Referral
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 7. Thank You Slip Details Modal */}
      <Modal
        isOpen={selectedSlipForDetails !== null}
        onClose={() => setSelectedSlipForDetails(null)}
        title="Thank You Slip"
      >
        {selectedSlipForDetails && (
          <div className="space-y-4 text-left">
            {/* Prominent Amount Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-[#151C2E] rounded-2xl border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Business Value</span>
                <span className="text-2xl font-black text-emerald-400 tracking-tight">
                  ₹{Number(selectedSlipForDetails.businessValue || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Handshake size={24} />
              </div>
            </div>

            {/* Sender & Receiver Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 bg-[#111827] rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                  Thanked By (Sender)
                </span>
                <p className="text-sm font-bold text-white">
                  {getMemberName(selectedSlipForDetails.fromUserId)}
                </p>
              </div>

              <div className="p-3 bg-[#111827] rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                  Beneficiary (Receiver)
                </span>
                <p className="text-sm font-bold text-white">
                  {getMemberName(selectedSlipForDetails.toUserId)}
                </p>
              </div>
            </div>

            {/* Slip Date & Reference */}
            <div className="p-3.5 bg-[#151C2E] rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-semibold">Slip Date:</span>
                <span className="text-white font-bold">{formatActivityDate(selectedSlipForDetails.createdAt)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-semibold">Referral Reference:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {selectedSlipForDetails.referralId && selectedSlipForDetails.referralId !== 'N/A' && !selectedSlipForDetails.referralId.startsWith('offline_')
                    ? `#REF-${selectedSlipForDetails.referralId.slice(-6).toUpperCase()}`
                    : 'Direct / Offline Closed Business'}
                </span>
              </div>

              {selectedSlipForDetails.businessRequirement && (
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-0.5">Requirement</span>
                  <p className="text-xs text-neutral-200">{selectedSlipForDetails.businessRequirement}</p>
                </div>
              )}

              {selectedSlipForDetails.notes && (
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-0.5">Notes</span>
                  <p className="text-xs text-neutral-300 italic">{selectedSlipForDetails.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 8. Help / Information Modal */}
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="About Activity Feed"
      >
        <div className="space-y-4 text-left text-xs leading-relaxed text-neutral-300">
          <p>
            The <strong className="text-white">Activity Feed</strong> unites both <strong className="text-[#E53935]">Referrals</strong> and <strong className="text-emerald-400">Thank You Slips</strong> into one continuous timeline.
          </p>

          <div className="space-y-2.5 pt-2">
            <div className="flex items-start gap-3 p-3 bg-[#151C2E] rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-[#E53935]/20 text-[#E53935] flex items-center justify-center shrink-0">
                <ReferralNotepadIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white mb-0.5">Referrals</h4>
                <p className="text-[11px] text-neutral-400">
                  Business leads passed to peers. In the <strong>Given</strong> tab, you see referrals you passed. In <strong>Received</strong>, you see leads sent to you.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-[#151C2E] rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Handshake size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white mb-0.5">Thank You Slips</h4>
                <p className="text-[11px] text-neutral-400">
                  Closed business transaction reports showing deal value (₹). In the <strong>Given</strong> tab, you see slips you submitted. In <strong>Received</strong>, you see business credited to you.
                </p>
              </div>
            </div>
          </div>

          <p className="pt-2 text-[11px] text-neutral-400">
            Tap the red <strong className="text-[#E53935]">+ button</strong> at the bottom anytime to quickly send a new Referral or Thank You Slip.
          </p>
        </div>
      </Modal>

      {/* 9. Filter Modal / Drawer */}
      <Modal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Activity Feed"
      >
        <div className="space-y-4 text-left">
          {/* Search by name/keyword */}
          <div>
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
              Search by Member or Keyword
            </label>
            <div className="relative flex items-center bg-[#151C2E] border border-white/10 rounded-xl px-3 py-2">
              <Search size={16} className="text-neutral-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member name, client, etc."
                className="bg-transparent border-none outline-none text-xs text-white w-full placeholder-neutral-500"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="text-neutral-400 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Filter by Activity Type */}
          <div>
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
              Activity Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={cn(
                  "py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center",
                  filterType === 'all'
                    ? "bg-[#E53935] text-white border-[#E53935]"
                    : "bg-[#151C2E] text-neutral-300 border-white/5 hover:bg-white/[0.04]"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType('referrals')}
                className={cn(
                  "py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center",
                  filterType === 'referrals'
                    ? "bg-[#E53935] text-white border-[#E53935]"
                    : "bg-[#151C2E] text-neutral-300 border-white/5 hover:bg-white/[0.04]"
                )}
              >
                Referrals
              </button>
              <button
                type="button"
                onClick={() => setFilterType('slips')}
                className={cn(
                  "py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center",
                  filterType === 'slips'
                    ? "bg-[#E53935] text-white border-[#E53935]"
                    : "bg-[#151C2E] text-neutral-300 border-white/5 hover:bg-white/[0.04]"
                )}
              >
                Thank You
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#151C2E] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#E53935]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#151C2E] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#E53935]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setFilterType('all');
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
              }}
              className="flex-1 py-2.5 bg-[#151C2E] hover:bg-[#1F2937] text-neutral-300 rounded-xl text-xs font-bold transition-all border border-white/5"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              className="flex-1 py-2.5 bg-[#E53935] hover:bg-[#D32F2F] text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Apply
            </button>
          </div>
        </div>
      </Modal>

      {/* 10. Existing Send Referral Modal (PassReferralModal) */}
      <PassReferralModal
        isOpen={isPassReferralOpen}
        onClose={() => setIsPassReferralOpen(false)}
        onSuccess={() => {
          setIsPassReferralOpen(false);
          fetchActivities();
        }}
      />

      {/* 11. Existing Send Thank You Slip Modal (SubmitThankYouSlipModal) */}
      <SubmitThankYouSlipModal
        isOpen={isSubmitSlipOpen}
        onClose={() => {
          setIsSubmitSlipOpen(false);
          setPrefilledReferralId(undefined);
        }}
        initialReferralId={prefilledReferralId}
        onSuccess={() => {
          setIsSubmitSlipOpen(false);
          setPrefilledReferralId(undefined);
          fetchActivities();
        }}
      />
    </div>
  );
}
