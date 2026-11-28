import React, { useState, useEffect, useMemo, useDeferredValue, useCallback, memo } from 'react';
import { motion } from 'motion/react';
import { CategorySelect } from '../components/CategorySelect';
import { ContactPickerButton } from '../components/PhoneInputWithPicker';
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
import { getCleanFullName, getDisplayPosition } from '../utils/authUtils';
import { UserProfile, Category, Referral } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { databaseService } from '../services/databaseService';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import { showError, showSuccess as triggerSuccessToast, scrollToError } from '../services/toastService';
import { getDirectorySnapshot, invalidateDirectoryCache, withTimeout } from '../utils/directoryCache';

const ConnectionMemberRow = memo(function ConnectionMemberRow({
  member,
  chapterName,
  positionLabel,
  positionClasses,
  onSelect
}: {
  member: UserProfile;
  chapterName: string;
  positionLabel: string;
  positionClasses: string;
  onSelect: (uid: string) => void;
}) {
  return (
    <div
      onClick={() => onSelect(member.uid)}
      className="p-5 flex items-center gap-4 hover:bg-[#1F2937] transition-colors duration-200 cursor-pointer group"
    >
      <Avatar
        src={member.photoURL}
        name={member.name}
        size="w-12 h-12 text-base"
        className="border border-white/10 shadow-inner shrink-0"
      />

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-[16px] sm:text-[18px] font-bold text-white truncate max-w-[150px] sm:max-w-none group-hover:text-primary transition-colors">
            {getCleanFullName(member.name)}
          </h3>
          {positionLabel && (
            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0", positionClasses)}>
              {positionLabel}
            </span>
          )}
        </div>

        <p className="text-xs sm:text-[13px] font-semibold text-primary truncate uppercase">
          {(member.category || member.businessName || 'Business Owner')} &bull; {chapterName}
        </p>

        {member.businessName && member.category && member.businessName !== member.category && (
          <p className="text-[12px] font-medium text-neutral-500 truncate">
            {member.businessName}
          </p>
        )}
      </div>
      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
        <ChevronRight size={18} className="text-neutral-500 group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
});

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

  const getPositionTitleAndStyle = (member: UserProfile) => {
    const mId = String(member.id || member.uid || '');
    const mChapId = member.chapter_id || (member as any).chapterId;
    const chapObj = chaptersList.find(c => String(c.id) === String(mChapId));

    const pos = String(member.position || (member as any).chapter_position || (member as any).position_name || '')
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
    const role = String(member.role || '').trim().toUpperCase();

    if (role === 'PRESIDENT' || pos === 'president' || (chapObj && mId && String(chapObj.president_id) === mId)) {
      return { label: 'PRESIDENT', classes: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    }
    if (role === 'VICE_PRESIDENT' || pos === 'vice president' || pos === 'vp' || (chapObj && mId && String(chapObj.vice_president_id) === mId)) {
      return { label: 'VICE PRESIDENT', classes: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    }
    if (role === 'TREASURER' || pos === 'treasurer' || (chapObj && mId && String(chapObj.treasurer_id) === mId)) {
      return { label: 'TREASURER', classes: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
    }
    if (role === 'CHAPTER_ADMIN' || pos === 'chapter admin' || (chapObj && mId && String(chapObj.chapter_admin_id) === mId)) {
      return { label: 'CHAPTER ADMIN', classes: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    }

    return { label: 'MEMBER', classes: 'text-neutral-300 bg-white/5 border-white/10' };
  };

  const getPositionBadge = (member: UserProfile) => {
    const { label, classes } = getPositionTitleAndStyle(member);
    if (!label) return null;
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
  const [currentUserChapter, setCurrentUserChapter] = useState<string | null>(null);

  const handleRefer = (member: UserProfile) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  // Helper function to check if a member belongs to the same chapter as current user
  const isSameChapter = (
    member: UserProfile,
    userChapId: string | null | undefined,
    userChapName: string | null | undefined,
    userChapVal: string | null | undefined,
    profileObj: any
  ) => {
    const memId = String(member.chapter_id || (member as any).chapterId || '').trim().toLowerCase();
    const memName = String(member.chapterName || (member as any).chapter_name || (member as any).chapter || '').trim().toLowerCase();

    if (profileObj?.role === 'MASTER_ADMIN') {
      if (masterSelectedChapterId) {
        const selId = String(masterSelectedChapterId).trim().toLowerCase();
        return memId === selId || memName === selId;
      }
      return true;
    }

    const myId = String(userChapId || profileObj?.chapter_id || profileObj?.chapterId || '').trim().toLowerCase();
    const myName = String(userChapName || userChapVal || profileObj?.chapterName || (profileObj as any)?.chapter_name || profileObj?.chapter || '').trim().toLowerCase();

    // 1. Non-empty chapter ID match
    if (myId && memId && myId === memId) {
      return true;
    }

    // 2. Non-empty chapter Name match
    if (myName && memName && myName === memName) {
      return true;
    }

    // 3. ID equals Name cross match
    if (myId && memName && myId === memName) {
      return true;
    }
    if (myName && memId && myName === memId) {
      return true;
    }

    // 4. Mapped chapter name check
    if (memId && chapterNames[memId]) {
      const mapped = chapterNames[memId].trim().toLowerCase();
      if (myName && mapped === myName) return true;
    }
    if (myId && chapterNames[myId]) {
      const mapped = chapterNames[myId].trim().toLowerCase();
      if (memName && mapped === memName) return true;
    }

    return false;
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
      
      triggerSuccessToast(`Referral sent to ${selectedMember.name} successfully!`);
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
      showError(mainMsg);
      scrollToError();
      setErrorMessage(mainMsg);
    } finally {
      setReferringId(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async (silent = false, forceRefresh = false) => {
      if (!profile) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        if (!silent && isMounted) {
          setLoading(true);
        }
        setErrorMessage(null);

        const [snapshot, chaps] = await withTimeout(
          Promise.all([
            getDirectorySnapshot({ forceRefresh, timeoutMs: 12_000 }),
            databaseService.list<any>('chapters').catch(() => [])
          ]),
          12_000,
          'Loading connections'
        );

        if (!isMounted) return;

        // 1. Categories
        const cats = [...(snapshot.categories || [])].sort((a: any, b: any) =>
          String(a.name || '').localeCompare(String(b.name || ''))
        );
        const catMap: Record<string, string> = {};
        setCategories(cats as unknown as Category[]);
        cats.forEach((c: any) => {
          if (c.id && c.name) {
            catMap[String(c.id).trim().toLowerCase()] = c.name;
          }
        });

        // 2. Chapters (fallback to snapshot.chapters if list returned empty)
        const effectiveChaps = (chaps && chaps.length > 0) ? chaps : (snapshot.chapters || []);
        const chapMap: Record<string, string> = {};
        setChaptersList(effectiveChaps);
        effectiveChaps.forEach((c: any) => {
          const chapLabel = c.chapter_name || c.name;
          if (c.id && chapLabel) {
            chapMap[c.id] = chapLabel;
          }
        });
        setChapterNames(chapMap);

        const usersData = snapshot.users || [];

        // 3. Resolve logged-in user's chapter info from already-loaded users snapshot
        const loggedInUserId = profile?.uid || profile?.id;
        if (loggedInUserId) {
          const dbUser = usersData.find(
            (u: any) => String(u.id || u.uid) === String(loggedInUserId)
          );
          if (dbUser) {
            setCurrentUserChapterId(dbUser.chapter_id || null);
            setCurrentUserChapterName(dbUser.chapter_name || null);
            setCurrentUserChapter(dbUser.chapter || null);
          } else {
            setCurrentUserChapterId(profile.chapter_id || (profile as any).chapterId || null);
            setCurrentUserChapterName(profile.chapterName || (profile as any).chapter_name || null);
            setCurrentUserChapter((profile as any).chapter || null);
          }
        }

        const allActiveUsers: UserProfile[] = usersData
          .filter((row: any) => {
            const status = String(row.status || '').toUpperCase();
            if (status === 'INACTIVE') return false;
            return true;
          })
          .map((row: any) => {
            let photo = row.profile_photo || row.photo_url || row.photoURL || '';
            let extraData: any = {};
            if (typeof photo === 'string' && photo.includes('|||')) {
              const parts = photo.split('|||');
              photo = parts[0];
              try {
                extraData = JSON.parse(parts[1] || '{}');
              } catch (e) {}
            }
            const rawCategory = row.category || extraData.category || row.business_category || extraData.business_category || row.category_name || extraData.category_name || '';
            const resolvedCategory = catMap[String(rawCategory).trim().toLowerCase()] || rawCategory || row.businessName || row.business_name || extraData.business_name || extraData.businessName || '';
            const resolvedBusinessName = row.businessName || row.business_name || extraData.business_name || extraData.businessName || '';
            return {
              uid: row.id,
              id: row.id,
              name: getCleanFullName(row.name),
              phone: row.phone,
              whatsappNumber: row.whatsapp_number,
              whatsapp_number: row.whatsapp_number,
              email: row.email,
              category: resolvedCategory,
              role: row.role,
              position: row.position || extraData.position,
              status: row.status,
              membershipStatus: row.status,
              photoURL: photo,
              createdAt: row.created_at,
              chapter_id: row.chapter_id,
              chapter_name: row.chapter_name || row.chapter,
              chapter: row.chapter || row.chapter_name || row.chapter_id,
              businessName: resolvedBusinessName,
              state: row.state || extraData.state || '',
              city: row.city || extraData.city || '',
              area: row.area || extraData.area || '',
              chapterName: row.chapter_name || row.chapter || chapMap[row.chapter_id || ''] || 'SSK Chapter',
            };
          })
          .filter(m => m.role !== 'MASTER_ADMIN');

        // Resolve Admin Names in O(1) from already-fetched usersData
        const usersById = new Map<string, any>();
        usersData.forEach((u: any) => {
          if (u?.id) usersById.set(String(u.id), u);
          if (u?.uid && u.uid !== u.id) usersById.set(String(u.uid), u);
        });

        const adminIds = Array.from(new Set(
          allActiveUsers
            .map(m => m.chapter_id || m.adminId)
            .filter(Boolean) as string[]
        ));

        if (adminIds.length > 0) {
          const adminData: Record<string, string> = {};
          adminIds.forEach((id) => {
            const found = usersById.get(String(id));
            if (found) {
              adminData[id] = found.name || found.displayName || 'Unknown Admin';
            }
          });
          setAdminNames(adminData);
        }

        setMembers(allActiveUsers);
      } catch (error) {
        console.error("Error fetching connections:", error);
        if (isMounted) setErrorMessage("Unable to load members. Please try again.");
      } finally {
        if (isMounted && !silent) setLoading(false);
      }
    };

    fetchData(false, false);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (!isMounted) return;
      invalidateDirectoryCache();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isMounted) fetchData(true, true);
      }, 250);
    };

    window.addEventListener('dashboard-refresh', scheduleRefresh);

    const channel = supabase
      .channel('public:users:directory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, scheduleRefresh)
      .subscribe();

    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('dashboard-refresh', scheduleRefresh);
      supabase.removeChannel(channel);
    };
  }, [profile?.uid, profile?.id, profile?.role, profile?.chapter_id, (profile as any)?.chapterId]);

  useEffect(() => {
    if (profile?.role === 'MASTER_ADMIN' && chaptersList.length > 0 && !masterSelectedChapterId) {
      setMasterSelectedChapterId(chaptersList[0].id);
    }
  }, [profile, chaptersList, masterSelectedChapterId]);

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredMembers = useMemo(() => {
    const term = deferredSearchTerm.toLowerCase().trim();
    const stateFilterLower = selectedState.toLowerCase();
    const cityFilterLower = selectedCity.toLowerCase();
    const areaFilterLower = selectedArea.toLowerCase();

    return members.filter(member => {
      // 1. Tab Filtering
      if (activeTab === 'chapter') {
        if (profile?.role === 'MASTER_ADMIN') {
          const selectedChap = (masterSelectedChapterId || '').trim().toLowerCase();
          if (selectedChap) {
            const memId = (member.chapter_id || '').trim().toLowerCase();
            const memName = (member.chapterName || member.chapter_name || (member as any).chapter || '').trim().toLowerCase();
            if (memId !== selectedChap && memName !== selectedChap) return false;
          }
        } else {
          if (!isSameChapter(member, currentUserChapterId, currentUserChapterName, currentUserChapter, profile)) {
            return false;
          }
        }
      }

      // 2. Search filtering (covers Name, Category, Business Name, Phone Number, Position, Chapter Name)
      if (term) {
        const { label: posLabel } = getPositionTitleAndStyle(member);
        const displayPos = posLabel.toLowerCase();
        const chName = (member.chapterName || member.chapter_name || (member as any).chapter || '').toLowerCase();
        
        const nameMatch = (member.name || '').toLowerCase().includes(term);
        const categoryMatch = (member.category || '').toLowerCase().includes(term);
        const businessMatch = (member.businessName || '').toLowerCase().includes(term);
        const phoneMatch = (member.phone || '').includes(term) || (member.whatsappNumber || '').includes(term);
        const positionMatch = displayPos.includes(term);
        const chapterMatch = chName.includes(term);
        
        if (!(nameMatch || categoryMatch || businessMatch || phoneMatch || positionMatch || chapterMatch)) {
          return false;
        }
      }

      // 3. Optional Filters
      if (selectedCategory && member.category !== selectedCategory) return false;
      
      if (selectedChapterIdFilter) {
        const filterVal = selectedChapterIdFilter.trim().toLowerCase();
        const memId = (member.chapter_id || '').trim().toLowerCase();
        const memName = (member.chapterName || member.chapter_name || (member as any).chapter || '').trim().toLowerCase();
        if (memId !== filterVal && memName !== filterVal) return false;
      }
      
      if (selectedPositionFilter) {
        const role = (member.role || 'MEMBER').toUpperCase();
        const pos = (member.position || '').toLowerCase();
        if (selectedPositionFilter === 'chapter_admin') {
          if (role !== 'CHAPTER_ADMIN' && pos !== 'chapter_admin') return false;
        } else if (selectedPositionFilter === 'president') {
          if (role !== 'PRESIDENT' && pos !== 'president') return false;
        } else if (selectedPositionFilter === 'vice_president') {
          if (role !== 'VICE_PRESIDENT' && pos !== 'vice_president') return false;
        } else if (selectedPositionFilter === 'treasurer') {
          if (role !== 'TREASURER' && pos !== 'treasurer') return false;
        } else if (selectedPositionFilter === 'member') {
          if (role !== 'MEMBER' && pos !== 'member') return false;
        }
      }

      // Location Filters
      if (selectedState && !member.state?.toLowerCase().includes(stateFilterLower)) return false;
      if (selectedCity && !member.city?.toLowerCase().includes(cityFilterLower)) return false;
      if (selectedArea && !member.area?.toLowerCase().includes(areaFilterLower)) return false;

      return true;
    });
  }, [
    members,
    activeTab,
    profile,
    masterSelectedChapterId,
    currentUserChapterId,
    currentUserChapterName,
    currentUserChapter,
    deferredSearchTerm,
    selectedCategory,
    selectedChapterIdFilter,
    selectedPositionFilter,
    selectedState,
    selectedCity,
    selectedArea
  ]);

  // Get unique values for filters
  const uniqueStates = useMemo(() => Array.from(new Set(members.map(m => m.state).filter(Boolean))), [members]);
  const uniqueCities = useMemo(() => Array.from(new Set(members.map(m => m.city).filter(Boolean))), [members]);
  const uniqueAreas = useMemo(() => Array.from(new Set(members.map(m => m.area).filter(Boolean))), [members]);

  // Calculate total counts
  const totalChapterCount = useMemo(() => members.filter(m => {
    if (profile?.role === 'MASTER_ADMIN') {
      const selectedChap = (masterSelectedChapterId || '').trim().toLowerCase();
      if (!selectedChap) return true;
      const memId = (m.chapter_id || '').trim().toLowerCase();
      const memName = (m.chapterName || m.chapter_name || (m as any).chapter || '').trim().toLowerCase();
      return memId === selectedChap || memName === selectedChap;
    } else {
      return isSameChapter(m, currentUserChapterId, currentUserChapterName, currentUserChapter, profile);
    }
  }).length, [members, profile, masterSelectedChapterId, currentUserChapterId, currentUserChapterName, currentUserChapter]);

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

  const sortedMembers = useMemo(() => {
    const getSortWeight = (member: UserProfile) => {
      const role = (member.role || 'MEMBER').toUpperCase();
      if (role === 'CHAPTER_ADMIN') return 1;
      if (role === 'PRESIDENT') return 2;
      if (role === 'VICE_PRESIDENT') return 3;
      if (role === 'TREASURER') return 4;
      return 5;
    };

    return [...filteredMembers].sort((a, b) => {
      if (activeTab === 'chapter') {
        const wA = getSortWeight(a);
        const wB = getSortWeight(b);
        if (wA !== wB) return wA - wB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [filteredMembers, activeTab]);

  const handleSelectMemberProfile = useCallback((uid: string) => {
    navigate(`/profile?id=${uid}`);
  }, [navigate]);

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
          Your account is currently being reviewed by our team. You will be able to access members and discover connections once your membership is activated.
        </p>
        <Link 
          to="/dashboard" 
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
            placeholder="Search members..."
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
              <CategorySelect
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val)}
                categories={categories}
                allowAllOption
                defaultOptionLabel="All Categories"
                className="w-full h-10 px-3 bg-[#0F172A] border border-white/5 rounded-lg focus:border-primary outline-none transition-all text-xs font-medium text-white flex items-center justify-between cursor-pointer"
              />
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
            {sortedMembers.map((member) => {
              const { label, classes } = getPositionTitleAndStyle(member);
              const chName = member.chapterName || chapterNames[member.chapter_id || ''] || 'SSK Chapter';
              return (
                <ConnectionMemberRow
                  key={member.uid}
                  member={member}
                  chapterName={chName}
                  positionLabel={label}
                  positionClasses={classes}
                  onSelect={handleSelectMemberProfile}
                />
              );
            })}
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
            <div className="relative">
              <input
                required
                type="tel"
                value={referralForm.mobileNumber}
                onChange={(e) => setReferralForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                placeholder="Enter mobile number"
                className="w-full px-6 pr-12 py-4 bg-[#0F172A] border border-white/10 rounded-xl focus:border-primary outline-none transition-all text-white placeholder-neutral-500 text-sm"
              />
              <ContactPickerButton onSelect={(phone) => setReferralForm(prev => ({ ...prev, mobileNumber: phone }))} />
            </div>
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
