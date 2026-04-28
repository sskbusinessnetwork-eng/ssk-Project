import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Search, 
  MapPin, 
  Building2, 
  ChevronRight, 
  Phone, 
  Mail, 
  Globe, 
  Share2,
  Filter,
  X,
  Briefcase,
  Map as MapIcon,
  Clock,
  CheckCircle2,
  Send,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Category, Referral } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { firestoreService } from '../services/firestoreService';
import { Modal } from '../components/Modal';
import { usePositions } from '../hooks/usePositions';

export function Connections() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { getPositionForUser } = usePositions();
  const [activeTab, setActiveTab] = useState<'chapter' | 'all'>('chapter');
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [referringId, setReferringId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Referral Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [referralForm, setReferralForm] = useState({
    customerName: '',
    mobileNumber: '',
    notes: '',
    requirement: ''
  });
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleRefer = (member: UserProfile) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const submitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedMember) return;
    
    try {
      setReferringId(selectedMember.uid);
      setErrorMessage(null);
      
      const newReferral: Omit<Referral, 'id'> = {
        fromUserId: profile.uid,
        toUserId: selectedMember.uid,
        contactName: referralForm.customerName,
        contactPhone: referralForm.mobileNumber,
        requirement: referralForm.requirement || 'General Referral',
        notes: referralForm.notes,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      await firestoreService.create('referrals', newReferral);
      
      setSuccessMessage(`Referral sent to ${selectedMember.name} successfully!`);
      setIsModalOpen(false);
      setReferralForm({
        customerName: '',
        mobileNumber: '',
        notes: '',
        requirement: ''
      });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error("Error creating referral:", error);
      setErrorMessage(error.message || "Failed to send referral. Please try again.");
    } finally {
      setReferringId(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      
      try {
        setLoading(true);
        
        // Check if user is active
        if (profile.membershipStatus !== 'ACTIVE' && profile.role !== 'MASTER_ADMIN') {
          setLoading(false);
          return;
        }

        // Fetch Categories
        const cats = await firestoreService.list<Category>('categories');
        setCategories(cats);

        // Fetch All Active Members (MEMBER and CHAPTER_ADMIN)
        const membersQuery = query(
          collection(db, 'users'),
          where('membershipStatus', '==', 'ACTIVE')
        );
        const membersSnap = await getDocs(membersQuery);
        const allActiveUsers = membersSnap.docs
          .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
          .filter(m => m.uid !== profile?.uid && (m.role === 'MEMBER' || m.role === 'CHAPTER_ADMIN'));
        
        // Fetch Admin Names for All Members
        const adminIds = Array.from(new Set(
          allActiveUsers
            .map(m => m.associatedChapterAdminId || m.adminId)
            .filter(Boolean) as string[]
        ));

        if (adminIds.length > 0) {
          const adminData: Record<string, string> = {};
          await Promise.all(adminIds.map(async (id) => {
            const adminDoc = await firestoreService.get<UserProfile>('users', id);
            if (adminDoc) {
              adminData[id] = adminDoc.name || adminDoc.displayName || 'Unknown Admin';
            }
          }));
          setAdminNames(adminData);
        }
        
        setMembers(allActiveUsers);
      } catch (error) {
        console.error("Error fetching connections:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  const filteredMembers = members.filter(member => {
    // 1. Tab Filtering - Master Admin sees all members in a single view
    if (profile?.role !== 'MASTER_ADMIN') {
      if (activeTab === 'chapter') {
        const myChapterId = profile?.role === 'CHAPTER_ADMIN' ? profile.uid : profile?.associatedChapterAdminId;
        
        if (!myChapterId) return false;

        // Show members of the same chapter:
        // 1. Members whose associatedChapterAdminId matches the chapter ID
        // 2. The Chapter Admin themselves (uid matches the chapter ID)
        const isSameChapter = member.associatedChapterAdminId === myChapterId || member.uid === myChapterId;
        if (!isSameChapter) return false;
      } else {
        // "All Members" Tab: Show ONLY members (exclude admins)
        if (member.role !== 'MEMBER') return false;
      }
    } else {
      // Master Admin: Show all members and chapter admins
    }

    const matchesSearch = 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.bio?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || member.category === selectedCategory;
    const matchesState = !selectedState || member.state?.toLowerCase().includes(selectedState.toLowerCase());
    const matchesCity = !selectedCity || member.city?.toLowerCase().includes(selectedCity.toLowerCase());
    const matchesArea = !selectedArea || member.area?.toLowerCase().includes(selectedArea.toLowerCase());

    return matchesSearch && matchesCategory && matchesState && matchesCity && matchesArea;
  });

  // Get unique values for filters
  const uniqueStates = Array.from(new Set(members.map(m => m.state).filter(Boolean)));
  const uniqueCities = Array.from(new Set(members.map(m => m.city).filter(Boolean)));
  const uniqueAreas = Array.from(new Set(members.map(m => m.area).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (profile?.membershipStatus !== 'ACTIVE' && profile?.role !== 'MASTER_ADMIN') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
          <Clock size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Account Pending Approval</h2>
        <p className="text-slate-500 mt-4 text-lg max-w-lg mx-auto leading-relaxed">
          Your account is currently being reviewed by our team. You will be able to access the member directory and discover connections once your membership is activated.
        </p>
        <Link 
          to="/network" 
          className="mt-8 inline-block px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all"
        >
          Return to Network
        </Link>
      </div>
    );
  }

  const getPositionText = (userId: string) => {
    const position = getPositionForUser(userId);
    if (!position) return null;
    return (
      <span className="text-[10px] font-bold text-primary uppercase tracking-tight bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
        {position}
      </span>
    );
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-24 px-1 sm:px-0">
      {/* Feedback Messages */}
      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 right-4 left-4 z-[100] bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
        >
          <CheckCircle2 size={24} />
          <span className="font-bold text-sm uppercase tracking-wider">{successMessage}</span>
        </motion.div>
      )}
      <div className="bg-white p-4 rounded-[14px] card-shadow border border-border space-y-4">
        {/* Tabs - Hidden for Master Admin to show unified list */}
        {profile?.role !== 'MASTER_ADMIN' && (
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button 
              onClick={() => setActiveTab('chapter')}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                activeTab === 'chapter' ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:bg-white/50"
              )}
            >
              Chapter Member
            </button>
            <button 
              onClick={() => setActiveTab('all')}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                activeTab === 'all' ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:bg-white/50"
              )}
            >
              All Members
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
            <input
              type="text"
              placeholder="Search Network..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all text-sm font-medium"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-2.5 rounded-xl transition-all active:scale-95 border",
              showFilters ? "bg-primary text-white border-primary" : "bg-white text-text-secondary border-border hover:bg-muted"
            )}
          >
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-white rounded-[14px] card-shadow border border-border space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-10 px-3 bg-muted border border-transparent rounded-lg focus:bg-white focus:border-primary outline-none transition-all text-xs font-bold text-text-primary appearance-none cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">State</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full h-10 px-3 bg-muted border border-transparent rounded-lg focus:bg-white focus:border-primary outline-none transition-all text-xs font-bold text-text-primary appearance-none cursor-pointer"
              >
                <option value="">All States</option>
                {uniqueStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">City</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full h-10 px-3 bg-muted border border-transparent rounded-lg focus:bg-white focus:border-primary outline-none transition-all text-xs font-bold text-text-primary appearance-none cursor-pointer"
              >
                <option value="">All Cities</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Area</label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full h-10 px-3 bg-muted border border-transparent rounded-lg focus:bg-white focus:border-primary outline-none transition-all text-xs font-bold text-text-primary appearance-none cursor-pointer"
              >
                <option value="">All Areas</option>
                {uniqueAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
              {filteredMembers.length} Members Found
            </p>
            <button 
              onClick={() => {
                setSelectedCategory('');
                setSelectedState('');
                setSelectedCity('');
                setSelectedArea('');
                setSearchTerm('');
              }}
              className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider transition-all"
            >
              Reset Filters
            </button>
          </div>
        </motion.div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-[14px] card-shadow border border-border overflow-hidden">
        {filteredMembers.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredMembers.map((member, i) => (
              <motion.div
                key={member.uid}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => navigate(`/profile?id=${member.uid}`)}
                className="p-4 flex items-center gap-4 hover:bg-muted transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                  <img
                    src={member.photoURL || `https://picsum.photos/seed/${member.uid}/100/100`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-text-primary truncate max-w-[150px] sm:max-w-none">
                      {member.name}
                    </h3>
                    {getPositionText(member.uid)}
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-medium text-text-secondary truncate">
                    {member.role === 'CHAPTER_ADMIN' 
                      ? 'Chapter Admin' 
                      : `${member.category || 'Member'} | Admin ${adminNames[member.associatedChapterAdminId || member.adminId || ''] || 'SSK'}`}
                  </p>
                </div>

                <ChevronRight size={18} className="text-text-secondary group-hover:text-primary transition-colors" />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-bold text-text-primary">No members found</h3>
            <p className="text-sm text-text-secondary mt-1">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      {/* Referral Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (referringId === null) {
            setIsModalOpen(false);
            setErrorMessage(null);
          }
        }}
        title={`Refer to ${selectedMember?.name}`}
      >
        <form onSubmit={submitReferral} className="space-y-8 p-2">
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2">
              <AlertCircle size={18} />
              {errorMessage}
            </div>
          )}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Customer Name</label>
            <input
              required
              type="text"
              value={referralForm.customerName}
              onChange={(e) => setReferralForm(prev => ({ ...prev, customerName: e.target.value }))}
              placeholder="Enter customer name"
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-bold text-navy placeholder:text-slate-300"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mobile Number</label>
            <input
              required
              type="tel"
              value={referralForm.mobileNumber}
              onChange={(e) => setReferralForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
              placeholder="Enter mobile number"
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-bold text-navy placeholder:text-slate-300"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Requirement</label>
            <input
              type="text"
              value={referralForm.requirement}
              onChange={(e) => setReferralForm(prev => ({ ...prev, requirement: e.target.value }))}
              placeholder="What is the requirement?"
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-bold text-navy placeholder:text-slate-300"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Notes</label>
            <textarea
              value={referralForm.notes}
              onChange={(e) => setReferralForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes..."
              rows={3}
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-bold text-navy placeholder:text-slate-300 resize-none"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={referringId !== null}
              className="w-full py-5 bg-gradient-to-br from-secondary to-emerald-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-xs hover:shadow-2xl hover:shadow-secondary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {referringId !== null ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  Submit Referral
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
