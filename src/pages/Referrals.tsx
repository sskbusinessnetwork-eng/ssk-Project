import { Avatar } from '../components/Avatar';
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  CheckCircle2, 
  XCircle, 
  ArrowRightLeft,
  AlertCircle,
  Share2,
  Users,
  Building2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { Referral, UserProfile, ThankYouSlip } from '../types';
import { Modal } from '../components/Modal';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabaseClient';
import { getCleanFullName } from '../utils/authUtils';

const getUserFullName = (user: any): string => {
  if (!user) return '';
  const rawName = user.full_name || user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (!rawName) return '';
  return getCleanFullName(rawName);
};

const formatUserRoleOrPosition = (user: any): string => {
  if (!user) return 'Member';
  const role = user.role;
  if (role) {
    const rUpper = String(role).toUpperCase().trim();
    if (rUpper === 'PRESIDENT') return 'President';
    if (rUpper === 'VICE_PRESIDENT') return 'Vice President';
    if (rUpper === 'TREASURER') return 'Treasurer';
    if (rUpper === 'CHAPTER_ADMIN') return 'Chapter Admin';
    if (rUpper === 'MASTER_ADMIN') return 'Master Admin';
    if (rUpper === 'MEMBER') return 'Member';
  }
  return 'Member';
};

export function Referrals() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [thankYouSlips, setThankYouSlips] = useState<ThankYouSlip[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [memberFilter, setMemberFilter] = useState<'all' | 'my_chapter'>('all');
  const [currentUserChapterId, setCurrentUserChapterId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'passed' | 'received'>('received');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isThankYouModalOpen, setIsThankYouModalOpen] = useState(false);
  const [isNotConvertedModalOpen, setIsNotConvertedModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [updateStatusVal, setUpdateStatusVal] = useState('');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [notConvertedReason, setNotConvertedReason] = useState('');
  const [thankYouData, setThankYouData] = useState({
    businessValue: '',
    notes: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    toUserId: '',
    contactName: '',
    contactPhone: '',
    requirement: '',
    notes: ''
  });

  useEffect(() => {
    const toUserId = searchParams.get('to');
    if (toUserId) {
      setFormData(prev => ({ ...prev, toUserId }));
      setIsModalOpen(true);
    }
    const tab = searchParams.get('tab');
    if (tab === 'passed' || tab === 'received') {
      setFilter(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const updateId = searchParams.get('update');
    if (updateId && referrals.length > 0) {
      const ref = referrals.find(r => r.id === updateId);
      if (ref) {
        setSelectedReferral(ref);
        let defaultStatus = ref.status || 'New';
        if (defaultStatus === 'Pending' || defaultStatus === 'PENDING') defaultStatus = 'New';
        if (defaultStatus === 'Completed' || defaultStatus === 'COMPLETED' || defaultStatus === 'CONVERTED') defaultStatus = 'Converted to Business';
        if (defaultStatus === 'Rejected' || defaultStatus === 'NOT_CONVERTED') defaultStatus = 'Closed - Not Converted';
        setUpdateStatusVal(defaultStatus);
        setIsUpdateStatusModalOpen(true);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('update');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [referrals, searchParams, setSearchParams]);

  // Fetch referrals from Supabase table with sender and receiver relations
  const fetchReferrals = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const currentUserId = profile?.id || profile?.uid || (await supabase.auth.getUser()).data?.user?.id;

      if (!currentUserId) {
        setLoading(false);
        return;
      }

      // Master Admin cannot send or receive referrals
      if (profile?.role === 'MASTER_ADMIN') {
        setReferrals([]);
        setLoading(false);
        return;
      }

      // Query chapters table for chapter names mapping
      const { data: chaptersData } = await supabase
        .from('chapters')
        .select('id, name, chapter_name');

      const chapterMap = new Map<string, string>();
      if (chaptersData) {
        chaptersData.forEach((c: any) => {
          const cName = c.chapter_name || c.name || '';
          if (c.id && cName) {
            chapterMap.set(String(c.id).trim().toLowerCase(), cName);
          }
        });
      }

      // Query referrals from Supabase with sender and receiver joins
      let refRows: any[] = [];
      let queryError: any = null;

      const { data: joinedData, error: joinedErr } = await supabase
        .from('referrals')
        .select(`
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*)
        `)
        .order('created_at', { ascending: false });

      if (!joinedErr && joinedData) {
        if (filter === 'passed') {
          refRows = joinedData.filter((r: any) => String(r.sender_id) === String(currentUserId) || String(r.from_user_id) === String(currentUserId));
        } else {
          refRows = joinedData.filter((r: any) => String(r.receiver_id) === String(currentUserId) || String(r.to_user_id) === String(currentUserId));
        }
      } else {
        if (joinedErr) {
          console.warn("Supabase relation query failed, falling back to manual query:", joinedErr);
        }
        let fallbackQuery = supabase
          .from('referrals')
          .select('*')
          .order('created_at', { ascending: false });

        if (filter === 'passed') {
          fallbackQuery = fallbackQuery.or(`sender_id.eq.${currentUserId},from_user_id.eq.${currentUserId}`);
        } else {
          fallbackQuery = fallbackQuery.or(`receiver_id.eq.${currentUserId},to_user_id.eq.${currentUserId}`);
        }

        const fallbackRes = await fallbackQuery;
        if (fallbackRes.error) {
          queryError = fallbackRes.error;
        } else {
          refRows = fallbackRes.data || [];
        }
      }

      if (queryError) {
        console.error("Supabase referrals query error:", queryError);
        setErrorMessage(`Database Error (${queryError.code || 'ERR'}): ${queryError.message || 'Failed to fetch referrals'}`);
        setReferrals([]);
        setLoading(false);
        return;
      }

      // STEP 1 - VERIFY DATABASE: Log every referral column
      console.log(`[Referrals Table Verification] Total rows fetched: ${refRows.length}`);
      refRows.forEach((r: any, idx: number) => {
        console.log(`[Referral #${idx + 1}] ID: ${r.id} | sender_id: ${r.sender_id} | receiver_id: ${r.receiver_id} | chapter_id: ${r.chapter_id}`);
      });

      // STEP 2 - VERIFY USERS TABLE: Fetch users table for complete mapping
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*');

      if (usersErr) {
        console.warn("Could not fetch users list for referral mapping:", usersErr);
      }

      const userMap = new Map<string, any>();
      if (usersData) {
        usersData.forEach(u => {
          if (u.id) userMap.set(String(u.id).trim().toLowerCase(), u);
          if (u.uid) userMap.set(String(u.uid).trim().toLowerCase(), u);
        });
      }

      const formattedList: Referral[] = [];

      for (const r of refRows) {
        const senderIdRaw = r.sender_id || r.from_user_id || '';
        const receiverIdRaw = r.receiver_id || r.to_user_id || '';
        const senderKey = String(senderIdRaw).trim().toLowerCase();
        const receiverKey = String(receiverIdRaw).trim().toLowerCase();

        const senderUser = r.sender || userMap.get(senderKey);
        const receiverUser = r.receiver || userMap.get(receiverKey);

        // STEP 6 - DEBUG: Log lookup results clearly
        if (!senderUser) {
          console.error(`Referral sender_id: ${senderIdRaw} - Matching sender user: NOT FOUND`);
        } else {
          console.log(`Referral sender_id: ${senderIdRaw} - Sender:`, senderUser);
        }

        if (!receiverUser) {
          console.error(`Referral receiver_id: ${receiverIdRaw} - Matching receiver user: NOT FOUND`);
        } else {
          console.log(`Referral receiver_id: ${receiverIdRaw} - Receiver:`, receiverUser);
        }

        // Master Admin must never appear as a sender or receiver
        if (senderUser?.role === 'MASTER_ADMIN' || receiverUser?.role === 'MASTER_ADMIN') {
          continue;
        }

        const senderFullName = senderUser ? getUserFullName(senderUser) : 'Member';
        const senderRoleFormatted = senderUser ? formatUserRoleOrPosition(senderUser) : '';
        const senderChapterName = senderUser?.chapter_id ? (chapterMap.get(String(senderUser.chapter_id).trim().toLowerCase()) || '') : '';
        const senderCategoryName = senderUser ? (senderUser.category || senderUser.business_category || senderUser.businessName || senderUser.business_name || '') : '';
        const senderPhotoUrl = senderUser ? (senderUser.photo_url || senderUser.photoURL || senderUser.avatar_url || senderUser.profile_photo || senderUser.image_url || '') : '';

        const receiverFullName = receiverUser ? getUserFullName(receiverUser) : 'Member';
        const receiverRoleFormatted = receiverUser ? formatUserRoleOrPosition(receiverUser) : '';
        const receiverChapterName = receiverUser?.chapter_id ? (chapterMap.get(String(receiverUser.chapter_id).trim().toLowerCase()) || '') : '';
        const receiverCategoryName = receiverUser ? (receiverUser.category || receiverUser.business_category || receiverUser.businessName || receiverUser.business_name || '') : '';
        const receiverPhotoUrl = receiverUser ? (receiverUser.photo_url || receiverUser.photoURL || receiverUser.avatar_url || receiverUser.profile_photo || receiverUser.image_url || '') : '';

        formattedList.push({
          id: r.id,
          sender_id: senderIdRaw,
          receiver_id: receiverIdRaw,
          fromUserId: senderIdRaw,
          toUserId: receiverIdRaw,
          senderName: senderFullName,
          receiverName: receiverFullName,
          fromUserName: senderFullName,
          toUserName: receiverFullName,
          senderFullName,
          senderRole: senderRoleFormatted,
          senderChapter: senderChapterName,
          senderCategory: senderCategoryName,
          senderPhoto: senderPhotoUrl,
          receiverFullName,
          receiverRole: receiverRoleFormatted,
          receiverChapter: receiverChapterName,
          receiverCategory: receiverCategoryName,
          receiverPhoto: receiverPhotoUrl,
          contactName: r.contact_name || r.customer_name || 'N/A',
          contactPhone: r.contact_phone || r.customer_mobile || 'N/A',
          requirement: r.business_requirement || r.requirement || 'N/A',
          status: r.status || 'Pending',
          createdAt: r.created_at || r.createdAt || new Date().toISOString(),
          updatedAt: r.updated_at || r.updatedAt || new Date().toISOString(),
          notes: r.notes || '',
          notConvertedReason: r.not_converted_reason || r.notConvertedReason || ''
        } as Referral);
      }

      setReferrals(formattedList);

      // Fetch thank you slips if any
      const { data: slips } = await supabase.from('thank_you_slips').select('*');
      if (slips) {
        setThankYouSlips(slips.map((s: any) => ({
          id: s.id,
          referralId: s.referral_id || s.referralId,
          fromUserId: s.from_user_id || s.fromUserId,
          toUserId: s.to_user_id || s.toUserId,
          customerName: s.customer_name || s.customerName,
          businessValue: s.business_value || s.businessValue || 0,
          notes: s.notes || '',
          createdAt: s.created_at || s.createdAt
        })));
      }

    } catch (err: any) {
      console.error("Error in fetchReferrals:", err);
      setErrorMessage(err?.message || "Failed to fetch referral data from database.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all active members from Supabase users table for referral recipient dropdown
  const loadAllMembers = async () => {
    try {
      const currentAuthId = profile?.id || profile?.uid || (await supabase.auth.getUser()).data?.user?.id;
      if (!currentAuthId) return;

      // 1. Fetch chapters mapping for chapter names
      const { data: chaptersData } = await supabase
        .from('chapters')
        .select('id, name, chapter_name');

      const cmap = new Map<string, string>();
      if (chaptersData) {
        chaptersData.forEach((c: any) => {
          const cName = c.chapter_name || c.name || '';
          if (c.id && cName) {
            cmap.set(String(c.id).trim().toLowerCase(), cName);
            cmap.set(String(c.id).trim(), cName);
          }
        });
      }

      // 2. Lookup current user
      let currentUserQuery = supabase.from('users').select('id, chapter_id, role');
      currentUserQuery = currentUserQuery.eq('id', currentAuthId);
      const { data: currentUserRecord } = await currentUserQuery.maybeSingle();

      const userChapId = currentUserRecord?.chapter_id || profile?.chapter_id || (profile as any)?.chapterId;
      if (userChapId) {
        setCurrentUserChapterId(String(userChapId));
      }

      const currentUserId = currentUserRecord?.id || profile?.id;
      const currentUserUid = profile?.uid;

      // 3. Query all users from Supabase users table
      let usersQuery = supabase.from('users').select('*');
      
      if (memberFilter === 'my_chapter') {
        if (profile?.role === 'MASTER_ADMIN') {
          // keep all
        } else if (userChapId) {
          usersQuery = usersQuery.eq('chapter_id', userChapId);
        } else {
          setAllMembers([]);
          setMembers([]);
          return;
        }
      }
      
      const { data: usersData, error } = await usersQuery;

      if (error) {
        console.error("Error fetching active members for referral dropdown:", error);
        return;
      }

      if (usersData) {
        const activeMembers = usersData
          .filter((m: any) => {
            // Exclude MASTER_ADMIN
            if (m.role === 'MASTER_ADMIN') return false;

            // Exclude currently logged in user
            if (currentUserId && (String(m.id) === String(currentUserId) || String(m.uid) === String(currentUserId))) {
              return false;
            }
            if (currentUserUid && (String(m.id) === String(currentUserUid) || String(m.uid) === String(currentUserUid))) {
              return false;
            }

            // Status check
            const statusStr = (m.status || '').toUpperCase().trim();
            if (statusStr === 'INACTIVE' || statusStr === 'EXPIRED' || statusStr === 'SUSPENDED') {
              return false;
            }

            // Subscription status check
            const subStatusStr = (m.subscription_status || m.subscriptionStatus || '').toUpperCase().trim();
            if (subStatusStr === 'INACTIVE' || subStatusStr === 'EXPIRED') {
              return false;
            }

            // Subscription end date check
            const endDateStr = m.subscription_end || m.subscription_end_date || m.subscriptionEndDate;
            if (endDateStr && subStatusStr !== 'ACTIVE') {
              try {
                const endDate = new Date(endDateStr);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (!isNaN(endDate.getTime()) && endDate < today) {
                  return false;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }

            return true;
          })
          .map((m: any) => {
            const fullName = getUserFullName(m) || m.name || m.full_name || 'Member';
            const pos = formatUserRoleOrPosition(m);
            const cat = m.category || m.business_category || m.business_name || '';
            const phone = m.phone || m.contact_phone || m.mobile || m.phone_number || '';
            const rawChapId = m.chapter_id || m.chapterId || '';
            const cId = rawChapId ? String(rawChapId).trim().toLowerCase() : '';
            const chapterName = cId ? (cmap.get(cId) || m.chapter_name || m.chapterName || 'Chapter') : (m.chapter_name || m.chapterName || 'No Chapter');

            return {
              ...m,
              id: m.id,
              uid: m.uid || m.id,
              name: fullName,
              displayName: fullName,
              position: pos,
              category: cat,
              phone: phone,
              chapterId: rawChapId,
              chapter_id: rawChapId,
              chapterName: chapterName
            };
          });

        setAllMembers(activeMembers);
        setMembers(activeMembers as unknown as UserProfile[]);
      }
    } catch (err) {
      console.error("Failed to fetch active members for referral dropdown:", err);
    }
  };

  const currentUserRecord = useMemo(() => allMembers.find(m => m.uid === profile?.uid || m.id === profile?.uid), [allMembers, profile]);
  const effectiveUserChapterId = currentUserRecord?.chapter_id || currentUserChapterId || profile?.chapter_id || (profile as any)?.chapterId;

  const filteredMembers = useMemo(() => {
    if (memberFilter === 'my_chapter') {
      const myChapId = String(effectiveUserChapterId || '').trim();
      if (!myChapId) return [];
      
      return allMembers.filter(m => {
        const memberChapId = String(m.chapter_id || m.chapterId || '').trim();
        if (!memberChapId) return false;
        return memberChapId === myChapId;
      });
    }
    return allMembers;
  }, [allMembers, memberFilter, effectiveUserChapterId]);

  const allCount = allMembers.length;
  const myChapterCount = useMemo(() => {
    const myChapId = String(effectiveUserChapterId || '').trim();
    if (!myChapId) return 0;
    
    return allMembers.filter(m => {
      const memberChapId = String(m.chapter_id || m.chapterId || '').trim();
      if (!memberChapId) return false;
      return memberChapId === myChapId;
    }).length;
  }, [allMembers, effectiveUserChapterId]);

  useEffect(() => {
    if (!profile) return;

    fetchReferrals();
    loadAllMembers();

    // Subscribe to realtime changes on referrals table
    const channel = supabase
      .channel('referrals-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'referrals' },
        () => {
          fetchReferrals();
        }
      )
      .subscribe();

    const handleRefresh = () => {
      fetchReferrals();
    };
    window.addEventListener('dashboard-refresh', handleRefresh);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, [profile, filter, memberFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const requiredFields = [
      { id: 'toUserId', value: formData.toUserId, name: 'Member' },
      { id: 'contactName', value: formData.contactName, name: 'Contact Name' },
      { id: 'contactPhone', value: formData.contactPhone, name: 'Contact Phone' },
      { id: 'requirement', value: formData.requirement, name: 'Requirement' }
    ];

    for (const field of requiredFields) {
      if (!field.value.trim()) {
        const el = document.getElementById(`referral-${field.id}`);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-red-500', 'border-red-500');
          setTimeout(() => el.classList.remove('ring-2', 'ring-red-500', 'border-red-500'), 3000);
        }
        
        let validationMsg = `${field.name} is required.`;
        if (field.id === 'toUserId') {
          validationMsg = "Receiver not selected.";
        }
        setErrorMessage(validationMsg);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const normalizedPhone = normalizePhoneNumber(formData.contactPhone);
      const currentAuthId = profile?.id || profile?.uid || (await supabase.auth.getUser()).data?.user?.id;

      if (!currentAuthId) {
        throw new Error("Missing sender_id: User is not authenticated.");
      }

      // STEP 4 - Sender: Use Logged in user's users.id
      let senderQuery = supabase.from('users').select('*');
      senderQuery = senderQuery.eq('id', currentAuthId);
      const { data: currentUserRecord, error: senderErr } = await senderQuery.maybeSingle();

      if (senderErr || !currentUserRecord) {
        console.error("Sender lookup error:", senderErr);
        throw new Error("The logged in user is invalid.");
      }

      const sender_id = currentUserRecord.id; // users.id
      let chapter_id = currentUserRecord.chapter_id || profile?.chapter_id || (profile as any)?.chapterId;

      const userRole = currentUserRecord.role || profile?.role;
      if (userRole === 'MASTER_ADMIN') {
        throw new Error("Master Admins cannot send referrals as they are not part of the business network.");
      }

      const selectedReceiverId = formData.toUserId || null;
      if (!selectedReceiverId) {
        throw new Error("The selected member is invalid.");
      }

      // STEP 3 - Before inserting: Run SELECT * FROM users WHERE id = receiver_id
      const { data: receiverRecord, error: receiverError } = await supabase
        .from('users')
        .select('*')
        .eq('id', selectedReceiverId)
        .maybeSingle();

      if (receiverError || !receiverRecord) {
        console.error("Receiver lookup error:", receiverError);
        throw new Error("The selected member is invalid.");
      }

      if (!chapter_id) {
        chapter_id = receiverRecord.chapter_id;
      }

      if (!chapter_id) {
        throw new Error("Missing chapter_id: Your account is not assigned to any chapter. Please contact your Chapter Admin.");
      }

      // STEP 7 - Debug logging
      console.log("Logged in user id:", sender_id);
      console.log("Selected member id:", selectedReceiverId);
      console.log("Sender lookup:", currentUserRecord);
      console.log("Receiver lookup:", receiverRecord);

      if (receiverError || !receiverRecord) {
        console.error("Receiver lookup error:", receiverError);
        throw new Error("The selected member is invalid.");
      }

      const receiver_id = receiverRecord.id; // users.id

      if (receiverRecord.role === 'MASTER_ADMIN') {
        throw new Error("Master Admins cannot receive referrals.");
      }

      const contact_name = formData.contactName ? formData.contactName.trim() : null;
      const contact_phone = normalizedPhone ? normalizedPhone.trim() : null;
      const business_requirement = formData.requirement ? formData.requirement.trim() : null;

      if (!contact_name) throw new Error("Missing contact_name (Customer Name)");
      if (!contact_phone) throw new Error("Missing contact_phone (Mobile Number)");
      if (!business_requirement) throw new Error("Missing business_requirement (Requirement)");

      // STEP 5 - Referral insert
      const newReferral = {
        sender_id: sender_id,
        receiver_id: receiver_id,
        chapter_id: chapter_id,
        from_user_id: sender_id,
        to_user_id: receiver_id,
        contact_name: contact_name,
        contact_phone: contact_phone,
        business_requirement: business_requirement,
        customer_name: contact_name,
        customer_mobile: contact_phone,
        requirement: business_requirement,
        notes: formData.notes ? formData.notes.trim() : '',
        status: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('referrals')
        .insert([newReferral]);

      if (insertError) {
        console.error("Referral Insert Error:", insertError);
        throw insertError;
      }

      try {
        await notificationService.sendNotification({
          userId: receiver_id,
          role: 'MEMBER',
          type: 'REFERRAL',
          title: 'Referral Received',
          message: `You received a new referral from ${profile?.name || currentUserRecord?.name || 'a member'} for ${contact_name}.`,
          relatedUserId: profile?.uid || profile?.id,
          link: '/referrals'
        });
      } catch (notifErr) {
        console.warn("Notification error:", notifErr);
      }

      // Requirement 6: Close modal, show success message, refresh list automatically
      setIsModalOpen(false);
      setFormData({ toUserId: '', contactName: '', contactPhone: '', requirement: '', notes: '' });
      setSuccessMessage("Referral submitted successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);

      await fetchReferrals();
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    } catch (error: any) {
      console.error("Referral submission error:", error);
      const fullErrorMsg = error?.message || (typeof error === 'string' ? error : "Database error occurred.");
      setErrorMessage(fullErrorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleThankYouSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedReferral || isSubmitting) return;

    if (!thankYouData.businessValue) {
      setErrorMessage("Please enter the business value.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const newSlip = {
        referral_id: selectedReferral.id,
        from_user_id: profile.uid || profile.id,
        to_user_id: selectedReferral.sender_id || selectedReferral.fromUserId,
        customer_name: selectedReferral.contactName,
        business_value: Number(thankYouData.businessValue),
        notes: thankYouData.notes,
        created_at: new Date().toISOString()
      };

      await supabase.from('thank_you_slips').insert([newSlip]);

      const { error: updateErr } = await supabase
        .from('referrals')
        .update({ 
          status: 'Completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReferral.id);

      if (updateErr) throw updateErr;

      // Send notifications to the referrer
      const referrerId = selectedReferral.sender_id || selectedReferral.fromUserId || selectedReferral.from_user_id;
      if (referrerId) {
        try {
          await notificationService.sendNotification({
            userId: referrerId,
            type: 'REFERRAL',
            title: 'Referral Completed',
            message: `Your referral for ${selectedReferral.contactName || selectedReferral.contact_name || 'your client'} has been completed.`,
            link: '/referrals'
          });

          await notificationService.sendNotification({
            userId: referrerId,
            type: 'THANKYOU',
            title: 'Thank You Slip Received',
            message: `You received a Thank You Slip from ${profile.name || 'a member'} for ₹${Number(thankYouData.businessValue).toLocaleString('en-IN')}.`,
            link: '/my-report'
          });
        } catch (nErr) {
          console.warn("Notification error:", nErr);
        }
      }

      setSuccessMessage("Referral updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsThankYouModalOpen(false);
      setThankYouData({ businessValue: '', notes: '' });
      setSelectedReferral(null);
      await fetchReferrals();
    } catch (error: any) {
      console.error("Error submitting thank you slip:", error);
      setErrorMessage(error?.message || "Failed to submit thank you slip.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotConverted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedReferral || !notConvertedReason || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error: updateErr } = await supabase
        .from('referrals')
        .update({ 
          status: 'Rejected',
          not_converted_reason: notConvertedReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReferral.id);

      if (updateErr) throw updateErr;

      const referrerId = selectedReferral.sender_id || selectedReferral.fromUserId || selectedReferral.from_user_id;
      if (referrerId) {
        try {
          await notificationService.sendNotification({
            userId: referrerId,
            type: 'REFERRAL',
            title: 'Referral Rejected',
            message: `Your referral for ${selectedReferral.contactName || selectedReferral.contact_name || 'your client'} was rejected / marked lost.`,
            link: '/referrals'
          });
        } catch (nErr) {
          console.warn("Notification error:", nErr);
        }
      }
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsNotConvertedModalOpen(false);
      setNotConvertedReason('');
      setSelectedReferral(null);
      await fetchReferrals();
    } catch (error: any) {
      console.error("Error updating status:", error);
      setErrorMessage(error?.message || "Failed to update referral status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedReferral || !updateStatusVal || isSubmitting) return;

    // Map 'Closed - Not Converted' to 'Rejected' and 'Converted to Business' to 'Completed' for consistency,
    // or we can use the exact strings. But we should respect the existing UI that handles 'Completed' and 'Rejected'.
    let dbStatus = updateStatusVal;
    if (updateStatusVal === 'Closed - Not Converted') dbStatus = 'Rejected';
    if (updateStatusVal === 'Converted to Business') dbStatus = 'Completed';

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error: updateErr } = await supabase
        .from('referrals')
        .update({ 
          status: dbStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReferral.id);

      if (updateErr) throw updateErr;

      const referrerId = selectedReferral.sender_id || selectedReferral.fromUserId || selectedReferral.from_user_id;
      if (referrerId) {
        let title = 'Referral Updated';
        let message = `The status of your referral for ${selectedReferral.contactName || selectedReferral.contact_name || 'your client'} was updated to: ${updateStatusVal}.`;
        
        if (dbStatus === 'Completed') {
          title = 'Referral Converted!';
          message = `Congratulations! Your referral for ${selectedReferral.contactName || selectedReferral.contact_name || 'your client'} was converted to business.`;
          
          // Notify the recipient as well
          if (profile.uid) {
            try {
              await notificationService.sendNotification({
                userId: profile.uid,
                type: 'REFERRAL',
                title: 'Business Closed!',
                message: `Congratulations! You successfully converted the referral for ${selectedReferral.contactName || selectedReferral.contact_name || 'your client'} into business.`,
                link: '/referrals'
              });
            } catch (nErr) {}
          }
        }

        try {
          await notificationService.sendNotification({
            userId: referrerId,
            type: 'REFERRAL',
            title,
            message,
            link: '/referrals'
          });
        } catch (nErr) {
          console.warn("Notification error:", nErr);
        }
      }

      setSuccessMessage('Status updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsUpdateStatusModalOpen(false);
      
      if (dbStatus === 'Completed') {
        setIsThankYouModalOpen(true);
      } else if (dbStatus === 'Rejected') {
        setIsNotConvertedModalOpen(true);
      } else {
        setSelectedReferral(null);
      }
      
      await fetchReferrals();
    } catch (error: any) {
      console.error("Error updating status:", error);
      setErrorMessage(error?.message || "Failed to update referral status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMasterAdmin = profile?.role === 'MASTER_ADMIN';
  const isPending = profile?.membershipStatus === 'PENDING' && !isMasterAdmin;

  const formatDateSafely = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'dd MMM yyyy, HH:mm');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24 px-4 sm:px-0 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-[16px] flex items-center justify-center shrink-0 shadow-sm shadow-primary/5">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight uppercase">
              My Referrals
            </h1>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.12em] mt-0.5">
              Pass and receive business opportunities
            </p>
          </div>
        </div>
        {!isPending && !isMasterAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 h-11 px-5 bg-primary text-white rounded-[12px] text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-primary/10 hover:bg-primary/90 shrink-0"
          >
            <Plus size={14} />
            <span>Pass Referral</span>
          </button>
        )}
      </div>

      {/* Feedback Messages */}
      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 right-4 left-4 z-[100] bg-emerald-500 text-white px-6 py-4 rounded-[16px] shadow-2xl flex items-center gap-3"
        >
          <CheckCircle2 size={24} />
          <span className="font-bold text-sm uppercase tracking-wider">{successMessage}</span>
        </motion.div>
      )}

      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-[16px] flex items-start gap-3"
        >
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <span className="text-xs font-semibold leading-relaxed">{errorMessage}</span>
        </motion.div>
      )}

      {/* Tabs & Action */}
      <div className="bg-[#111827] p-4 rounded-[20px] border border-white/5 space-y-4">
        <div className="flex gap-2 p-1 bg-[#05070D] rounded-[12px]">
          <button
            onClick={() => setFilter('received')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
              filter === 'received' ? "bg-primary text-white shadow-sm" : "text-neutral-400 hover:bg-[#1C2538]"
            )}
          >
            Received
          </button>
          <button
            onClick={() => setFilter('passed')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
              filter === 'passed' ? "bg-primary text-white shadow-sm" : "text-neutral-400 hover:bg-[#1C2538]"
            )}
          >
            Given
          </button>
        </div>
      </div>

      {isPending && (
        <div className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-[14px] flex items-center gap-3 text-amber-400">
          <AlertCircle size={20} className="text-amber-500 shrink-0" />
          <p className="text-[11px] font-bold leading-tight">
            Membership <span className="text-amber-500 uppercase">Pending</span>. You can pass referrals once approved.
          </p>
        </div>
      )}

      {/* Referral List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-8 text-center">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Loading Referrals...</p>
          </div>
        ) : isMasterAdmin ? (
          <div className="py-20 text-center bg-[#111827] rounded-[14px] border border-dashed border-white/5">
            <Users size={40} className="mx-auto text-neutral-500 mb-3" />
            <h3 className="text-sm font-bold text-white">Master Admin Account</h3>
            <p className="text-xs text-neutral-400 mt-1">Master Admins do not send or receive business referrals.</p>
          </div>
        ) : referrals.length > 0 ? (
          referrals.map((ref, i) => (
            <motion.div
              key={ref.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                setSelectedReferral(ref);
                setIsDetailModalOpen(true);
              }}
              className={cn(
                "bg-[#111827] p-5 rounded-[16px] shadow-sm border flex flex-col md:flex-row md:items-center justify-between gap-4 group active:scale-[0.99] transition-all duration-300 cursor-pointer relative overflow-hidden",
                (ref.status === 'PENDING' || ref.status === 'Pending') && filter === 'received' ? "border-amber-900/30 bg-amber-950/10" : "border-white/5"
              )}
            >
              {/* Left: Icon & Details */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0 relative mt-0.5",
                  ref.status === 'Completed' || ref.status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"
                )}>
                  {ref.status === 'Completed' || ref.status === 'COMPLETED' ? <CheckCircle2 size={24} /> : <ArrowRightLeft size={24} />}
                  {(ref.status === 'Pending' || ref.status === 'PENDING') && filter === 'received' && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    <span>Sender: <strong className="text-white">{ref.senderName}</strong></span>
                    <span className="text-neutral-600">•</span>
                    <span>Receiver: <strong className="text-white">{ref.receiverName}</strong></span>
                  </div>

                  <div className="text-sm font-semibold text-white">
                    Contact: {ref.contactName} {ref.contactPhone ? `(${ref.contactPhone})` : ''}
                  </div>

                  <p className="text-xs text-neutral-300 line-clamp-2">
                    Requirement: {ref.requirement}
                  </p>
                </div>
              </div>

              {/* Right: Date & Status */}
              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 border-white/5 pt-3 md:pt-0 shrink-0 gap-1.5">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  {formatDateSafely(ref.createdAt)}
                </p>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
                  (ref.status === 'Pending' || ref.status === 'PENDING') && "text-amber-400 bg-amber-500/10 border border-amber-500/20",
                  (ref.status === 'Completed' || ref.status === 'COMPLETED') && "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
                  (ref.status === 'Rejected' || ref.status === 'NOT_CONVERTED') && "text-red-400 bg-red-500/10 border border-red-500/20",
                  (ref.status === 'Accepted' || ref.status === 'CONTACTED') && "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                )}>
                  {ref.status.replace('_', ' ')}
                </span>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-20 text-center bg-[#111827] rounded-[14px] border border-dashed border-white/5">
            <Share2 size={40} className="mx-auto text-neutral-500 mb-3" />
            <h3 className="text-sm font-bold text-white">No referrals yet.</h3>
            <p className="text-xs text-neutral-400 mt-1">Your business referrals will appear here.</p>
          </div>
        )}
      </div>

      {/* Pass Referral Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Pass a New Referral"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Member Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              Filter Members
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#111827] p-1.5 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setMemberFilter('all')}
                className={cn(
                  "py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                  memberFilter === 'all'
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                <Users size={14} />
                All Members ({allCount})
              </button>
              <button
                type="button"
                onClick={() => setMemberFilter('my_chapter')}
                className={cn(
                  "py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                  memberFilter === 'my_chapter'
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                <Building2 size={14} />
                My Chapter ({myChapterCount})
              </button>
            </div>
          </div>

          {/* Member Selection Dropdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Select Member</label>
              <span className="text-xs text-neutral-400 font-semibold">{filteredMembers.length} active member(s)</span>
            </div>
            <select
              id="referral-toUserId"
              required
              value={formData.toUserId}
              onChange={(e) => {
                const selectedMemberId = e.target.value;
                setFormData({ ...formData, toUserId: selectedMemberId });
              }}
              className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white rounded-[12px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-medium"
            >
              <option value="" className="bg-[#111827] text-white">Choose a member...</option>
              {filteredMembers.map((m) => {
                const nameStr = m.displayName || m.name || 'Member';
                const chapterStr = m.chapterName ? ` (${m.chapterName})` : '';
                const posStr = m.position ? ` - ${m.position}` : '';
                const phoneStr = m.phone ? ` • ${m.phone}` : '';
                return (
                  <option key={m.id} value={m.id} className="bg-[#111827] text-white">
                    {nameStr}{chapterStr}{posStr}{phoneStr}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Contact Name</label>
              <input
                id="referral-contactName"
                required
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Who are you referring?"
                className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white placeholder-neutral-500 rounded-[12px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Contact Phone</label>
              <input
                id="referral-contactPhone"
                required
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="Phone number"
                className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white placeholder-neutral-500 rounded-[12px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Business Requirement</label>
            <textarea
              id="referral-requirement"
              required
              value={formData.requirement}
              onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
              placeholder="What does the contact need?"
              rows={3}
              className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white placeholder-neutral-500 rounded-[12px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Additional Notes (Optional)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any extra info for the member?"
              className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white placeholder-neutral-500 rounded-[12px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full py-4 bg-primary text-white rounded-[12px] font-bold hover:bg-red-700 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-red-500/20 active:scale-[0.98] flex items-center justify-center gap-2",
                isSubmitting && "opacity-70 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Referral"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Thank You Modal */}
      <Modal
        isOpen={isThankYouModalOpen}
        onClose={() => setIsThankYouModalOpen(false)}
        title="Submit Thank You Slip"
      >
        <form onSubmit={handleThankYouSubmit} className="space-y-6">
          <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5">
            <p className="text-xs text-neutral-400 uppercase font-bold tracking-widest mb-1">Referral From</p>
            <p className="text-sm font-bold text-white">
              {selectedReferral?.senderName}
            </p>
            <p className="text-xs text-neutral-400 mt-2">For: {selectedReferral?.contactName}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Business Value (₹)</label>
            <input
              required
              type="number"
              value={thankYouData.businessValue}
              onChange={(e) => setThankYouData({ ...thankYouData, businessValue: e.target.value })}
              placeholder="Enter amount in INR"
              className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white placeholder-neutral-500 rounded-[12px] focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Notes (Optional)</label>
            <textarea
              value={thankYouData.notes}
              onChange={(e) => setThankYouData({ ...thankYouData, notes: e.target.value })}
              placeholder="Add a thank you note..."
              rows={3}
              className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white placeholder-neutral-500 rounded-[12px] focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsThankYouModalOpen(false);
                setIsDetailModalOpen(true);
              }}
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 border border-white/10 text-neutral-400 rounded-[12px] font-bold uppercase tracking-widest text-[10px] hover:bg-[#1C2538] transition-all disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex-2 py-4 bg-red-600 text-white rounded-[12px] font-bold hover:bg-red-700 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-red-500/20 flex items-center justify-center gap-2",
                isSubmitting && "opacity-70 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Thank You Slip"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Not Converted Modal */}
      <Modal
        isOpen={isNotConvertedModalOpen}
        onClose={() => {
          setIsNotConvertedModalOpen(false);
          setSelectedReferral(null);
          setNotConvertedReason('');
        }}
        title="Reason for Not Converted"
      >
        <form onSubmit={handleNotConverted} className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-red-950/20 rounded-[16px] border border-red-900/30">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Referral Details</p>
              <p className="text-sm font-bold text-white">{selectedReferral?.contactName}</p>
              <p className="text-xs text-neutral-400">{selectedReferral?.requirement}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
                Select Reason
              </label>
              <select
                required
                value={notConvertedReason}
                onChange={(e) => setNotConvertedReason(e.target.value)}
                className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white rounded-[12px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-medium"
              >
                <option value="" className="bg-[#111827] text-white">Choose a reason...</option>
                <option value="Price Related" className="bg-[#111827] text-white">Price Related</option>
                <option value="Material / Product Not Available" className="bg-[#111827] text-white">Material / Product Not Available</option>
                <option value="Requirement Not Available" className="bg-[#111827] text-white">Requirement Not Available</option>
                <option value="Customer Not Interested" className="bg-[#111827] text-white">Customer Not Interested</option>
                <option value="Other" className="bg-[#111827] text-white">Other</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsNotConvertedModalOpen(false);
                setIsDetailModalOpen(true);
              }}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border border-white/10 text-neutral-400 rounded-[12px] font-bold uppercase tracking-widest text-[10px] hover:bg-[#1C2538] transition-all disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex-1 px-6 py-3 bg-red-600 text-white rounded-[12px] font-bold uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-red-200 flex items-center justify-center gap-2",
                isSubmitting && "opacity-70 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={isUpdateStatusModalOpen}
        onClose={() => {
          setIsUpdateStatusModalOpen(false);
          setSelectedReferral(null);
          setUpdateStatusVal('');
        }}
        title="Update Referral Status"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-[16px] border border-primary/20">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Referral Details</p>
              <p className="text-sm font-bold text-white">{selectedReferral?.contactName}</p>
              <p className="text-xs text-neutral-400">{selectedReferral?.requirement}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
                Select Status
              </label>
              <select
                required
                value={updateStatusVal}
                onChange={(e) => setUpdateStatusVal(e.target.value)}
                className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white rounded-[12px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-medium"
              >
                <option value="New" className="bg-[#111827] text-white">New</option>
                <option value="Contacted" className="bg-[#111827] text-white">Contacted</option>
                <option value="Meeting Scheduled" className="bg-[#111827] text-white">Meeting Scheduled</option>
                <option value="In Progress" className="bg-[#111827] text-white">In Progress</option>
                <option value="Converted to Business" className="bg-[#111827] text-white">Converted to Business</option>
                <option value="Closed - Not Converted" className="bg-[#111827] text-white">Closed - Not Converted</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsUpdateStatusModalOpen(false);
                setSelectedReferral(null);
              }}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border border-white/10 text-neutral-400 rounded-[12px] font-bold uppercase tracking-widest text-[10px] hover:bg-[#1C2538] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-[12px] font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Referral Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedReferral(null);
        }}
        title="Referral Details"
      >
        {selectedReferral && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-[#111827] rounded-[12px] border border-white/5 space-y-2">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                      Sender
                    </p>
                    <div className="flex items-center gap-2.5">
                      {selectedReferral.senderPhoto ? (
                        <img 
                          src={selectedReferral.senderPhoto} 
                          alt={selectedReferral.senderFullName || 'Sender'} 
                          className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {(selectedReferral.senderFullName || 'M').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white leading-tight truncate">
                          {selectedReferral.senderFullName || selectedReferral.senderName || 'Member'}
                        </p>
                        {selectedReferral.senderRole && (
                          <p className="text-xs font-semibold text-primary">
                            {selectedReferral.senderRole}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedReferral.senderCategory && (
                      <p className="text-xs text-neutral-300 font-medium">
                        Category: <span className="text-white font-semibold">{selectedReferral.senderCategory}</span>
                      </p>
                    )}
                    {selectedReferral.senderChapter && (
                      <p className="text-[11px] font-medium text-neutral-400">
                        Chapter: <span className="text-neutral-300">{selectedReferral.senderChapter}</span>
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-[#111827] rounded-[12px] border border-white/5 space-y-2">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                      Receiver
                    </p>
                    <div className="flex items-center gap-2.5">
                      {selectedReferral.receiverPhoto ? (
                        <img 
                          src={selectedReferral.receiverPhoto} 
                          alt={selectedReferral.receiverFullName || 'Receiver'} 
                          className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {(selectedReferral.receiverFullName || 'M').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white leading-tight truncate">
                          {selectedReferral.receiverFullName || selectedReferral.receiverName || 'Member'}
                        </p>
                        {selectedReferral.receiverRole && (
                          <p className="text-xs font-semibold text-primary">
                            {selectedReferral.receiverRole}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedReferral.receiverCategory && (
                      <p className="text-xs text-neutral-300 font-medium">
                        Category: <span className="text-white font-semibold">{selectedReferral.receiverCategory}</span>
                      </p>
                    )}
                    {selectedReferral.receiverChapter && (
                      <p className="text-[11px] font-medium text-neutral-400">
                        Chapter: <span className="text-neutral-300">{selectedReferral.receiverChapter}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Contact Details</p>
                      <p className="text-sm font-bold text-white">{selectedReferral.contactName}</p>
                      <p className="text-xs font-medium text-neutral-400">{selectedReferral.contactPhone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Created At</p>
                      <p className="text-xs font-bold text-neutral-300">{formatDateSafely(selectedReferral.createdAt)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Requirement</p>
                    <p className="text-sm font-medium text-white leading-relaxed">{selectedReferral.requirement}</p>
                  </div>

                  {selectedReferral.notes && (
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Notes</p>
                      <p className="text-sm font-medium text-white leading-relaxed italic">"{selectedReferral.notes}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Specific Info */}
              {(selectedReferral.status === 'Completed' || selectedReferral.status === 'COMPLETED') && (
                <div className="p-4 bg-emerald-950/20 rounded-[16px] border border-emerald-900/30">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Referral Converted</p>
                  </div>
                  {thankYouSlips.find(s => s.referralId === selectedReferral.id) && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tight">Amount Generated</span>
                        <span className="text-sm font-bold text-emerald-400">₹{thankYouSlips.find(s => s.referralId === selectedReferral.id)?.businessValue.toLocaleString()}</span>
                      </div>
                      {thankYouSlips.find(s => s.referralId === selectedReferral.id)?.notes && (
                        <div>
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-tight mb-1">Thank You Note</p>
                          <p className="text-xs font-medium text-emerald-400 italic">"{thankYouSlips.find(s => s.referralId === selectedReferral.id)?.notes}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(selectedReferral.status === 'Rejected' || selectedReferral.status === 'NOT_CONVERTED') && (
                <div className="p-4 bg-red-950/20 rounded-[16px] border border-red-900/30">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle size={18} className="text-red-400" />
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Not Converted</p>
                  </div>
                  <p className="text-xs font-bold text-red-400">Reason: {selectedReferral.notConvertedReason || 'N/A'}</p>
                </div>
              )}
            </div>

            {/* Actions for Received Tab */}
            {filter === 'received' && selectedReferral.status !== 'Completed' && selectedReferral.status !== 'COMPLETED' && selectedReferral.status !== 'Rejected' && selectedReferral.status !== 'NOT_CONVERTED' && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    let defaultStatus = selectedReferral.status || 'New';
                    if (defaultStatus === 'Pending' || defaultStatus === 'PENDING') defaultStatus = 'New';
                    if (defaultStatus === 'Completed' || defaultStatus === 'COMPLETED' || defaultStatus === 'CONVERTED') defaultStatus = 'Converted to Business';
                    if (defaultStatus === 'Rejected' || defaultStatus === 'NOT_CONVERTED') defaultStatus = 'Closed - Not Converted';
                    setUpdateStatusVal(defaultStatus);
                    setIsUpdateStatusModalOpen(true);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-[12px] font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-all active:scale-95"
                >
                  Update Status
                </button>
              </div>
            )}

            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="w-full py-3 text-neutral-400 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
