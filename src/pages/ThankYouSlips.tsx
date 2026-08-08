import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Plus, 
  TrendingUp, 
  Award, 
  Calendar, 
  User, 
  IndianRupee,
  ChevronRight,
  CheckCircle2,
  Download,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { databaseService } from '../services/databaseService';
import { supabase } from '../lib/supabaseClient';
import { ThankYouSlip, Referral, UserProfile, Category } from '../types';
import { Modal } from '../components/Modal';
import { deduplicateSlips } from '../utils/deduplicateSlips';
import { isValid } from 'date-fns';
import { safeFormat as format } from '../utils/dateUtils';
import {  where, orderBy  } from '../lib/database';
import { cn } from '../lib/utils';
import { WriteTestimonialModal } from '../components/WriteTestimonialModal';
import { notificationService } from '../services/notificationService';

export function ThankYouSlips() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [slips, setSlips] = useState<ThankYouSlip[]>([]);
  const [receivedSlips, setReceivedSlips] = useState<ThankYouSlip[]>([]);
  const [allSlips, setAllSlips] = useState<ThankYouSlip[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'sent' | 'received' | 'chapter'>('sent');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlipForDetails, setSelectedSlipForDetails] = useState<ThankYouSlip | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTestimonialPrompt, setShowTestimonialPrompt] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [testimonialReceiver, setTestimonialReceiver] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  const getUserName = (userId?: string | null): string => {
    if (!userId || userId === 'null' || userId === 'undefined') return 'Unknown Member';
    const target = String(userId).trim();
    if (!target) return 'Unknown Member';

    // 1. Check memberNames map
    if (
      memberNames[target] &&
      memberNames[target] !== 'Member Not Found' &&
      memberNames[target] !== 'Unknown Member' &&
      memberNames[target] !== 'Member' &&
      memberNames[target] !== 'N/A'
    ) {
      return memberNames[target];
    }

    // 2. Check allUsers list by id or uid
    const found = allUsers.find(
      u => String(u.id || '').trim() === target || String(u.uid || '').trim() === target
    );

    if (found) {
      const name = found.name || (found as any).full_name || found.displayName;
      if (name && name.trim()) return name.trim();
    }

    return 'Unknown Member';
  };

  // Filter state
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: '',
    fromUserId: '',
    toUserId: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    referralId: '',
    customerName: '',
    contactPhone: '',
    businessRequirement: '',
    senderName: '',
    referralDate: '',
    businessValue: '',
    notes: ''
  });

  const isMasterAdmin = profile?.role === 'MASTER_ADMIN';
  const isChapterAdmin = profile?.role === 'CHAPTER_ADMIN' || (profile?.role === 'MEMBER' && profile?.position === 'chapter_admin');
  const currentUserId = String(profile?.id || profile?.uid);

  // Fetch converted referrals where current user is the RECEIVER (Member B) and no Thank You Slip exists yet
  const fetchConvertedReferrals = useCallback(async () => {
    if (!profile) return;
    const userCandidateIds = Array.from(new Set([profile.id, profile.uid].filter(Boolean))).map(String);
    if (userCandidateIds.length === 0) return;

    const currentUid = String(profile.id || profile.uid);

    // Fetch existing slips to filter out referrals that already have a slip
    const { data: existingSlips } = await supabase
      .from('thank_you_slips')
      .select('referral_id, referralId');

    const existingSlipReferralIds = new Set<string>();
    if (existingSlips) {
      existingSlips.forEach((s: any) => {
        const refId = String(s.referral_id || s.referralId || '');
        if (refId && refId !== 'null' && refId !== 'undefined') {
          existingSlipReferralIds.add(refId);
        }
      });
    }

    const recOrClause = userCandidateIds.map(id => `receiver_id.eq.${id},to_user_id.eq.${id}`).join(',');
    const { data: rawRefs } = await supabase
      .from('referrals')
      .select('*')
      .or(recOrClause);

    if (rawRefs && rawRefs.length > 0) {
      const converted = rawRefs.filter((r: any) => {
        const sUpper = String(r.status || '').toUpperCase();
        const isConverted = sUpper === 'COMPLETED' || sUpper === 'CONVERTED' || sUpper === 'CONVERTED TO BUSINESS' || sUpper === 'GOT THE BUSINESS' || (r.status as string) === 'Completed';
        const receiverId = String(r.receiver_id || r.to_user_id || r.toUserId || '');
        const isReceiver = userCandidateIds.includes(receiverId) || receiverId === currentUid;
        const hasSlip = existingSlipReferralIds.has(String(r.id));
        return isConverted && isReceiver && !hasSlip;
      }).map((r: any) => ({
        id: String(r.id),
        sender_id: String(r.sender_id || r.from_user_id || r.fromUserId || ''),
        fromUserId: String(r.sender_id || r.from_user_id || r.fromUserId || ''),
        receiver_id: String(r.receiver_id || r.to_user_id || r.toUserId || ''),
        toUserId: String(r.receiver_id || r.to_user_id || r.toUserId || ''),
        contactName: r.contact_name || r.customer_name || 'Client',
        contactPhone: r.contact_phone || r.phone || r.contact_number || r.mobile || 'N/A',
        requirement: r.business_requirement || r.requirement || '',
        notes: r.notes || '',
        status: r.status,
        createdAt: r.created_at || r.createdAt
      } as Referral));
      setReferrals(converted);
    } else {
      databaseService.list<Referral>('referrals', [
        where('toUserId', '==', currentUid)
      ]).then(list => {
        setReferrals(list.filter(r => {
          const sUpper = String(r.status || '').toUpperCase();
          const isConverted = sUpper === 'COMPLETED' || sUpper === 'CONVERTED' || sUpper === 'CONVERTED TO BUSINESS' || sUpper === 'GOT THE BUSINESS' || (r.status as string) === 'Completed';
          return isConverted && !existingSlipReferralIds.has(String(r.id));
        }));
      });
    }
  }, [profile]);

  useEffect(() => {
    if (isMasterAdmin) {
      setActiveTab('all' as any);
    }
  }, [isMasterAdmin]);

  useEffect(() => {
    if (!profile) return;

    const userCandidateIds = Array.from(new Set([profile.id, profile.uid].filter(Boolean))).map(String);
    const currentUid = profile.uid || profile.id;

    // Fetch sent slips (where fromUserId == currentUid, i.e. logged-in user created/sent the slip)
    const unsubscribeSent = databaseService.subscribe<ThankYouSlip>('thank_you_slips', [
      where('fromUserId', '==', currentUid),
      orderBy('createdAt', 'desc')
    ], (data) => {
      if (data && data.length > 0) {
        setSlips(deduplicateSlips(data));
        setLoading(false);
      }
    });

    // Fetch received slips (where toUserId == currentUid, i.e. logged-in user receives the slip)
    const unsubscribeReceived = databaseService.subscribe<ThankYouSlip>('thank_you_slips', [
      where('toUserId', '==', currentUid),
      orderBy('createdAt', 'desc')
    ], (data) => {
      if (data && data.length > 0) {
        setReceivedSlips(deduplicateSlips(data));
      }
    });

    // Supabase fallback / sync for Sent & Received slips
    const fetchSupabaseSlips = async () => {
      if (userCandidateIds.length === 0) {
        setLoading(false);
        return;
      }

      setError(null);
      try {
        const sentOrClause = userCandidateIds.flatMap(id => [`from_user_id.eq.${id}`, `submitted_by.eq.${id}`]).join(',');
        const receivedOrClause = userCandidateIds.flatMap(id => [`to_user_id.eq.${id}`]).join(',');

        const [sentRes, recRes] = await Promise.all([
          supabase.from('thank_you_slips').select('*').or(sentOrClause).order('created_at', { ascending: false }),
          supabase.from('thank_you_slips').select('*').or(receivedOrClause).order('created_at', { ascending: false })
        ]);

        if (sentRes.error) {
          console.error("Error fetching sent thank you slips:", sentRes.error);
          setError(`Failed to load sent slips: ${sentRes.error.message}`);
        } else if (sentRes.data) {
          const mapSent = new Map<string, ThankYouSlip>();
          sentRes.data.forEach((s: any) => {
            const from = String(s.from_user_id || s.fromUserId || s.submitted_by || '');
            const to = String(s.to_user_id || s.toUserId || (s.receiver_id && String(s.receiver_id) !== from ? s.receiver_id : (s.sender_id && String(s.sender_id) !== from ? s.sender_id : '')) || '');
            const item: ThankYouSlip = {
              id: String(s.id),
              referralId: String(s.referral_id || s.referralId || ''),
              fromUserId: from,
              toUserId: to,
              customerName: s.customer_name || s.customerName || s.contact_name || '',
              businessValue: Number(s.business_value || s.businessValue || 0),
              notes: s.notes || s.thank_you_message || '',
              createdAt: s.created_at || s.createdAt || new Date().toISOString()
            };
            mapSent.set(item.id, item);
          });
          setSlips(deduplicateSlips(Array.from(mapSent.values())));
        }

        if (recRes.error) {
          console.error("Error fetching received thank you slips:", recRes.error);
          setError(`Failed to load received slips: ${recRes.error.message}`);
        } else if (recRes.data) {
          const mapRec = new Map<string, ThankYouSlip>();
          recRes.data.forEach((s: any) => {
            const from = String(s.from_user_id || s.fromUserId || s.submitted_by || '');
            const to = String(s.to_user_id || s.toUserId || (s.receiver_id && String(s.receiver_id) !== from ? s.receiver_id : (s.sender_id && String(s.sender_id) !== from ? s.sender_id : '')) || '');
            const item: ThankYouSlip = {
              id: String(s.id),
              referralId: String(s.referral_id || s.referralId || ''),
              fromUserId: from,
              toUserId: to,
              customerName: s.customer_name || s.customerName || s.contact_name || '',
              businessValue: Number(s.business_value || s.businessValue || 0),
              notes: s.notes || s.thank_you_message || '',
              createdAt: s.created_at || s.createdAt || new Date().toISOString()
            };
            mapRec.set(item.id, item);
          });
          setReceivedSlips(deduplicateSlips(Array.from(mapRec.values())));
        }

        if (isMasterAdmin) {
          const { data: allData, error: allError } = await supabase
            .from('thank_you_slips')
            .select('*')
            .order('created_at', { ascending: false });

          if (allError) {
            console.error("Error fetching all thank you slips:", allError);
          } else if (allData) {
            const mappedAll: ThankYouSlip[] = allData.map((s: any) => {
              const from = String(s.from_user_id || s.fromUserId || s.submitted_by || '');
              const to = String(s.to_user_id || s.toUserId || (s.receiver_id && String(s.receiver_id) !== from ? s.receiver_id : (s.sender_id && String(s.sender_id) !== from ? s.sender_id : '')) || '');
              return {
                id: String(s.id),
                referralId: String(s.referral_id || s.referralId || ''),
                fromUserId: from,
                toUserId: to,
                customerName: s.customer_name || s.customerName || s.contact_name || '',
                businessValue: Number(s.business_value || s.businessValue || 0),
                notes: s.notes || s.thank_you_message || '',
                createdAt: s.created_at || s.createdAt || new Date().toISOString()
              };
            });
            setAllSlips(deduplicateSlips(mappedAll));
          }
        }
      } catch (err: any) {
        console.error("Error in fetchSupabaseSlips:", err);
        setError("Failed to fetch thank you slips. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSupabaseSlips();
    fetchConvertedReferrals();

    // Subscribe to Supabase Realtime changes for immediate updates
    const realtimeChannel = supabase
      .channel('public:thank_you_slips_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'thank_you_slips' }, () => {
        fetchSupabaseSlips();
        fetchConvertedReferrals();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => {
        fetchConvertedReferrals();
      })
      .subscribe();

    let unsubscribeAll = () => {};
    if (isMasterAdmin) {
      const constraints = [orderBy('createdAt', 'desc')];

      unsubscribeAll = databaseService.subscribe<ThankYouSlip>('thank_you_slips', constraints, (data) => {
        setAllSlips(deduplicateSlips(data));
      });

      // Fetch users to resolve names
      databaseService.list<UserProfile>('users', []).then(users => {
        setAllUsers(users);
        const names: Record<string, string> = {};
        users.forEach(u => {
          const name = u.name || u.displayName || 'Member Not Found';
          if (u.uid) names[String(u.uid)] = name;
          if (u.id) names[String(u.id)] = name;
        });
        setMemberNames(prev => ({ ...prev, ...names }));
      });

      // Fetch categories
      supabase.from('categories').select('id, name').order('name').then(({ data }) => {
        if (data) setAllCategories(data as unknown as Category[]);
      });
    }

    // Fetch members to show names
    databaseService.list<UserProfile>('users', []).then(users => {
      const names: Record<string, string> = {};
      users.forEach(u => {
        const name = u.name || u.displayName || 'Member Not Found';
        if (u.uid) names[String(u.uid)] = name;
        if (u.id) names[String(u.id)] = name;
      });
      setMemberNames(prev => ({ ...prev, ...names }));
    });

    // Also fetch users from Supabase for complete name resolution
    supabase.from('users').select('*').then(({ data: sbUsers }) => {
      if (sbUsers) {
        setAllUsers(prev => {
          const combined = [...prev];
          sbUsers.forEach((u: any) => {
            if (!combined.some(existing => String(existing.id) === String(u.id) || String(existing.uid) === String(u.id) || (u.uid && String(existing.uid) === String(u.uid)))) {
              combined.push(u as unknown as UserProfile);
            }
          });
          return combined;
        });
        const sbNames: Record<string, string> = {};
        sbUsers.forEach((u: any) => {
          const name = u.name || u.full_name || u.displayName || 'Unknown Member';
          if (u.uid) sbNames[String(u.uid)] = name;
          if (u.id) sbNames[String(u.id)] = name;
        });
        setMemberNames(prev => ({ ...prev, ...sbNames }));
      }
    });

    return () => {
      unsubscribeSent();
      unsubscribeReceived();
      unsubscribeAll();
      realtimeChannel.unsubscribe();
    };
  }, [profile, isMasterAdmin]);

  const handleReferralSelect = (refId: string) => {
    const selected = referrals.find(r => String(r.id) === String(refId));
    if (selected) {
      const senderId = selected.sender_id || selected.fromUserId || '';
      const sName = memberNames[senderId] || (allUsers.find(u => String(u.id) === senderId || String(u.uid) === senderId)?.name) || (selected as any).senderName || 'Member';
      const refDate = selected.createdAt ? format(new Date(selected.createdAt), 'dd MMM yyyy') : '';
      setFormData(prev => ({
        ...prev,
        referralId: refId,
        customerName: selected.contactName || (selected as any).contact_name || (selected as any).customer_name || '',
        contactPhone: selected.contactPhone || (selected as any).contact_phone || (selected as any).phone || '',
        businessRequirement: selected.requirement || (selected as any).business_requirement || (selected as any).requirement || '',
        senderName: sName,
        referralDate: refDate
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        referralId: '',
        customerName: '',
        contactPhone: '',
        businessRequirement: '',
        senderName: '',
        referralDate: ''
      }));
    }
  };

  useEffect(() => {
    const paramRefId = searchParams.get('referralId');
    const action = searchParams.get('action');
    const openModal = searchParams.get('openModal');

    if (paramRefId) {
      if (referrals.length > 0) {
        const matchedRef = referrals.find(r => String(r.id) === String(paramRefId));
        if (matchedRef) {
          handleReferralSelect(matchedRef.id);
        }
      }
      setIsModalOpen(true);
    } else if (action === 'new' || openModal === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams, referrals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || isSubmitting) return;

    const selectedReferral = referrals.find(r => String(r.id) === String(formData.referralId));
    if (!selectedReferral) {
      setError("Please select an eligible referral.");
      return;
    }

    if (!formData.businessValue || Number(formData.businessValue) <= 0) {
      setError("Please enter a valid business transaction value.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const currentUserId = String(profile.uid || profile.id);
      const userCandidateIds = Array.from(new Set([profile.id, profile.uid].filter(Boolean))).map(String);

      // Fetch exact referral record from database to obtain original sender & receiver IDs
      const { data: refRow, error: refError } = await supabase
        .from('referrals')
        .select('*')
        .eq('id', selectedReferral.id)
        .maybeSingle();

      if (refError) {
        console.warn("Notice fetching referral record:", refError);
      }

      const originalSenderId = refRow?.sender_id || refRow?.from_user_id || refRow?.fromUserId || selectedReferral.sender_id || selectedReferral.fromUserId;
      const originalReceiverId = refRow?.receiver_id || refRow?.to_user_id || refRow?.toUserId || selectedReferral.receiver_id || selectedReferral.toUserId;

      // Rule 1: Validate that ONLY the Referral Receiver (Member B) can submit
      if (userCandidateIds.length > 0 && !userCandidateIds.includes(String(originalReceiverId)) && String(currentUserId) !== String(originalReceiverId)) {
        throw new Error("Only the referral receiver can submit a Thank You Slip for this referral.");
      }

      // Rule 5: DUPLICATE PREVENTION - Check if a Thank You Slip already exists for this referral
      const { data: existingSlips, error: checkError } = await supabase
        .from('thank_you_slips')
        .select('*')
        .or(`referral_id.eq.${String(selectedReferral.id)},referralId.eq.${String(selectedReferral.id)}`);

      if (checkError) {
        console.warn("Check existing slips notice:", checkError);
      }

      if (existingSlips && existingSlips.length > 0) {
        setReferrals(prev => prev.filter(r => String(r.id) !== String(selectedReferral.id)));
        throw new Error("A Thank You Slip has already been submitted for this referral.");
      }

      const targetSenderId = String(originalSenderId);

      // Clean payload for thank_you_slips table (REQUIREMENT 1)
      const cleanDbPayload = {
        referral_id: String(selectedReferral.id),
        sender_id: currentUserId,
        receiver_id: targetSenderId,
        submitted_by: currentUserId,
        contact_name: formData.customerName || selectedReferral.contactName || refRow?.contact_name || refRow?.customer_name || '',
        customer_name: formData.customerName || selectedReferral.contactName || refRow?.contact_name || refRow?.customer_name || '',
        contact_phone: formData.contactPhone || selectedReferral.contactPhone || refRow?.contact_phone || refRow?.phone || '',
        business_requirement: formData.businessRequirement || selectedReferral.requirement || refRow?.business_requirement || refRow?.requirement || '',
        thank_you_message: formData.notes || '',
        notes: formData.notes || '',
        business_value: Number(formData.businessValue),
        from_user_id: currentUserId,
        to_user_id: targetSenderId,
        created_at: new Date().toISOString()
      };

      // Perform single direct Supabase insert
      const { data: insertedData, error: insertError } = await supabase
        .from('thank_you_slips')
        .insert([cleanDbPayload])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505' || insertError.message?.toLowerCase().includes('unique') || insertError.message?.toLowerCase().includes('duplicate')) {
          throw new Error("A Thank You Slip has already been submitted for this referral.");
        }
        const errorParts = [
          insertError.message,
          insertError.code ? `(Code: ${insertError.code})` : '',
          insertError.details ? `Details: ${insertError.details}` : '',
          insertError.hint ? `Hint: ${insertError.hint}` : ''
        ].filter(Boolean).join(' ');
        throw new Error(errorParts || "Failed to save Thank You Slip to database.");
      }

      const newSlipId = insertedData?.id ? String(insertedData.id) : Math.random().toString(36).substring(2, 15);

      const slipObject: ThankYouSlip = {
        id: newSlipId,
        referralId: String(selectedReferral.id),
        fromUserId: currentUserId,
        toUserId: targetSenderId,
        customerName: cleanDbPayload.customer_name,
        businessValue: cleanDbPayload.business_value,
        notes: cleanDbPayload.notes,
        createdAt: cleanDbPayload.created_at
      };

      // Real-time update local state with deduplication
      setSlips(prev => deduplicateSlips([slipObject, ...prev]));

      // Remove referral from dropdown immediately
      setReferrals(prev => prev.filter(r => String(r.id) !== String(selectedReferral.id)));

      // Mark referral status as completed
      await supabase.from('referrals').update({ status: 'Completed', updated_at: new Date().toISOString() }).eq('id', selectedReferral.id);
      try {
        await databaseService.update('referrals', formData.referralId, { status: 'Completed' });
      } catch (dbErr) {}

      // Send Notification to Referral Sender (Member A)
      try {
        const receiverName = profile.name || (profile as any).displayName || 'a member';
        await notificationService.sendNotification({
          userId: targetSenderId,
          type: 'THANKYOU',
          title: 'Thank You Slip Received',
          message: `You have received a Thank You Slip from ${receiverName}.`,
          link: '/thank-you-slips'
        });
      } catch (notifErr) {
        console.warn("Notification error:", notifErr);
      }

      const receiver = allUsers.find(u => String(u.uid) === targetSenderId || String(u.id) === targetSenderId) || null;
      setTestimonialReceiver(receiver);

      setShowSuccess(true);
      setFormData({
        referralId: '',
        customerName: '',
        contactPhone: '',
        businessRequirement: '',
        senderName: '',
        referralDate: '',
        businessValue: '',
        notes: ''
      });

      setTimeout(() => {
        setIsModalOpen(false);
        setShowSuccess(false);
        // Removed testimonial prompt for receiver
      }, 2000);
    } catch (err: any) {
      console.error("Error submitting thank you slip:", err);
      setError(err?.message || "Failed to submit thank you slip.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSlips = allSlips.filter(slip => {
    if (isChapterAdmin) {
      const associatedMemberIds = [...allUsers.filter(m => m.chapter_id === profile?.chapter_id || m.adminId === profile?.uid).map(m => m.uid || (m as any).id), profile?.uid];
      if (!associatedMemberIds.includes(slip.fromUserId) && !associatedMemberIds.includes(slip.toUserId)) return false;
    }
    
    // Date filter
    if (filters.startDate && new Date(slip.createdAt) < new Date(filters.startDate)) return false;
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(slip.createdAt) > end) return false;
    }
    
    // User filters
    if (filters.fromUserId && slip.fromUserId !== filters.fromUserId) return false;
    if (filters.toUserId && slip.toUserId !== filters.toUserId) return false;
    
    // Category filter (based on the recipient's category)
    if (filters.category) {
      const recipient = allUsers.find(u => u.uid === slip.toUserId);
      if (recipient?.category !== filters.category) return false;
    }
    
    return true;
  });

  // Business Generated & Business Sent: Total business sent by the user (slips submitted by user)
  const totalBusinessSent = isMasterAdmin 
    ? filteredSlips.reduce((acc, slip) => acc + (Number(slip.businessValue || slip.business_value) || 0), 0)
    : allSlips.reduce((acc, slip) => {
        const ref = referrals.find(r => String(r.id) === String(slip.referralId || slip.referral_id));
        const senderId = ref ? String(ref.fromUserId || ref.from_user_id || ref.sender_id) : String(slip.toUserId);
        const val = ref && (ref as any).business_amount ? Number((ref as any).business_amount) : Number(slip.businessValue || slip.business_value) || 0;
        return String(senderId) === String(currentUserId) ? acc + val : acc;
      }, 0);
  
  // Business Generated always equals Business Sent
  const totalBusinessGenerated = totalBusinessSent;

  // Business Received: Total business received by the user (slips received where user is toUserId)
  const totalBusinessReceived = isMasterAdmin
    ? filteredSlips.reduce((acc, slip) => acc + (Number(slip.businessValue || slip.business_value) || 0), 0)
    : allSlips.reduce((acc, slip) => {
        const ref = referrals.find(r => String(r.id) === String(slip.referralId || slip.referral_id));
        const receiverId = ref ? String(ref.toUserId || ref.to_user_id || ref.receiver_id) : String(slip.fromUserId);
        const val = ref && (ref as any).business_amount ? Number((ref as any).business_amount) : Number(slip.businessValue || slip.business_value) || 0;
        return String(receiverId) === String(currentUserId) ? acc + val : acc;
      }, 0);

  // totalBusinessGenerated is synchronized with totalBusinessSent above

  const totalBusinessReceivedFiltered = filteredSlips.reduce((acc, slip) => acc + (Number(slip.businessValue || slip.business_value) || 0), 0);

  const totalNetworkBusiness = filteredSlips.reduce((acc, slip) => acc + (Number(slip.businessValue || slip.business_value) || 0), 0);

  const downloadReport = () => {
    const dataToExport = isMasterAdmin || activeTab === 'chapter' ? filteredSlips : (activeTab === 'sent' ? slips : activeTab === 'received' ? receivedSlips : filteredSlips);
    
    const headers = ['Date', 'Customer', 'From Member', 'To Member', 'Business Value (₹)', 'Notes'];
    const rows = dataToExport.map(slip => [
      format(new Date(slip.createdAt), 'yyyy-MM-dd HH:mm'),
      `"${slip.customerName.replace(/"/g, '""')}"`,
      `"${(memberNames[slip.fromUserId] || slip.fromUserId).replace(/"/g, '""')}"`,
      `"${(memberNames[slip.toUserId] || slip.toUserId).replace(/"/g, '""')}"`,
      slip.businessValue,
      `"${(slip.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `thank_you_slips_report_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-8">
        {/* Header Section */}
        <header className="relative p-4 sm:p-6 md:p-8 bg-[#111827] border border-white/5 rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full -ml-24 -mb-24 blur-2xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 backdrop-blur-md rounded-xl sm:rounded-[16px] flex items-center justify-center text-white shadow-inner shrink-0">
                <Award className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight uppercase">
                  Thank You Slips
                </h1>
                <p className="text-[9px] sm:text-[10px] text-neutral-300 font-bold uppercase tracking-[0.15em] mt-0.5">
                  Business Value generated through the network
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-4">
              {!isMasterAdmin && (
                <button
                  onClick={() => {
                    setError(null);
                    fetchConvertedReferrals();
                    setIsModalOpen(true);
                  }}
                  className="group relative flex items-center justify-center gap-2 sm:gap-3 px-4 py-2.5 sm:px-6 sm:py-4 bg-primary text-white rounded-xl sm:rounded-[16px] text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all hover:bg-primary/90 active:scale-95 shadow-lg cursor-pointer"
                >
                  <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  <span>Give Thank You Slip</span>
                </button>
              )}
              <button
                onClick={downloadReport}
                className="group relative flex items-center justify-center gap-2 sm:gap-3 px-4 py-2.5 sm:px-6 sm:py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl sm:rounded-[16px] text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all hover:bg-white/20 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.03)] cursor-pointer"
              >
                <Download className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </header>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111827] p-3.5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl space-y-3 sm:space-y-6"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-4 sm:h-6 bg-secondary rounded-full" />
            <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-[0.15em] sm:tracking-[0.2em] font-display">Filter Reports</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-6 items-end">
            <div className="space-y-1 sm:space-y-2">
              <label className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-[16px] bg-[#151C2E] border border-white/5 text-xs sm:text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <label className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-[16px] bg-[#151C2E] border border-white/5 text-xs sm:text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-end">
              <button
                onClick={() => setFilters({ startDate: '', endDate: '', category: '', fromUserId: '', toUserId: '' })}
                className="w-full sm:w-auto px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-bold text-red-400 uppercase tracking-widest hover:bg-red-500/10 rounded-xl sm:rounded-[12px] transition-all"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
        {!isMasterAdmin ? (
          <>
            <div className="bg-[#0F172A]/80 backdrop-blur-md rounded-xl sm:rounded-[14px] p-2.5 sm:p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col justify-center items-center text-center h-[95px] sm:h-[135px] transition-all duration-300 w-full gap-0.5 sm:gap-1">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border border-emerald-500/30 bg-emerald-950/80 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
              </div>
              <span className="text-[9px] sm:text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider leading-none truncate w-full mt-0.5">Business Generated</span>
              <div className="text-[15px] sm:text-[22px] font-black text-white leading-none tracking-tight truncate w-full mt-0.5">
                ₹{totalBusinessSent.toLocaleString()}
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5 w-full mt-0.5">
                <span className="text-[7.5px] sm:text-[9px] font-bold text-[#9CA3AF] leading-none uppercase truncate w-full">
                  {slips.length} slips submitted
                </span>
              </div>
            </div>

            <div className="bg-[#0F172A]/80 backdrop-blur-md rounded-xl sm:rounded-[14px] p-2.5 sm:p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col justify-center items-center text-center h-[95px] sm:h-[135px] transition-all duration-300 w-full gap-0.5 sm:gap-1">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border border-blue-500/30 bg-blue-950/80 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
              </div>
              <span className="text-[9px] sm:text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider leading-none truncate w-full mt-0.5">Business Received</span>
              <div className="text-[15px] sm:text-[22px] font-black text-white leading-none tracking-tight truncate w-full mt-0.5">
                ₹{totalBusinessReceived.toLocaleString()}
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5 w-full mt-0.5">
                <span className="text-[7.5px] sm:text-[9px] font-bold text-[#9CA3AF] leading-none uppercase truncate w-full">
                  {receivedSlips.length} slips received
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-[#0F172A]/80 backdrop-blur-md rounded-xl sm:rounded-[14px] p-2.5 sm:p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col justify-center items-center text-center h-[95px] sm:h-[135px] transition-all duration-300 w-full gap-0.5 sm:gap-1">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border border-emerald-500/30 bg-emerald-950/80 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
              </div>
              <span className="text-[9px] sm:text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider leading-none truncate w-full mt-0.5">Total Generated</span>
              <div className="text-[15px] sm:text-[22px] font-black text-white leading-none tracking-tight truncate w-full mt-0.5">
                ₹{totalBusinessGenerated.toLocaleString()}
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5 w-full mt-0.5">
                <span className="text-[7.5px] sm:text-[9px] font-bold text-[#9CA3AF] leading-none uppercase truncate w-full">
                  Network-wide passed
                </span>
              </div>
            </div>

            <div className="bg-[#0F172A]/80 backdrop-blur-md rounded-xl sm:rounded-[14px] p-2.5 sm:p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col justify-center items-center text-center h-[95px] sm:h-[135px] transition-all duration-300 w-full gap-0.5 sm:gap-1">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border border-blue-500/30 bg-blue-950/80 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
              </div>
              <span className="text-[9px] sm:text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider leading-none truncate w-full mt-0.5">Total Received</span>
              <div className="text-[15px] sm:text-[22px] font-black text-white leading-none tracking-tight truncate w-full mt-0.5">
                ₹{totalBusinessReceivedFiltered.toLocaleString()}
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5 w-full mt-0.5">
                <span className="text-[7.5px] sm:text-[9px] font-bold text-[#9CA3AF] leading-none uppercase truncate w-full">
                  Network-wide received
                </span>
              </div>
            </div>

            <div className="bg-[#0F172A]/80 backdrop-blur-md rounded-xl sm:rounded-[14px] p-2.5 sm:p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col justify-center items-center text-center h-[95px] sm:h-[135px] transition-all duration-300 w-full gap-0.5 sm:gap-1 col-span-2 sm:col-span-1 lg:col-span-1">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border border-amber-500/30 bg-amber-950/80 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
              </div>
              <span className="text-[9px] sm:text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider leading-none truncate w-full mt-0.5">Network Volume</span>
              <div className="text-[15px] sm:text-[22px] font-black text-white leading-none tracking-tight truncate w-full mt-0.5">
                ₹{totalNetworkBusiness.toLocaleString()}
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5 w-full mt-0.5">
                <span className="text-[7.5px] sm:text-[9px] font-bold text-[#9CA3AF] leading-none uppercase truncate w-full">
                  Total transaction volume
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tabs / Section Header */}
      {!isMasterAdmin ? (
        <div className="flex p-1 bg-[#151C2E] rounded-xl sm:rounded-[12px] w-full md:w-fit border border-white/5">
          <button
            onClick={() => setActiveTab('sent')}
            className={cn(
              "flex-1 md:flex-none px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-300",
              activeTab === 'sent' ? "bg-primary text-white shadow-sm" : "text-neutral-400 hover:text-white"
            )}
          >
            Sent
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={cn(
              "flex-1 md:flex-none px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-300",
              activeTab === 'received' ? "bg-primary text-white shadow-sm" : "text-neutral-400 hover:text-white"
            )}
          >
            Received
          </button>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 bg-[#111827] rounded-xl sm:rounded-[16px] border border-white/5 shadow-sm">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-1.5 h-5 sm:h-6 bg-primary rounded-full" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Business Activity Reports
              </h2>
              <p className="text-neutral-400 text-[10px] sm:text-xs font-medium tracking-wide">Viewing all business activity across the network.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 sm:px-6 py-1.5 sm:py-2 bg-primary/10 text-primary rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] border border-primary/20">
              {isMasterAdmin ? 'Master Admin' : 'Chapter Admin'}
            </div>
          </div>
        </div>
      )}

      {/* Slips List */}
      <div className="space-y-4 sm:space-y-6">
        {loading ? (
          <div className="py-16 sm:py-24 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin mx-auto mb-3 sm:mb-4" />
            <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest">Loading Slips...</p>
          </div>
        ) : (activeTab === 'sent' ? slips : activeTab === 'received' ? receivedSlips : filteredSlips).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {(activeTab === 'sent' ? slips : activeTab === 'received' ? receivedSlips : filteredSlips).map((slip) => {
              const targetUser = activeTab === 'sent'
                ? allUsers.find(u => String(u.uid) === String(slip.toUserId) || String(u.id) === String(slip.toUserId))
                : allUsers.find(u => String(u.uid) === String(slip.fromUserId) || String(u.id) === String(slip.fromUserId));
              const businessCategory = targetUser?.category || targetUser?.businessCategory || 'General';

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={slip.id}
                  className="group bg-[#111827] p-3.5 sm:p-6 rounded-xl sm:rounded-[16px] border border-white/5 shadow-sm hover:border-white/10 transition-all duration-300 space-y-3 sm:space-y-4"
                >
                  {/* Top Bar: Slip Number, Status Badge & Date/Time */}
                  <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shadow-sm shrink-0",
                        activeTab === 'sent' ? "bg-emerald-500/10 text-emerald-400" : 
                        activeTab === 'received' ? "bg-primary/10 text-primary" : "bg-[#151C2E] text-neutral-400"
                      )}>
                        {activeTab === 'sent' ? <TrendingUp className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Award className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
                      </div>
                      <div>
                        <span className="text-[11px] sm:text-xs font-bold text-white tracking-wide block">
                          #TYS-{slip.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="inline-block px-2 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                          Completed
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] sm:text-[10px] font-medium text-neutral-400 block">
                        {format(new Date(slip.createdAt), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                  </div>

                  {/* Grid Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 py-1 sm:py-2">
                    <div className="space-y-0.5 sm:space-y-1">
                      <p className="text-[9px] sm:text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Referral ID</p>
                      <p className="text-[11px] sm:text-xs font-bold text-primary truncate">
                        #REF-{(slip.referralId || 'N/A').slice(-6).toUpperCase()}
                      </p>
                    </div>

                    <div className="space-y-0.5 sm:space-y-1">
                      <p className="text-[9px] sm:text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                        {activeTab === 'sent' ? 'Referral Receiver' : activeTab === 'received' ? 'Referral Sender' : 'Members'}
                      </p>
                      {activeTab === 'sent' ? (
                        <Link 
                          to={`/profile?id=${slip.toUserId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] sm:text-xs font-bold text-white hover:text-primary transition-colors truncate block"
                        >
                          {getUserName(slip.toUserId)}
                        </Link>
                      ) : activeTab === 'received' ? (
                        <Link 
                          to={`/profile?id=${slip.fromUserId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] sm:text-xs font-bold text-white hover:text-primary transition-colors truncate block"
                        >
                          {getUserName(slip.fromUserId)}
                        </Link>
                      ) : (
                        <div className="text-[10px] sm:text-xs font-medium text-white">
                          <div className="truncate">From: {getUserName(slip.fromUserId)}</div>
                          <div className="truncate">To: {getUserName(slip.toUserId)}</div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5 sm:space-y-1">
                      <p className="text-[9px] sm:text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Category</p>
                      <span className="inline-block px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-neutral-300 bg-white/5 rounded-md border border-white/10 truncate max-w-full">
                        {businessCategory}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Customer</p>
                      <p className="text-xs font-semibold text-white truncate">{slip.customerName || 'N/A'}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Slip Date</p>
                      <p className="text-xs font-semibold text-white">
                        {format(new Date(slip.createdAt), 'dd MMM yyyy')}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                        {activeTab === 'sent' ? 'Business Received' : 'Business Amount'}
                      </p>
                      <p className="text-sm font-bold text-emerald-400 tracking-tight">
                        ₹{Number(slip.businessValue || slip.business_value || slip.amount || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  {/* Notes & View Details Footer */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    {slip.notes ? (
                      <p className="text-xs text-neutral-300 italic line-clamp-1 leading-relaxed max-w-[70%]">"{slip.notes}"</p>
                    ) : <div />}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSlipForDetails(slip);
                      }}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-auto"
                    >
                      View Details <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-32 text-center bg-[#111827] rounded-[2.5rem] border border-dashed border-white/5">
            <div className="w-20 h-20 bg-[#151C2E] rounded-full flex items-center justify-center mx-auto mb-6 text-neutral-600">
              {activeTab === 'sent' ? <TrendingUp size={40} /> : <Award size={40} />}
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-2">
              {activeTab === 'sent' ? 'No slips sent yet' : 'No slips received yet'}
            </h3>
            <p className="text-neutral-400 text-sm font-medium max-w-md mx-auto">
              {activeTab === 'sent' 
                ? 'Submit your first thank you slip once a referral converts into business.' 
                : 'When other members generate business from your referrals, they will appear here.'}
            </p>
          </div>
        )}
      </div>

      {/* Submit Slip Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setShowSuccess(false);
          }
        }}
        title="Submit Thank You Slip"
      >
        {showSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Slip Submitted!</h3>
            <p className="text-neutral-400 font-medium">Thank you for sharing your business success.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-[12px] text-sm font-bold flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Select Referral</label>
              <select
                required
                value={formData.referralId}
                onChange={(e) => handleReferralSelect(e.target.value)}
                className="w-full px-4 py-3 rounded-[12px] border border-white/5 bg-[#151C2E] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
              >
                <option value="" className="bg-[#111827]">Choose an eligible converted referral...</option>
                {referrals.map((r) => {
                  const dateStr = r.createdAt ? format(new Date(r.createdAt), 'dd MMM yyyy') : '';
                  return (
                    <option key={r.id} value={r.id} className="bg-[#111827]">
                      {r.contactName || 'Client'} - {r.requirement || 'Requirement'} {dateStr ? `(${dateStr})` : ''}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-neutral-400">Only referrals received by you that haven't received a Thank You Slip yet will appear here.</p>
            </div>

            {formData.referralId && (
              <div className="space-y-4 p-4 rounded-[12px] bg-[#151C2E]/70 border border-white/5">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Auto-filled Referral Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Customer Name</label>
                    <input
                      required
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      placeholder="Customer Name"
                      className="w-full px-3 py-2 rounded-[8px] border border-white/5 bg-[#111827] text-white text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Customer Mobile Number</label>
                    <input
                      type="text"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="Customer Mobile Number"
                      className="w-full px-3 py-2 rounded-[8px] border border-white/5 bg-[#111827] text-white text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Business Requirement</label>
                    <input
                      type="text"
                      value={formData.businessRequirement}
                      onChange={(e) => setFormData({ ...formData, businessRequirement: e.target.value })}
                      placeholder="Business Requirement"
                      className="w-full px-3 py-2 rounded-[8px] border border-white/5 bg-[#111827] text-white text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Referral Sender Name</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.senderName}
                      className="w-full px-3 py-2 rounded-[8px] border border-white/5 bg-[#111827]/60 text-neutral-300 text-xs outline-none cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Referral Date</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.referralDate}
                      className="w-full px-3 py-2 rounded-[8px] border border-white/5 bg-[#111827]/60 text-neutral-300 text-xs outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Transaction Value (₹)</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                  <IndianRupee size={18} />
                </div>
                <input
                  required
                  type="number"
                  value={formData.businessValue}
                  onChange={(e) => setFormData({ ...formData, businessValue: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-3 rounded-[12px] border border-white/5 bg-[#151C2E] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Thank You Message (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Write a thank you message to the referrer..."
                rows={3}
                className="w-full px-4 py-3 rounded-[12px] border border-white/5 bg-[#151C2E] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-sm"
              />
              <p className="text-xs text-neutral-400 italic">This message will be visible to the member who provided the referral.</p>
            </div>

            <div className="sticky bottom-0 bg-[#111827] pt-3 pb-2 sm:pb-1 -mx-4 px-4 sm:-mx-6 sm:px-6 border-t border-white/5 shadow-xl z-10 mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full py-3.5 sm:py-4 bg-primary text-white rounded-xl sm:rounded-[12px] font-bold hover:bg-primary/90 transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-widest cursor-pointer",
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
        )}
      </Modal>

              {testimonialReceiver && (
  <WriteTestimonialModal
    isOpen={showWriteModal}
    onClose={() => setShowWriteModal(false)}
    author={profile}
    receiver={testimonialReceiver}
  />
)}

      {/* Thank You Slip Details Modal */}
      <Modal
        isOpen={selectedSlipForDetails !== null}
        onClose={() => setSelectedSlipForDetails(null)}
        title="Thank You Slip Details"
      >
        {selectedSlipForDetails && (() => {
          const senderId = selectedSlipForDetails.fromUserId || (selectedSlipForDetails as any).from_user_id || (selectedSlipForDetails as any).submitted_by;
          const receiverId = selectedSlipForDetails.toUserId || (selectedSlipForDetails as any).to_user_id;

          const senderName = getUserName(senderId);
          const receiverName = getUserName(receiverId);

          const formattedDate = selectedSlipForDetails.createdAt
            ? format(new Date(selectedSlipForDetails.createdAt), 'dd MMM yyyy')
            : 'Unknown Date';
          const formattedAmount = `₹${Number(selectedSlipForDetails.businessValue || (selectedSlipForDetails as any).business_value || (selectedSlipForDetails as any).amount || 0).toLocaleString('en-IN')}`;

          const showToField = isMasterAdmin || isChapterAdmin;

          return (
            <div className="space-y-4 p-1">
              <div className="p-5 bg-[#151C2E] rounded-[20px] border border-white/10 space-y-3.5 shadow-xl">
                {/* Member */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Member:</span>
                  <span className="text-sm font-bold text-white">{senderName}</span>
                </div>

                {/* Date */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Date:</span>
                  <span className="text-sm font-semibold text-white">{formattedDate}</span>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{
                    String(senderId) === String(currentUserId) ? "Business Received:" : "Business Amount:"
                  }</span>
                  <span className="text-base font-extrabold text-emerald-400">{formattedAmount}</span>
                </div>

                {/* From */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">From:</span>
                  <span className="text-sm font-bold text-white">{senderName}</span>
                </div>

                {/* To (Only for Master Admin and Chapter Admin) */}
                {showToField && (
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">To:</span>
                    <span className="text-sm font-bold text-white">{receiverName}</span>
                  </div>
                )}

                {/* Notes */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Notes:</span>
                  <p className="text-xs text-neutral-200 leading-relaxed italic bg-black/20 p-3 rounded-xl border border-white/5">
                    {selectedSlipForDetails.notes || 'Thank you'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedSlipForDetails(null)}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
