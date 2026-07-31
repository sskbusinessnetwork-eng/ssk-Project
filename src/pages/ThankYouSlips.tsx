import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import { format as originalFormat, isValid } from 'date-fns';
import {  where, orderBy  } from '../lib/database';
import { cn } from '../lib/utils';
import { WriteTestimonialModal } from '../components/WriteTestimonialModal';
import { notificationService } from '../services/notificationService';

const format = (date: any, formatStr: string, options?: any) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return isValid(d) ? originalFormat(d, formatStr, options) : 'N/A';
};

export function ThankYouSlips() {
  const { profile } = useAuth();
  const [slips, setSlips] = useState<ThankYouSlip[]>([]);
  const [receivedSlips, setReceivedSlips] = useState<ThankYouSlip[]>([]);
  const [allSlips, setAllSlips] = useState<ThankYouSlip[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'sent' | 'received' | 'chapter'>('sent');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTestimonialPrompt, setShowTestimonialPrompt] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [testimonialReceiver, setTestimonialReceiver] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

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
        setSlips(data);
        setLoading(false);
      }
    });

    // Fetch received slips (where toUserId == currentUid, i.e. logged-in user receives the slip)
    const unsubscribeReceived = databaseService.subscribe<ThankYouSlip>('thank_you_slips', [
      where('toUserId', '==', currentUid),
      orderBy('createdAt', 'desc')
    ], (data) => {
      if (data && data.length > 0) {
        setReceivedSlips(data);
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
        const sentOrClause = userCandidateIds.flatMap(id => [`from_user_id.eq.${id}`, `submitted_by.eq.${id}`, `receiver_id.eq.${id}`]).join(',');
        const receivedOrClause = userCandidateIds.flatMap(id => [`to_user_id.eq.${id}`, `sender_id.eq.${id}`]).join(',');

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
            const item: ThankYouSlip = {
              id: String(s.id),
              referralId: String(s.referral_id || s.referralId || ''),
              fromUserId: String(s.from_user_id || s.fromUserId || s.submitted_by || s.receiver_id || ''),
              toUserId: String(s.to_user_id || s.toUserId || s.sender_id || ''),
              customerName: s.customer_name || s.customerName || s.contact_name || '',
              businessValue: Number(s.business_value || s.businessValue || 0),
              notes: s.notes || s.thank_you_message || '',
              createdAt: s.created_at || s.createdAt || new Date().toISOString()
            };
            mapSent.set(item.id, item);
          });
          setSlips(Array.from(mapSent.values()));
        }

        if (recRes.error) {
          console.error("Error fetching received thank you slips:", recRes.error);
          setError(`Failed to load received slips: ${recRes.error.message}`);
        } else if (recRes.data) {
          const mapRec = new Map<string, ThankYouSlip>();
          recRes.data.forEach((s: any) => {
            const item: ThankYouSlip = {
              id: String(s.id),
              referralId: String(s.referral_id || s.referralId || ''),
              fromUserId: String(s.from_user_id || s.fromUserId || s.submitted_by || s.receiver_id || ''),
              toUserId: String(s.to_user_id || s.toUserId || s.sender_id || ''),
              customerName: s.customer_name || s.customerName || s.contact_name || '',
              businessValue: Number(s.business_value || s.businessValue || 0),
              notes: s.notes || s.thank_you_message || '',
              createdAt: s.created_at || s.createdAt || new Date().toISOString()
            };
            mapRec.set(item.id, item);
          });
          setReceivedSlips(Array.from(mapRec.values()));
        }

        if (isMasterAdmin) {
          const { data: allData, error: allError } = await supabase
            .from('thank_you_slips')
            .select('*')
            .order('created_at', { ascending: false });

          if (allError) {
            console.error("Error fetching all thank you slips:", allError);
          } else if (allData) {
            const mappedAll: ThankYouSlip[] = allData.map((s: any) => ({
              id: String(s.id),
              referralId: String(s.referral_id || s.referralId || ''),
              fromUserId: String(s.from_user_id || s.fromUserId || s.submitted_by || s.receiver_id || ''),
              toUserId: String(s.to_user_id || s.toUserId || s.sender_id || ''),
              customerName: s.customer_name || s.customerName || s.contact_name || '',
              businessValue: Number(s.business_value || s.businessValue || 0),
              notes: s.notes || s.thank_you_message || '',
              createdAt: s.created_at || s.createdAt || new Date().toISOString()
            }));
            setAllSlips(mappedAll);
          }
        }
      } catch (err: any) {
        console.error("Error in fetchSupabaseSlips:", err);
        setError("Failed to fetch thank you slips. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    // Fetch converted referrals where current user is the RECEIVER (Member B) and no Thank You Slip exists yet
    const fetchConvertedReferrals = async () => {
      if (userCandidateIds.length === 0) return;

      const currentUid = String(profile?.id || profile?.uid);

      // Fetch existing slips to filter out referrals that already have a slip
      const { data: existingSlips } = await supabase
        .from('thank_you_slips')
        .select('referral_id, referralId');

      const existingSlipReferralIds = new Set<string>();
      if (existingSlips) {
        existingSlips.forEach((s: any) => {
          const refId = String(s.referral_id || s.referralId || '');
          if (refId) existingSlipReferralIds.add(refId);
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
        setAllSlips(data);
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
        const sbNames: Record<string, string> = {};
        sbUsers.forEach(u => {
          const name = u.name || u.displayName || 'Member Not Found';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

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
        .eq('referral_id', String(selectedReferral.id));

      if (checkError) {
        console.warn("Check existing slips notice:", checkError);
      }

      if (existingSlips && existingSlips.length > 0) {
        throw new Error("This referral already has a Thank You Slip.");
      }

      const targetSenderId = String(originalSenderId);

      // Clean payload for thank_you_slips table (REQUIREMENT 1)
      const cleanDbPayload = {
        referral_id: String(selectedReferral.id),
        sender_id: targetSenderId,
        receiver_id: currentUserId,
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

      // Perform direct Supabase insert
      const { data: insertedData, error: insertError } = await supabase
        .from('thank_you_slips')
        .insert([cleanDbPayload])
        .select()
        .single();

      // REQUIREMENT 8: Display exact Supabase error if insert fails
      if (insertError) {
        if (insertError.code === '23505' || insertError.message?.toLowerCase().includes('unique') || insertError.message?.toLowerCase().includes('duplicate')) {
          throw new Error("This referral already has a Thank You Slip.");
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

      try {
        await databaseService.create('thank_you_slips', cleanDbPayload);
      } catch (dbErr) {
        console.warn("databaseService create slip notice:", dbErr);
      }

      // REQUIREMENT 7: Real-time update local state
      setSlips(prev => [slipObject, ...prev.filter(s => s.id !== slipObject.id)]);

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
        if (receiver) {
          setShowTestimonialPrompt(true);
        }
      }, 2000);
    } catch (err: any) {
      console.error("Error submitting thank you slip:", err);
      setError(err?.message || "Failed to submit thank you slip.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBusinessSent = slips.reduce((acc, slip) => acc + slip.businessValue, 0);
  const totalBusinessReceived = receivedSlips.reduce((acc, slip) => acc + slip.businessValue, 0);
  
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

  const totalBusinessGenerated = filteredSlips.reduce((acc, slip) => acc + slip.businessValue, 0);

  const totalBusinessReceivedFiltered = filteredSlips.reduce((acc, slip) => acc + slip.businessValue, 0);

  const totalNetworkBusiness = filteredSlips.reduce((acc, slip) => acc + slip.businessValue, 0);

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

  if (isMasterAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 py-6 md:py-8 space-y-8">
        {/* Header Section */}
        <header className="relative p-6 md:p-8 bg-[#111827] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full -ml-24 -mb-24 blur-2xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-[16px] flex items-center justify-center text-white shadow-inner">
                <Award size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase">
                  Thank You Slips
                </h1>
                <p className="text-[10px] text-neutral-300 font-bold uppercase tracking-[0.15em] mt-0.5">
                  Business Value generated through the network
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                onClick={downloadReport}
                className="group relative flex items-center justify-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-[16px] text-xs font-bold uppercase tracking-[0.2em] transition-all hover:bg-white/20 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
              >
                <Download size={18} />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </header>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111827] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-secondary rounded-full" />
            <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em] font-display">Filter Reports</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-5 py-3 rounded-[16px] bg-[#151C2E] border border-white/5 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-5 py-3 rounded-[16px] bg-[#151C2E] border border-white/5 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ startDate: '', endDate: '', category: '', fromUserId: '', toUserId: '' })}
                className="px-6 py-3 text-xs font-bold text-red-400 uppercase tracking-widest hover:bg-red-500/10 rounded-[12px] transition-all"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="group relative bg-[#0F172A] border border-white/5 p-6 rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/20 transition-colors duration-500" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-[16px] flex items-center justify-center text-emerald-400 mb-6 shadow-inner">
                <TrendingUp size={24} />
              </div>
              <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-[0.2em] mb-2">Total Generated</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="text-emerald-500">₹</span>
                {totalBusinessGenerated.toLocaleString()}
              </h2>
              <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest mt-4">Network-wide business passed</p>
            </div>
          </div>

          <div className="group relative bg-[#111827] border border-white/5 p-6 rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-primary/10 rounded-[16px] flex items-center justify-center text-primary mb-6 shadow-inner">
                <Award size={24} />
              </div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-2">Total Received</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="text-primary">₹</span>
                {totalBusinessReceivedFiltered.toLocaleString()}
              </h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-4">Network-wide business received</p>
            </div>
          </div>

          <div className="group relative bg-[#111827] border border-white/5 p-6 rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-secondary/10 transition-colors duration-500" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-secondary/10 rounded-[16px] flex items-center justify-center text-secondary mb-6 shadow-inner">
                <TrendingUp size={24} />
              </div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-2">Network Volume</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="text-secondary">₹</span>
                {totalNetworkBusiness.toLocaleString()}
              </h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-4">Total transaction volume</p>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-[#111827] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#151C2E] border-b border-white/5">
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Slip ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Generated By</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Received From</th>
                  {isMasterAdmin && <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Chapter</th>}
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center bg-[#111827]">
                      <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Loading Data...</p>
                    </td>
                  </tr>
                ) : filteredSlips.length > 0 ? (
                  filteredSlips.map((slip) => {
                    const fromUser = allUsers.find(u => u.uid === slip.fromUserId);
                    const toUser = allUsers.find(u => u.uid === slip.toUserId);
                    const chapterAdmin = allUsers.find(u => u.uid === (toUser?.adminId || fromUser?.adminId));

                    return (
                      <tr key={slip.id} className="hover:bg-[#1C2538] transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                            #{slip.id.slice(-6)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">{memberNames[slip.fromUserId] || 'Unknown'}</span>
                            <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-tight">{fromUser?.category || 'Member'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">{memberNames[slip.toUserId] || 'Unknown'}</span>
                            <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-tight">{toUser?.category || 'Member'}</span>
                          </div>
                        </td>
                        {isMasterAdmin && (
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-tight">
                              {chapterAdmin?.businessName || 'Independent'}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-neutral-300">
                            {format(new Date(slip.createdAt), 'dd MMM yyyy')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-emerald-400">
                            ₹{slip.businessValue.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] font-medium text-neutral-400 line-clamp-1 max-w-[200px]" title={slip.notes}>
                            {slip.notes || '-'}
                          </p>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center bg-[#111827]">
                      <Award size={40} className="mx-auto text-neutral-600 mb-3" />
                      <h3 className="text-sm font-bold text-white">No slips found</h3>
                      <p className="text-xs text-neutral-400 mt-1">The thank you slip history is currently empty.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 py-6 md:py-8 space-y-8">
      {/* Header Section */}
      <header className="relative p-6 md:p-8 bg-[#111827] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full -ml-24 -mb-24 blur-2xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-[16px] flex items-center justify-center text-white shadow-inner">
              <Award size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase">
                My Thank You Slips
              </h1>
              <p className="text-[10px] text-neutral-300 font-bold uppercase tracking-[0.15em] mt-0.5">
                Value generated and received in your network
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button
              onClick={downloadReport}
              className="group relative flex items-center justify-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-[16px] text-xs font-bold uppercase tracking-[0.2em] transition-all hover:bg-white/20 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
            >
              <Download size={18} />
              <span>Export Report</span>
            </button>
            {!isMasterAdmin && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="group relative flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white rounded-[16px] text-xs font-bold uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.03)] shadow-primary/25 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Plus size={18} />
                <span>Submit Slip</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Filters for Admin */}
      {isMasterAdmin && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111827] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-secondary rounded-full" />
            <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em] font-display">Filter Reports</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-5 py-3 rounded-[16px] bg-[#151C2E] border border-white/5 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-5 py-3 rounded-[16px] bg-[#151C2E] border border-white/5 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ startDate: '', endDate: '', category: '', fromUserId: '', toUserId: '' })}
                className="px-6 py-3 text-xs font-bold text-red-400 uppercase tracking-widest hover:bg-red-500/10 rounded-[12px] transition-all"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {!isMasterAdmin ? (
          <>
            <div className="group relative bg-[#111827] border border-white/5 p-6 rounded-[16px] shadow-sm overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-xl group-hover:bg-emerald-500/20 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-[12px] flex items-center justify-center text-emerald-400 mb-5 shadow-sm">
                  <TrendingUp size={24} />
                </div>
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Business Generated (Sent)</p>
                <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span className="text-emerald-500">₹</span>
                  {totalBusinessSent.toLocaleString()}
                </h2>
                <div className="flex items-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-[11px] font-medium text-neutral-400">{slips.length} slips submitted</p>
                </div>
              </div>
            </div>

            <div className="group relative bg-[#111827] border border-white/5 p-6 rounded-[16px] shadow-sm hover:shadow-[0_1px_3px_rgba(2,2,2,0.02)] transition-all overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-xl group-hover:bg-primary/10 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-primary/10 rounded-[12px] flex items-center justify-center text-primary mb-5 shadow-sm">
                  <Award size={24} />
                </div>
                <p className="text-[11px] font-semibold text-neutral-400 tracking-wider mb-1 uppercase">Business Received</p>
                <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span className="text-primary">₹</span>
                  {totalBusinessReceived.toLocaleString()}
                </h2>
                <div className="flex items-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <p className="text-[11px] font-medium text-neutral-400">{receivedSlips.length} slips received</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="group relative bg-[#111827] border border-white/5 p-6 rounded-[16px] shadow-sm overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-xl group-hover:bg-emerald-500/20 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-[12px] flex items-center justify-center text-emerald-400 mb-5 shadow-sm">
                  <TrendingUp size={24} />
                </div>
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Total Generated</p>
                <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span className="text-emerald-500">₹</span>
                  {totalBusinessGenerated.toLocaleString()}
                </h2>
                <p className="text-[11px] font-medium text-neutral-400 mt-4">Network-wide business passed</p>
              </div>
            </div>

            <div className="group relative bg-[#111827] border border-white/5 p-6 rounded-[16px] shadow-sm hover:shadow-[0_1px_3px_rgba(2,2,2,0.02)] transition-all overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-xl group-hover:bg-primary/10 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-primary/10 rounded-[12px] flex items-center justify-center text-primary mb-5 shadow-sm">
                  <Award size={24} />
                </div>
                <p className="text-[11px] font-semibold text-neutral-400 tracking-wider mb-1 uppercase">Total Received</p>
                <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span className="text-primary">₹</span>
                  {totalBusinessReceivedFiltered.toLocaleString()}
                </h2>
                <p className="text-[11px] font-medium text-neutral-400 mt-4">Network-wide business received</p>
              </div>
            </div>

            <div className="group relative bg-[#111827] border border-white/5 p-6 rounded-[16px] shadow-sm hover:shadow-[0_1px_3px_rgba(2,2,2,0.02)] transition-all overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-xl group-hover:bg-amber-500/10 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-[#151C2E] rounded-[12px] flex items-center justify-center text-amber-500 mb-5 shadow-sm">
                  <TrendingUp size={24} />
                </div>
                <p className="text-[11px] font-semibold text-neutral-400 tracking-wider mb-1 uppercase">Network Volume</p>
                <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span className="text-amber-500">₹</span>
                  {totalNetworkBusiness.toLocaleString()}
                </h2>
                <p className="text-[11px] font-medium text-neutral-400 mt-4">Total transaction volume</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tabs / Section Header */}
      {!isMasterAdmin ? (
        <div className="flex p-1.5 bg-[#151C2E] rounded-[12px] w-full md:w-fit border border-white/5">
          <button
            onClick={() => setActiveTab('sent')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-semibold transition-all duration-300",
              activeTab === 'sent' ? "bg-primary text-white shadow-sm" : "text-neutral-400 hover:text-white"
            )}
          >
            Sent
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-semibold transition-all duration-300",
              activeTab === 'received' ? "bg-primary text-white shadow-sm" : "text-neutral-400 hover:text-white"
            )}
          >
            Received
          </button>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[#111827] rounded-[16px] border border-white/5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Business Activity Reports
              </h2>
              <p className="text-neutral-400 text-xs font-medium tracking-wide">Viewing all business activity across the network.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-6 py-2 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-primary/20">
              {isMasterAdmin ? 'Master Admin' : 'Chapter Admin'}
            </div>
          </div>
        </div>
      )}

      {/* Slips List */}
      <div className="space-y-6">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Loading Slips...</p>
          </div>
        ) : (activeTab === 'sent' ? slips : activeTab === 'received' ? receivedSlips : filteredSlips).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  className="group bg-[#111827] p-6 rounded-[16px] border border-white/5 shadow-sm hover:border-white/10 transition-all duration-300 space-y-4"
                >
                  {/* Top Bar: Slip Number, Status Badge & Date/Time */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shadow-sm",
                        activeTab === 'sent' ? "bg-emerald-500/10 text-emerald-400" : 
                        activeTab === 'received' ? "bg-primary/10 text-primary" : "bg-[#151C2E] text-neutral-400"
                      )}>
                        {activeTab === 'sent' ? <TrendingUp size={18} /> : <Award size={18} />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white tracking-wide block">
                          #TYS-{slip.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                          Completed
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-medium text-neutral-400 block">
                        {format(new Date(slip.createdAt), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                  </div>

                  {/* Grid Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-2">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Referral ID</p>
                      <p className="text-xs font-bold text-primary truncate">
                        #REF-{(slip.referralId || 'N/A').slice(-6).toUpperCase()}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                        {activeTab === 'sent' ? 'Referral Receiver' : activeTab === 'received' ? 'Referral Sender' : 'Members'}
                      </p>
                      {activeTab === 'sent' ? (
                        <Link 
                          to={`/profile?id=${slip.toUserId}`}
                          className="text-xs font-bold text-white hover:text-primary transition-colors truncate block"
                        >
                          {memberNames[slip.toUserId] || 'Member'}
                        </Link>
                      ) : activeTab === 'received' ? (
                        <Link 
                          to={`/profile?id=${slip.fromUserId}`}
                          className="text-xs font-bold text-white hover:text-primary transition-colors truncate block"
                        >
                          {memberNames[slip.fromUserId] || 'Member'}
                        </Link>
                      ) : (
                        <div className="text-xs font-medium text-white">
                          <div>From: {memberNames[slip.fromUserId] || '...'}</div>
                          <div>To: {memberNames[slip.toUserId] || '...'}</div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Category</p>
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold text-neutral-300 bg-white/5 rounded-md border border-white/10 truncate max-w-full">
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
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Business Amount</p>
                      <p className="text-sm font-bold text-emerald-400 tracking-tight">
                        ₹{slip.businessValue.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  {/* Notes / Footer */}
                  {slip.notes && (
                    <div className="pt-3 border-t border-white/5">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-0.5">Notes</p>
                      <p className="text-xs text-neutral-300 italic line-clamp-2 leading-relaxed">"{slip.notes}"</p>
                    </div>
                  )}
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

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full py-4 bg-primary text-white rounded-[12px] font-bold hover:bg-primary/90 transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-widest",
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

      {/* Testimonial Prompt Modal */}
      <Modal isOpen={showTestimonialPrompt} onClose={() => setShowTestimonialPrompt(false)} title="Testimonial">
        <div className="p-6 text-center space-y-6">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Award size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Would you like to write a testimonial?</h3>
            <p className="text-[#9CA3AF] text-sm">
              Sharing a testimonial is a great way to show your appreciation and help others build trust in their services.
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowTestimonialPrompt(false)}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-[#1F2937] hover:bg-[#374151] transition-colors"
            >
              Maybe Later
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTestimonialPrompt(false);
                // We need another state to open the WriteTestimonialModal, let's just use `setIsWritingTestimonial(true)`
                // which I'll add or use.
                // Wait, I didn't add setIsWritingTestimonial, so let's just use a trick or add it.
                // Better to dispatch a custom event or something? No, just add it.
                document.getElementById('write-testimonial-btn')?.click();
              }}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-colors"
            >
              Write Testimonial
            </button>
            <button id="write-testimonial-btn" className="hidden" onClick={() => setShowWriteModal(true)} />
          </div>
        </div>
      </Modal>

      {testimonialReceiver && (
        <WriteTestimonialModal
          isOpen={showWriteModal}
          onClose={() => setShowWriteModal(false)}
          author={profile}
          receiver={testimonialReceiver}
        />
      )}
    </div>
  );
}
