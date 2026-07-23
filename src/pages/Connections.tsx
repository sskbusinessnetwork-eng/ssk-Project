import { Avatar } from '../components/Avatar';
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
import {  collection, query, where, getDocs  } from '../lib/database';
import { db } from '../lib/database';
import { supabase } from '../lib/supabaseClient';
import { getCleanFullName } from '../utils/authUtils';
import { UserProfile, Category, Referral } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { databaseService } from '../services/databaseService';
import { Modal } from '../components/Modal';

export function Connections() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'chapter' | 'all'>('chapter');
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [chapterNames, setChapterNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [referringId, setReferringId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getDisplayPosition = (pos?: string, role?: string) => {
    if (role === 'MASTER_ADMIN') return 'Master Admin';
    if (role === 'CHAPTER_ADMIN' || pos === 'chapter_admin') return 'Chapter Admin';
    if (pos === 'president') return 'President';
    if (pos === 'vice_president') return 'Vice President';
    if (pos === 'treasurer') return 'Treasurer';
    return 'Associate Member';
  };

  const getPositionBadge = (member: UserProfile) => {
    const role = member.role;
    const pos = member.position?.toLowerCase();
    
    let label = 'Associate Member';
    let classes = 'text-slate-400 bg-slate-500/10 border-slate-500/20';

    if (role === 'MASTER_ADMIN') {
      label = 'Master Admin';
      classes = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    } else if (role === 'CHAPTER_ADMIN' || pos === 'chapter_admin') {
      label = 'Chapter Admin';
      classes = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    } else if (pos === 'president') {
      label = 'President';
      classes = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    } else if (pos === 'vice_president') {
      label = 'Vice President';
      classes = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    } else if (pos === 'treasurer') {
      label = 'Treasurer';
      classes = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    }

    return (
      <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0", classes)}>
        {label}
      </span>
    );
  };
  
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

  // Chapter & Position states
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [masterSelectedChapterId, setMasterSelectedChapterId] = useState<string>('');
  const [selectedChapterIdFilter, setSelectedChapterIdFilter] = useState('');
  const [selectedPositionFilter, setSelectedPositionFilter] = useState('');
  const [currentUserChapterId, setCurrentUserChapterId] = useState<string | null>(null);
  const [currentUserChapterName, setCurrentUserChapterName] = useState<string | null>(null);

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
      
      const sender_id = profile.uid;
      const receiver_id = selectedMember.uid;
      const chapter_id = profile.chapter_id;

      if (!sender_id) throw new Error("Missing sender_id");
      if (!receiver_id) throw new Error("Missing receiver_id");
      if (!chapter_id) throw new Error("Missing chapter_id: Your account is not assigned to any chapter.");
      const contact_name = referralForm.customerName ? referralForm.customerName.trim() : null;
      const contact_phone = referralForm.mobileNumber ? referralForm.mobileNumber.trim() : null;
      const business_requirement = (referralForm.requirement || 'General Referral').trim();

      if (!contact_name) throw new Error("Missing contact_name (Customer Name)");
      if (!contact_phone) throw new Error("Missing contact_phone (Mobile Number)");

      console.log({
        sender_id,
        receiver_id,
        chapter_id,
        contact_name,
        contact_phone,
        business_requirement
      });

      const newReferral = {
        sender_id,
        receiver_id,
        chapter_id,
        contact_name,
        contact_phone,
        business_requirement,
        customer_name: contact_name,
        customer_mobile: contact_phone,
        requirement: business_requirement,
        notes: referralForm.notes || '',
        status: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('referrals')
        .insert([newReferral]);

      if (error) throw error;
      
      alert("Referral submitted successfully.");
      setSuccessMessage(`Referral sent to ${selectedMember.name} successfully!`);
      setIsModalOpen(false);
      setReferralForm({
        customerName: '',
        mobileNumber: '',
        notes: '',
        requirement: ''
      });
      setTimeout(() => setSuccessMessage(null), 3000);
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    } catch (error: any) {
      console.error("Referral Insert Error:", error);
      console.error(error?.message, error?.details, error?.hint, error?.code);
      let mainMsg = error?.message || (typeof error === 'string' ? error : "Database error occurred.");
      if (error?.code === '42501') {
        mainMsg = "Insert blocked by Row Level Security.";
      }
      const alertMsg = `${mainMsg}\n\nCode: ${error?.code || 'N/A'}\nDetails: ${error?.details || 'N/A'}\nHint: ${error?.hint || 'N/A'}`;
      alert(alertMsg);
      setErrorMessage(alertMsg);
    } finally {
      setReferringId(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      
      try {
        setLoading(true);
        setErrorMessage(null);
        
        // Check if user is active - bypass check since "no need approval" is requested
        const needsApproval = false;
        if (needsApproval && profile.membershipStatus !== 'ACTIVE' && profile.role !== 'MASTER_ADMIN') {
          setLoading(false);
          return;
        }

        // Fetch Categories
        const cats = await databaseService.list<Category>('categories');
        setCategories(cats);

        // Fetch Chapters
        const chapMap: Record<string, string> = {};
        try {
          const chaps = await databaseService.list<any>('chapters');
          setChaptersList(chaps || []);
          chaps.forEach(c => {
            if (c.id && c.chapter_name) {
              chapMap[c.id] = c.chapter_name;
            }
          });
          setChapterNames(chapMap);
        } catch (e) {
          console.error("Error loading chapters:", e);
        }

        // Fetch fresh logged-in user's details directly from Supabase 'users' table
        const loggedInUserId = profile?.uid || profile?.id;
        if (loggedInUserId) {
          const { data: dbUser, error: dbUserErr } = await supabase
            .from('users')
            .select('*')
            .eq('id', loggedInUserId)
            .single();

          if (!dbUserErr && dbUser) {
            setCurrentUserChapterId(dbUser.chapter_id || null);
            setCurrentUserChapterName(dbUser.chapter_name || null);
            console.log("Fresh logged-in user chapter details fetched:", {
              chapter_id: dbUser.chapter_id,
              chapter_name: dbUser.chapter_name
            });
          } else {
            console.warn("Could not fetch fresh logged-in user from users table. Fallback to profile:", dbUserErr);
            const fallbackId = profile.chapter_id || (profile as any).chapterId || null;
            const fallbackName = profile.chapterName || (profile as any).chapter_name || null;
            setCurrentUserChapterId(fallbackId);
            setCurrentUserChapterName(fallbackName);
          }
        }

        // Fetch All Active Members from Supabase 'users' table
        const fallbackId = profile.chapter_id || (profile as any).chapterId || null;
        const currentChapterId = currentUserChapterId || fallbackId;

        let queryBuilder = supabase
          .from('users')
          .select('*')
          .eq('status', 'ACTIVE');

        

        const { data: usersData, error: usersError } = await queryBuilder;

        if (usersError) {
          console.error("Supabase load members error:", usersError);
          setErrorMessage("Unable to load members. Please try again.");
          setMembers([]);
          setLoading(false);
          return;
        }

        const allActiveUsers: UserProfile[] = (usersData || [])
          .map((row: any) => ({
            uid: row.id,
            id: row.id,
            name: getCleanFullName(row.name),
            phone: row.phone,
            whatsappNumber: row.whatsapp_number,
            whatsapp_number: row.whatsapp_number,
            email: row.email,
            category: row.category,
            role: row.role,
            position: row.position,
            status: row.status,
            membershipStatus: row.status,
            photoURL: row.profile_photo,
            createdAt: row.created_at,
            chapter_id: row.chapter_id,
            chapter_name: row.chapter_name,
            businessName: row.businessName || row.business_name || '',
            state: row.state || '',
            city: row.city || '',
            area: row.area || '',
            chapterName: chapMap[row.chapter_id || ''] || row.chapter_name || 'SSK Chapter',
          }))
          .filter(m => m.role !== 'MASTER_ADMIN');
        
        // Fetch Admin Names for All Members
        const adminIds = Array.from(new Set(
          allActiveUsers
            .map(m => m.chapter_id || m.adminId)
            .filter(Boolean) as string[]
        ));

        if (adminIds.length > 0) {
          const adminData: Record<string, string> = {};
          await Promise.all(adminIds.map(async (id) => {
            const adminDoc = await databaseService.get<UserProfile>('users', id);
            if (adminDoc) {
              adminData[id] = adminDoc.name || adminDoc.displayName || 'Unknown Admin';
            }
          }));
          setAdminNames(adminData);
        }
        
        setMembers(allActiveUsers);
      } catch (error) {
        console.error("Error fetching connections:", error);
        setErrorMessage("Unable to load members. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    
    fetchData();

    const channel = supabase
      .channel('connections_users_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Listen for manual re-fetch events
    const handleRefresh = () => fetchData();
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      window.removeEventListener('dashboard-refresh', handleRefresh);
      supabase.removeChannel(channel);
    };
}, [profile]);

  useEffect(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      setActiveTab('all');
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.role === 'MASTER_ADMIN' && chaptersList.length > 0 && !masterSelectedChapterId) {
      setMasterSelectedChapterId(chaptersList[0].id);
    }
  }, [profile, chaptersList, masterSelectedChapterId]);

  const filteredMembers = members.filter(member => {
    // 1. Tab Filtering
    if (activeTab === 'chapter') {
      if (profile?.role === 'MASTER_ADMIN') {
        const selectedChap = (masterSelectedChapterId || '').trim();
        if (!selectedChap) return false;
        const memberChapId = (member.chapter_id || '').trim();
        if (memberChapId !== selectedChap) return false;
      } else {
        const myChapId = (currentUserChapterId || '').trim();
        const myChapName = (currentUserChapterName || '').trim().toLowerCase();

        if (!myChapId && !myChapName) {
          return false;
        }

        const memberChapId = (member.chapter_id || '').trim();
        const memberChapName = (member.chapter_name || member.chapterName || '').trim().toLowerCase();

        let isMatch = false;
        if (myChapId && memberChapId) {
          if (memberChapId === myChapId) {
            isMatch = true;
          }
        }
        if (!isMatch && myChapName && memberChapName) {
          if (memberChapName === myChapName) {
            isMatch = true;
          }
        }

        if (!isMatch) return false;
      }
    }

    // 2. Search filtering (covers Name, Business Name, Phone Number, Position, Chapter Name)
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      const displayPos = getDisplayPosition(member.position, member.role).toLowerCase();
      const chName = (member.chapterName || '').toLowerCase();
      
      const nameMatch = (member.name || '').toLowerCase().includes(term);
      const businessMatch = (member.businessName || '').toLowerCase().includes(term);
      const phoneMatch = (member.phone || '').includes(term) || (member.whatsappNumber || '').includes(term);
      const positionMatch = displayPos.includes(term);
      const chapterMatch = activeTab === 'all' && chName.includes(term);
      
      if (!(nameMatch || businessMatch || phoneMatch || positionMatch || chapterMatch)) {
        return false;
      }
    }

    // 3. Optional Filters
    // Business Category Filter
    if (selectedCategory && member.category !== selectedCategory) return false;
    
    // Chapter Filter
    if (selectedChapterIdFilter && member.chapter_id !== selectedChapterIdFilter) return false;
    
    // Position Filter
    if (selectedPositionFilter) {
      const role = member.role;
      const pos = member.position?.toLowerCase();
      if (selectedPositionFilter === 'chapter_admin') {
        if (role !== 'CHAPTER_ADMIN' && pos !== 'chapter_admin') return false;
      } else if (selectedPositionFilter === 'president') {
        if (pos !== 'president') return false;
      } else if (selectedPositionFilter === 'vice_president') {
        if (pos !== 'vice_president') return false;
      } else if (selectedPositionFilter === 'treasurer') {
        if (pos !== 'treasurer') return false;
      } else if (selectedPositionFilter === 'member') {
        if (role === 'CHAPTER_ADMIN' || pos === 'chapter_admin' || pos === 'president' || pos === 'vice_president' || pos === 'treasurer') {
          return false;
        }
      }
    }

    // Location Filters
    if (selectedState && !member.state?.toLowerCase().includes(selectedState.toLowerCase())) return false;
    if (selectedCity && !member.city?.toLowerCase().includes(selectedCity.toLowerCase())) return false;
    if (selectedArea && !member.area?.toLowerCase().includes(selectedArea.toLowerCase())) return false;

    return true;
  });

  // Get unique values for filters
  const uniqueStates = Array.from(new Set(members.map(m => m.state).filter(Boolean)));
  const uniqueCities = Array.from(new Set(members.map(m => m.city).filter(Boolean)));
  const uniqueAreas = Array.from(new Set(members.map(m => m.area).filter(Boolean)));

  // Calculate total counts
  const totalChapterCount = members.filter(m => {
    if (profile?.role === 'MASTER_ADMIN') {
      const selectedChap = (masterSelectedChapterId || '').trim();
      return (m.chapter_id || '').trim() === selectedChap;
    } else {
      const myChapId = (currentUserChapterId || '').trim();
      const myChapName = (currentUserChapterName || '').trim().toLowerCase();
      if (!myChapId && !myChapName) return false;

      const memberChapId = (m.chapter_id || '').trim();
      const memberChapName = (m.chapter_name || m.chapterName || '').trim().toLowerCase();

      if (myChapId && memberChapId && memberChapId === myChapId) return true;
      if (myChapName && memberChapName && memberChapName === myChapName) return true;
      return false;
    }
  }).length;

  // Log details if no chapter members are found
  useEffect(() => {
    if (!loading && activeTab === 'chapter' && totalChapterCount === 0) {
      console.warn("My Chapter Members - No members found!", {
        loggedInUserUid: profile?.uid || profile?.id,
        loggedInUserChapterId: currentUserChapterId,
        loggedInUserChapterName: currentUserChapterName,
        allMembersCount: members.length,
        queryResult: members.map(m => ({ id: m.id, name: m.name, chapter_id: m.chapter_id, chapter_name: m.chapter_name })),
        reason: !currentUserChapterId && !currentUserChapterName 
          ? "Logged-in user has null/empty chapter_id and chapter_name."
          : `No other active users match chapter_id: "${currentUserChapterId}" or chapter_name: "${currentUserChapterName}".`
      });
    }
  }, [loading, activeTab, totalChapterCount, members, profile, currentUserChapterId, currentUserChapterName]);

  const totalGlobalCount = members.length;

  // Sorting
  const getSortWeight = (member: UserProfile) => {
    const role = member.role;
    const pos = member.position?.toLowerCase();
    if (role === 'CHAPTER_ADMIN' || pos === 'chapter_admin') return 1;
    if (pos === 'president') return 2;
    if (pos === 'vice_president') return 3;
    if (pos === 'treasurer') return 4;
    return 5;
  };

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (activeTab === 'chapter') {
      const wA = getSortWeight(a);
      const wB = getSortWeight(b);
      if (wA !== wB) return wA - wB;
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const needsApprovalScreen = false;
  if (needsApprovalScreen && profile?.membershipStatus !== 'ACTIVE' && profile?.role !== 'MASTER_ADMIN') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
          <Clock size={48} />
        </div>
        <h2 className="text-3xl font-bold text-[#111827] tracking-tight">Account Pending Approval</h2>
        <p className="text-[#6B7280] mt-4 text-lg max-w-lg mx-auto leading-relaxed">
          Your account is currently being reviewed by our team. You will be able to access the member directory and discover connections once your membership is activated.
        </p>
        <Link 
          to="/network" 
          className="mt-8 inline-block px-6 py-3 bg-[#111827] text-white rounded-[16px] font-bold hover:bg-emerald-600 transition-all"
        >
          Return to Network
        </Link>
      </div>
    );
  }

  const getPositionText = (member: UserProfile) => {
    const position = member.position;
    if (!position || position === 'member') return null;
    return (
      <span className="text-[10px] font-bold text-primary uppercase tracking-tight bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
        {position.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-24 px-1 sm:px-0">
      {/* Feedback Messages */}
      {successMessage && typeof successMessage === 'string' && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      {errorMessage && typeof errorMessage === 'string' && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={18} />
          {errorMessage}
        </div>
      )}

      {/* Tabs / Section Header */}
      {profile?.role !== 'MASTER_ADMIN' && (
        <div className="flex p-1 bg-[#151C2E] rounded-[12px] w-full border border-white/5">
          <button
            onClick={() => setActiveTab('chapter')}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-300",
              activeTab === 'chapter' ? "bg-primary text-white shadow-sm font-bold" : "text-neutral-400 hover:text-white"
            )}
          >
            My Chapter Members
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-300",
              activeTab === 'all' ? "bg-primary text-white shadow-sm font-bold" : "text-neutral-400 hover:text-white"
            )}
          >
            All Members
          </button>
        </div>
      )}

      {profile?.role === 'MASTER_ADMIN' && activeTab === 'chapter' && (
        <div className="p-4 bg-[#161B22] rounded-[16px] border border-white/10 space-y-2">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">
            Currently Selected Chapter (Master Admin View)
          </label>
          <select
            value={masterSelectedChapterId}
            onChange={(e) => setMasterSelectedChapterId(e.target.value)}
            className="w-full h-10 px-3 bg-[#0F172A] border border-white/5 rounded-lg focus:border-primary outline-none text-xs font-semibold text-white cursor-pointer"
          >
            {chaptersList.map(chap => (
              <option key={chap.id} value={chap.id}>{chap.chapter_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Search & Filter Header */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search connections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 h-10 bg-[#161B22] border border-white/10 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "h-10 px-4 bg-[#161B22] border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-2 hover:text-white transition-colors",
            showFilters ? "text-primary border-primary/20" : "text-neutral-400"
          )}
        >
          <Filter size={16} />
          Filters
        </button>
      </div>

      {showFilters && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-[#161B22] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-white/10 space-y-4"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-10 px-3 bg-[#0F172A] border border-white/5 rounded-lg focus:border-primary outline-none transition-all text-xs font-medium text-white appearance-none cursor-pointer"
              >
                <option value="" className="text-neutral-400">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Chapter</label>
              <select
                value={selectedChapterIdFilter}
                onChange={(e) => setSelectedChapterIdFilter(e.target.value)}
                className="w-full h-10 px-3 bg-[#0F172A] border border-white/5 rounded-lg focus:border-primary outline-none transition-all text-xs font-medium text-white appearance-none cursor-pointer"
              >
                <option value="" className="text-neutral-400">All Chapters</option>
                {chaptersList.map(chap => (
                  <option key={chap.id} value={chap.id}>{chap.chapter_name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Position</label>
              <select
                value={selectedPositionFilter}
                onChange={(e) => setSelectedPositionFilter(e.target.value)}
                className="w-full h-10 px-3 bg-[#0F172A] border border-white/5 rounded-lg focus:border-primary outline-none transition-all text-xs font-medium text-white appearance-none cursor-pointer"
              >
                <option value="" className="text-neutral-400">All Positions</option>
                <option value="chapter_admin">Chapter Admin</option>
                <option value="president">President</option>
                <option value="vice_president">Vice President</option>
                <option value="treasurer">Treasurer</option>
                <option value="member">Associate Member</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">State</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full h-10 px-3 bg-[#0F172A] border border-white/5 rounded-lg focus:border-primary outline-none transition-all text-xs font-medium text-white appearance-none cursor-pointer"
              >
                <option value="" className="text-neutral-400">All States</option>
                {uniqueStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">City</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full h-10 px-3 bg-[#0F172A] border border-white/5 rounded-lg focus:border-primary outline-none transition-all text-xs font-medium text-white appearance-none cursor-pointer"
              >
                <option value="" className="text-neutral-400">All Cities</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Area</label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full h-10 px-3 bg-[#0F172A] border border-white/5 rounded-lg focus:border-primary outline-none transition-all text-xs font-medium text-white appearance-none cursor-pointer"
              >
                <option value="" className="text-neutral-400">All Areas</option>
                {uniqueAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              {filteredMembers.length} Members Found
            </p>
            <button 
              onClick={() => {
                setSelectedCategory('');
                setSelectedChapterIdFilter('');
                setSelectedPositionFilter('');
                setSelectedState('');
                setSelectedCity('');
                setSelectedArea('');
                setSearchTerm('');
              }}
              className="text-[10px] font-bold text-primary hover:text-white uppercase tracking-wider transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </motion.div>
      )}

      {/* Total Counts Header Banner */}
      <div className="flex items-center justify-between px-2 py-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          {activeTab === 'chapter' ? 'My Chapter Members' : 'All Members'}
        </h2>
        <div className="text-[11px] font-bold text-neutral-300 bg-[#161B22] border border-white/10 px-3 py-1 rounded-full flex items-center gap-1">
          {activeTab === 'chapter' ? (
            <span>Total Chapter Members: <strong className="text-primary font-extrabold text-xs">{totalChapterCount}</strong></span>
          ) : (
            <span>Total Global Members: <strong className="text-primary font-extrabold text-xs">{totalGlobalCount}</strong></span>
          )}
        </div>
      </div>

      {/* Members List */}
      <div className="bg-[#161B22] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-white/10 overflow-hidden">
        {sortedMembers.length > 0 ? (
          <div className="divide-y divide-white/5">
            {sortedMembers.map((member, i) => (
              <motion.div
                key={member.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/profile?id=${member.uid}`)}
                className="p-5 flex items-center gap-4 hover:bg-[#1F2937] transition-all duration-300 cursor-pointer group"
              >
                <Avatar src={member.photoURL} name={member.name} size="w-12 h-12" className="border border-white/10 shrink-0 shadow-inner" />
                
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[16px] sm:text-[18px] font-bold text-white truncate max-w-[150px] sm:max-w-none group-hover:text-primary transition-colors">
                      {member.name}
                    </h3>
                    {activeTab === 'chapter' && getPositionBadge(member)}
                  </div>
                  
                  <div className="flex flex-col gap-1 text-[13px] font-medium text-neutral-400">
                    <div className="flex items-center gap-1">
                      <span className="text-neutral-500 font-semibold text-[11px] uppercase tracking-wider mr-1">Chapter:</span> 
                      <span className="text-neutral-200 font-medium">
                        {member.chapterName || chapterNames[member.chapter_id || ''] || 'SSK Chapter'}
                      </span>
                    </div>
                  </div>

                  {member.businessName && (
                    <p className="text-[12px] font-medium text-neutral-500 truncate">
                      {member.businessName}
                    </p>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                  <ChevronRight size={18} className="text-neutral-500 group-hover:text-primary transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-neutral-600">
              <Users size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No Members Found</h3>
            <p className="text-sm text-neutral-400 max-w-sm mb-6">
              No members match your current search or filter criteria.
            </p>
            {(searchTerm || selectedCategory || selectedChapterIdFilter || selectedPositionFilter || selectedState || selectedCity || selectedArea) && (
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setSelectedChapterIdFilter('');
                  setSelectedPositionFilter('');
                  setSelectedState('');
                  setSelectedCity('');
                  setSelectedArea('');
                  setSearchTerm('');
                }}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-white/10"
              >
                Clear Filters
              </button>
            )}
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
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-[12px] text-sm font-bold flex items-center gap-2">
              <AlertCircle size={18} />
              {errorMessage}
            </div>
          )}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Customer Name</label>
            <input
              required
              type="text"
              value={referralForm.customerName}
              onChange={(e) => setReferralForm(prev => ({ ...prev, customerName: e.target.value }))}
              placeholder="Enter customer name"
              className="w-full px-6 py-4 bg-[#0F172A] border border-white/10 rounded-xl focus:border-primary outline-none transition-all text-white placeholder-neutral-500 text-sm"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Mobile Number</label>
            <input
              required
              type="tel"
              value={referralForm.mobileNumber}
              onChange={(e) => setReferralForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
              placeholder="Enter mobile number"
              className="w-full px-6 py-4 bg-[#0F172A] border border-white/10 rounded-xl focus:border-primary outline-none transition-all text-white placeholder-neutral-500 text-sm"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Requirement</label>
            <input
              type="text"
              value={referralForm.requirement}
              onChange={(e) => setReferralForm(prev => ({ ...prev, requirement: e.target.value }))}
              placeholder="What is the requirement?"
              className="w-full px-6 py-4 bg-[#0F172A] border border-white/10 rounded-xl focus:border-primary outline-none transition-all text-white placeholder-neutral-500 text-sm"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Notes</label>
            <textarea
              value={referralForm.notes}
              onChange={(e) => setReferralForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes..."
              rows={3}
              className="w-full px-6 py-4 bg-[#0F172A] border border-white/10 rounded-xl focus:border-primary outline-none transition-all text-white placeholder-neutral-500 text-sm resize-none"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={referringId !== null}
              className="w-full py-5 bg-gradient-to-br from-secondary to-emerald-600 text-white rounded-[1.5rem] font-bold uppercase tracking-[0.3em] text-xs hover:shadow-2xl hover:shadow-secondary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
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
