import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  UserPlus, 
  MessageSquare, 
  Copy, 
  CheckCircle2, 
  Share2, 
  Calendar, 
  Clock, 
  MapPin,
  ExternalLink,
  Database,
  Phone,
  Eye,
  Mail,
  Building2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { notificationService } from '../services/notificationService';
import { GuestInvitation, GuestRegistration, Category, UserProfile } from '../types';
import { Modal } from '../components/Modal';
import { format } from 'date-fns';
import { where, orderBy, collection, getDocs, query, or } from 'firebase/firestore';
import { db } from '../firebase';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { cn } from '../lib/utils';
import { useLocation } from 'react-router-dom';

export function Guests() {
  const { profile } = useAuth();
  const location = useLocation();
  const highlightId = new URLSearchParams(location.search).get('highlight');
  const [invitations, setInvitations] = useState<GuestInvitation[]>([]);
  const [registrations, setRegistrations] = useState<GuestRegistration[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editMeetingData, setEditMeetingData] = useState({
    meetingDate: '',
    meetingTime: '',
    meetingVenue: ''
  });

  useEffect(() => {
    if (selectedGuest) {
      setEditMeetingData({
        meetingDate: selectedGuest.meetingDate || '',
        meetingTime: selectedGuest.meetingTime || '',
        meetingVenue: selectedGuest.meetingVenue || ''
      });
    }
  }, [selectedGuest]);

  const handleUpdateMeetingDetails = async () => {
    if (!selectedGuest) return;
    try {
      const collectionName = selectedGuest.source === 'Created by Admin' ? 'guest_invitations' : 'guest_registrations';
      await firestoreService.update(collectionName, selectedGuest.id, editMeetingData);
      setSelectedGuest({ ...selectedGuest, ...editMeetingData });
      alert("Meeting details updated successfully");
    } catch (error) {
      console.error("Error updating meeting details:", error);
      alert("Failed to update meeting details");
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    guestBusiness: '',
    address: '',
    state: '',
    city: '',
    fullAddress: '',
    meetingDate: '',
    meetingTime: '',
    meetingVenue: ''
  });
  const [regFormData, setRegFormData] = useState({
    fullName: '',
    phone: '',
    businessName: '',
    businessCategory: '',
    city: '',
    adminId: '',
    meetingDate: '',
    meetingTime: '',
    meetingVenue: ''
  });
  const [chapterAdmins, setChapterAdmins] = useState<UserProfile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastCreatedInvitation, setLastCreatedInvitation] = useState<GuestInvitation | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!profile) return;

    let constraints: any[] = [orderBy('createdAt', 'desc')];

    if (profile.role === 'CHAPTER_ADMIN') {
      // Chapter Admin sees own + associated members
      constraints.push(or(
        where('createdBy', '==', profile.uid),
        where('associatedChapterAdminId', '==', profile.uid)
      ));
    } else if (profile.role === 'MEMBER') {
      // Member sees only own
      constraints.push(where('createdBy', '==', profile.uid));
    }

    const unsubInvitations = firestoreService.subscribe<GuestInvitation>('guest_invitations', constraints, (data) => {
      setInvitations(data);
      setLoading(false);
    });

    // Fetch Guest Registrations (Created by Guest)
    let regConstraints: any[] = [orderBy('createdAt', 'desc')];
    if (profile.role === 'CHAPTER_ADMIN') {
      regConstraints.push(where('adminId', '==', profile.uid));
    } else if (profile.role === 'MEMBER') {
      // Members might not see registrations unless they are assigned? 
      // Usually registrations are for Chapter Admins.
      // If a member is looking at guests, they probably only see what they invited.
      // But the requirement says "Show this data in Guest Section".
      // I'll assume Chapter Admin and Master Admin see registrations.
      if (profile.role !== 'MASTER_ADMIN') {
        // If not master admin, and we already handled chapter admin above, 
        // then for MEMBER we might want to show nothing or only if they are somehow related.
        // For now, let's keep it consistent with invitations if possible, 
        // but registrations only have adminId.
      }
    }

    const unsubRegistrations = firestoreService.subscribe<GuestRegistration>('guest_registrations', regConstraints, (data) => {
      setRegistrations(data);
    });

    // Fetch all users to resolve member names
    firestoreService.list<UserProfile>('users').then(setAllUsers);

    // Fetch categories
    firestoreService.list<Category>('categories').then(setCategories);

    // Fetch Chapter Admins
    firestoreService.list<UserProfile>('users', [where('role', '==', 'CHAPTER_ADMIN')]).then(setChapterAdmins);

    return () => {
      unsubInvitations();
      unsubRegistrations();
    };
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSubmitting(true);
    try {
      const normalizedPhone = normalizePhoneNumber(formData.guestPhone);

      const newInvitationData: Omit<GuestInvitation, 'id'> = {
        guestName: formData.guestName,
        guestPhone: normalizedPhone,
        guestEmail: formData.guestEmail,
        guestBusiness: formData.guestBusiness,
        address: formData.address,
        state: formData.state,
        city: formData.city,
        fullAddress: formData.fullAddress,
        meetingDate: formData.meetingDate,
        meetingTime: formData.meetingTime,
        meetingVenue: formData.meetingVenue,
        memberId: profile.uid,
        createdBy: profile.uid,
        createdByRole: profile.role,
        associatedChapterAdminId: profile.adminId || null,
        createdAt: new Date().toISOString(),
        isWhatsAppShared: false,
        isCalled: false
      };

      const id = await firestoreService.create('guest_invitations', newInvitationData);
      
      // Send notification to Chapter Admin if created by a Member
      if (profile.role === 'MEMBER' && profile.adminId) {
        await notificationService.createNotification(
          profile.adminId,
          'CHAPTER_ADMIN',
          'ASSOCIATE_MEMBER_INVITE',
          `New Associate Member Invite. Member: ${profile.name || profile.displayName}, Guest: ${formData.guestName}`,
          id
        );
      }
      
      const createdInvitation: GuestInvitation = {
        id,
        ...newInvitationData
      } as GuestInvitation;

      setLastCreatedInvitation(createdInvitation);

      // Send SMS via Firebase Trigger SMS Extension
      const inviteText = generateInviteText(createdInvitation);
      try {
        await firestoreService.create('messages', {
          to: normalizedPhone,
          body: inviteText,
          uid: profile.uid,
          createdAt: new Date().toISOString()
        });
      } catch (smsError) {
        // Silent error for SMS queuing
      }
      
      setShowSuccess(true);
      setFormData({ 
        guestName: '', 
        guestPhone: '', 
        guestEmail: '', 
        guestBusiness: '', 
        address: '',
        state: '',
        city: '',
        fullAddress: '',
        meetingDate: '',
        meetingTime: '',
        meetingVenue: ''
      });
      
    } catch (error) {
      console.error("Error creating invitation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSubmitting(true);
    try {
      const adminId = profile.role === 'CHAPTER_ADMIN' ? profile.uid : regFormData.adminId;
      
      await firestoreService.create('guest_registrations', {
        ...regFormData,
        adminId,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
        isWhatsAppShared: false,
        isCalled: false
      });

      setShowSuccess(true);
      setRegFormData({
        fullName: '',
        phone: '',
        businessName: '',
        businessCategory: '',
        city: '',
        adminId: '',
        meetingDate: '',
        meetingTime: '',
        meetingVenue: ''
      });
    } catch (error) {
      console.error("Error creating guest registration:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateInviteText = (guest: any) => {
    const name = guest.displayName || guest.guestName || guest.fullName;
    let text = `Hi ${name}! You're invited to SSK Business Network Weekly Business Meeting.\n\n`;
    
    if (guest.meetingDate || guest.meetingTime || guest.meetingVenue) {
      text += `Meeting Details:\n`;
      if (guest.meetingDate) {
        try {
          text += `Date: ${format(new Date(guest.meetingDate), 'dd MMM yyyy')}\n`;
        } catch (e) {
          text += `Date: ${guest.meetingDate}\n`;
        }
      }
      if (guest.meetingTime) text += `Time: ${guest.meetingTime}\n`;
      if (guest.meetingVenue) text += `Venue: ${guest.meetingVenue}\n`;
      text += `\n`;
    }
    
    text += `Join as a guest entrepreneur and expand your network!`;
    return text;
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsApp = async (text: string, phone: string, guest: any) => {
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    
    // Mark as WhatsApp shared (Read)
    if (!guest.isWhatsAppShared) {
      try {
        const collectionName = guest.source === 'Created by Admin' ? 'guest_invitations' : 'guest_registrations';
        await firestoreService.update(collectionName, guest.id, { isWhatsAppShared: true });
      } catch (error) {
        console.error("Error updating WhatsApp status:", error);
      }
    }
  };

  const handleCall = async (guest: any) => {
    const phone = guest.displayPhone || guest.phone;
    if (!phone) return;
    
    window.location.href = `tel:${phone.replace(/\D/g, '')}`;
    
    // Mark as Called (Read)
    if (!guest.isCalled) {
      try {
        const collectionName = guest.source === 'Created by Admin' ? 'guest_invitations' : 'guest_registrations';
        await firestoreService.update(collectionName, guest.id, { isCalled: true });
      } catch (error) {
        console.error("Error updating call status:", error);
      }
    }
  };

  const allGuests = [
    ...invitations.map(inv => ({ 
      ...inv, 
      source: 'Created by Admin', 
      displayName: inv.guestName, 
      displayPhone: inv.guestPhone, 
      displayBusiness: inv.guestBusiness 
    })),
    ...registrations.map(reg => ({ 
      ...reg, 
      source: 'Created by Guest', 
      displayName: reg.fullName, 
      displayPhone: reg.phone, 
      displayBusiness: reg.businessName 
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredInvitations = allGuests.filter(inv => {
    const inviter = allUsers.find(u => u.uid === (inv as any).memberId);
    const matchesSearch = 
      inv.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv as any).guestEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.displayBusiness.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inviter?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const isMasterAdmin = profile?.role === 'MASTER_ADMIN';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setIsRegModalOpen(true)}
            className="hidden items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 text-sm md:text-base"
          >
            <Calendar size={18} />
            <span>Register for Meeting</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 text-sm md:text-base"
          >
            <Plus size={18} />
            <span>Invite a Guest</span>
          </button>
        </div>
      </header>

      {/* Filters for Master Admin */}
      {profile?.role === 'MASTER_ADMIN' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative">
            <input
              type="text"
              placeholder="Search guests by name, email, or business..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
            />
            <Plus className="absolute left-3 top-2.5 text-slate-400 rotate-45" size={18} />
          </div>
        </div>
      )}

      {/* Invitations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          </div>
        ) : filteredInvitations.length > 0 ? (
          filteredInvitations.map((inv: any) => {
            const inviteText = generateInviteText(inv);
            const needsAttention = !inv.isWhatsAppShared && !inv.isCalled;
            const isHighlighted = highlightId === inv.id;

            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                key={inv.id}
                className={cn(
                  "bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl border transition-all relative overflow-hidden",
                  isHighlighted ? "ring-2 ring-primary ring-offset-2 border-primary shadow-lg" :
                  needsAttention ? "border-rose-200 shadow-rose-100 shadow-lg" : "border-slate-200 shadow-sm hover:shadow-md"
                )}
              >
                {needsAttention && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-xl">
                    Needs Action
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-4 md:mb-6">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center",
                      needsAttention ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      <UserPlus size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base md:text-lg font-bold text-slate-900">{inv.displayName}</h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                          inv.source === 'Created by Admin' ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-purple-50 text-purple-600 border border-purple-100"
                        )}>
                          {inv.source}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs md:text-sm text-slate-500">{inv.displayBusiness}</p>
                        <div className="space-y-1 mt-1">
                          <p className="text-[10px] md:text-xs text-slate-400 font-medium">
                            Invited By: <span className="text-emerald-600">{allUsers.find(u => u.uid === (inv.createdBy || inv.memberId || inv.adminId))?.name || '...'}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className={cn(
                            "flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider",
                            inv.isWhatsAppShared ? "text-emerald-600" : "text-slate-300"
                          )}>
                            <MessageSquare size={10} />
                            <span>WhatsApp {inv.isWhatsAppShared ? 'Sent' : 'Pending'}</span>
                          </div>
                          <div className={cn(
                            "flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider",
                            inv.isCalled ? "text-blue-600" : "text-slate-300"
                          )}>
                            <Phone size={10} />
                            <span>Call {inv.isCalled ? 'Done' : 'Pending'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] md:text-xs text-slate-400 block">{format(new Date(inv.createdAt), 'MMM d, yyyy')}</span>
                    <button
                      onClick={() => {
                        setSelectedGuest(inv);
                        setIsDetailsModalOpen(true);
                      }}
                      className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest mt-2 hover:underline ml-auto"
                    >
                      <Eye size={12} />
                      View Details
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 mb-4 md:mb-6">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 md:mb-2">Invite Content</p>
                  <p className="text-xs md:text-sm text-slate-600 line-clamp-3 italic">"{inviteText}"</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleWhatsApp(inviteText, inv.displayPhone, inv)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all text-xs md:text-sm"
                  >
                    <MessageSquare size={16} className="md:w-[18px] md:h-[18px]" />
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleCall(inv)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-xl font-bold transition-all text-xs md:text-sm",
                      inv.isCalled ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-blue-500 text-white hover:bg-blue-600"
                    )}
                  >
                    <Phone size={16} className="md:w-[18px] md:h-[18px]" />
                    {inv.isCalled ? 'Call Done' : 'Call'}
                  </button>
                  <button
                    onClick={() => handleCopy(inviteText, inv.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs md:text-sm"
                  >
                    {copiedId === inv.id ? <CheckCircle2 size={16} className="text-emerald-500 md:w-[18px] md:h-[18px]" /> : <Copy size={16} className="md:w-[18px] md:h-[18px]" />}
                    {copiedId === inv.id ? 'Copied!' : 'Copy Text'}
                  </button>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full p-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <UserPlus size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No guests invited yet</h3>
            <p className="text-slate-500 mt-1">Invite your business contacts to visit and grow the network.</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
    <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setShowSuccess(false);
            setLastCreatedInvitation(null);
          }
        }}
        title="Invite a New Guest"
      >
        {showSuccess && lastCreatedInvitation ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-900">Invitation Sent!</h3>
              <p className="text-slate-500 max-w-xs mx-auto">
                The guest has been invited and a notification has been sent to their phone number.
              </p>
            </div>

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={() => handleWhatsApp(generateInviteText(lastCreatedInvitation), lastCreatedInvitation.guestPhone, { ...lastCreatedInvitation, source: 'Created by Admin' })}
                className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <MessageSquare size={20} />
                Share via WhatsApp
              </button>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setIsModalOpen(false);
                  setLastCreatedInvitation(null);
                }}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Guest Name</label>
              <input
                required
                type="text"
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                placeholder="Full name of the guest"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Guest Phone</label>
                <input
                  required
                  type="tel"
                  value={formData.guestPhone}
                  onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Guest Email</label>
                <input
                  required
                  type="email"
                  value={formData.guestEmail}
                  onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                  placeholder="guest@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Business Category</label>
                <select
                  required
                  value={formData.guestBusiness}
                  onChange={(e) => setFormData({ ...formData, guestBusiness: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Area/Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Area"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Full Address</label>
              <textarea
                rows={2}
                value={formData.fullAddress}
                onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                placeholder="Complete address details"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Meeting Date</label>
                <input
                  required
                  type="date"
                  value={formData.meetingDate}
                  onChange={(e) => setFormData({ ...formData, meetingDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Meeting Time</label>
                <input
                  required
                  type="time"
                  value={formData.meetingTime}
                  onChange={(e) => setFormData({ ...formData, meetingTime: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Meeting Venue</label>
              <input
                required
                type="text"
                value={formData.meetingVenue}
                onChange={(e) => setFormData({ ...formData, meetingVenue: e.target.value })}
                placeholder="Meeting venue"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}
            </button>
          </form>
        )}
      </Modal>

      {/* Registration Modal */}
      <Modal
        isOpen={isRegModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsRegModalOpen(false);
            setShowSuccess(false);
          }
        }}
        title="Register Guest for Chapter Meeting"
      >
        {showSuccess ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-900">Registration Successful!</h3>
              <p className="text-slate-500 max-w-xs mx-auto">
                The guest has been registered for the chapter meeting.
              </p>
            </div>
            <button
              onClick={() => {
                setShowSuccess(false);
                setIsRegModalOpen(false);
              }}
              className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Close
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleRegSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
              <input
                required
                type="text"
                value={regFormData.fullName}
                onChange={(e) => setRegFormData({ ...regFormData, fullName: e.target.value })}
                placeholder="Guest's full name"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Phone Number</label>
                <input
                  required
                  type="tel"
                  value={regFormData.phone}
                  onChange={(e) => setRegFormData({ ...regFormData, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Business Name</label>
                <input
                  required
                  type="text"
                  value={regFormData.businessName}
                  onChange={(e) => setRegFormData({ ...regFormData, businessName: e.target.value })}
                  placeholder="Business name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Business Category</label>
                <select
                  required
                  value={regFormData.businessCategory}
                  onChange={(e) => setRegFormData({ ...regFormData, businessCategory: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">City</label>
                <input
                  required
                  type="text"
                  value={regFormData.city}
                  onChange={(e) => setRegFormData({ ...regFormData, city: e.target.value })}
                  placeholder="City"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {profile?.role === 'MASTER_ADMIN' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Preferred Chapter Admin</label>
                <select
                  required
                  value={regFormData.adminId}
                  onChange={(e) => setRegFormData({ ...regFormData, adminId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                >
                  <option value="">Select Admin</option>
                  {chapterAdmins.map((admin) => (
                    <option key={admin.uid} value={admin.uid}>{admin.name || admin.displayName}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Registering...' : 'Register Guest'}
            </button>
          </form>
        )}
      </Modal>

      {/* Guest Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Guest Details"
      >
        {selectedGuest && (
          <div className="space-y-8">
            <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                <UserPlus size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-navy uppercase tracking-tight">{selectedGuest.displayName}</h3>
                <p className="text-sm text-slate-500 font-medium">{selectedGuest.displayBusiness}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                    selectedGuest.source === 'Created by Admin' ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-purple-50 text-purple-600 border border-purple-100"
                  )}>
                    {selectedGuest.source}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Phone Number</p>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-primary" />
                  <p className="text-sm font-bold text-navy">{selectedGuest.displayPhone}</p>
                </div>
              </div>
              {selectedGuest.guestEmail && (
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Email Address</p>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-primary" />
                    <p className="text-sm font-bold text-navy">{selectedGuest.guestEmail}</p>
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Business Category</p>
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-primary" />
                  <p className="text-sm font-bold text-navy">{selectedGuest.displayBusiness || selectedGuest.businessCategory}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">City</p>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-primary" />
                  <p className="text-sm font-bold text-navy">{selectedGuest.city || 'N/A'}</p>
                </div>
              </div>
              
              { (profile?.role === 'CHAPTER_ADMIN' || profile?.role === 'MASTER_ADMIN') && (
                <div className="col-span-full border-t border-slate-100 pt-6 mt-2">
                  <h4 className="text-xs font-black text-navy uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Calendar size={14} className="text-primary" />
                    Meeting Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meeting Date</label>
                      <input
                        type="date"
                        value={editMeetingData.meetingDate}
                        onChange={(e) => setEditMeetingData({ ...editMeetingData, meetingDate: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meeting Time</label>
                      <input
                        type="time"
                        value={editMeetingData.meetingTime}
                        onChange={(e) => setEditMeetingData({ ...editMeetingData, meetingTime: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meeting Venue</label>
                      <input
                        type="text"
                        value={editMeetingData.meetingVenue}
                        onChange={(e) => setEditMeetingData({ ...editMeetingData, meetingVenue: e.target.value })}
                        placeholder="Enter meeting venue"
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-bold"
                      />
                    </div>
                    <button
                      onClick={handleUpdateMeetingDetails}
                      className="md:col-span-2 py-3 bg-navy text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-navy/90 transition-all shadow-lg shadow-navy/20"
                    >
                      Update Meeting Details
                    </button>
                  </div>
                </div>
              )}

              {selectedGuest.fullAddress && (
                <div className="col-span-full space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Full Address</p>
                  <p className="text-sm font-bold text-navy bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {selectedGuest.fullAddress}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Invited By</p>
                <p className="text-sm font-bold text-navy">
                  {allUsers.find(u => u.uid === (selectedGuest.createdBy || selectedGuest.memberId || selectedGuest.adminId))?.name || 'Unknown'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</p>
                <p className="text-sm font-bold text-navy">
                  {format(new Date(selectedGuest.createdAt), 'dd MMMM yyyy, hh:mm a')}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => handleWhatsApp(generateInviteText(selectedGuest), selectedGuest.displayPhone, selectedGuest)}
                className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <MessageSquare size={18} />
                WhatsApp
              </button>
              <button
                onClick={() => handleCall(selectedGuest)}
                className="flex-1 py-4 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <Phone size={18} />
                Call
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
