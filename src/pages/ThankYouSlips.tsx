import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, TrendingUp, Award, Calendar, User, IndianRupee, ChevronRight, CircleCheck as CheckCircle2, Download, CircleAlert as AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { ThankYouSlip, Referral, UserProfile, Category } from '../types';
import { Modal } from '../components/Modal';
import { format } from 'date-fns';
import { where, orderBy } from 'firebase/firestore';
import { cn } from '../lib/utils';

export function ThankYouSlips() {
  const { profile } = useAuth();
  const [slips, setSlips] = useState<ThankYouSlip[]>([]);
  const [receivedSlips, setReceivedSlips] = useState<ThankYouSlip[]>([]);
  const [allSlips, setAllSlips] = useState<ThankYouSlip[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'sent' | 'received' | 'all'>('sent');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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
    businessValue: '',
    notes: ''
  });

  const isMasterAdmin = profile?.role === 'MASTER_ADMIN';
  const isChapterAdmin = profile?.role === 'CHAPTER_ADMIN';

  useEffect(() => {
    if (isMasterAdmin || isChapterAdmin) {
      setActiveTab('all');
    }
  }, [isMasterAdmin, isChapterAdmin]);

  useEffect(() => {
    if (!profile) return;

    const unsubscribeSent = firestoreService.subscribe<ThankYouSlip>('thank_you_slips', [
      where('toUserId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    ], (data) => {
      setSlips(data);
      setLoading(false);
    });

    const unsubscribeReceived = firestoreService.subscribe<ThankYouSlip>('thank_you_slips', [
      where('fromUserId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    ], (data) => {
      setReceivedSlips(data);
    });

    let unsubscribeAll = () => {};
    if (isMasterAdmin || isChapterAdmin) {
      const constraints = [orderBy('createdAt', 'desc')];

      unsubscribeAll = firestoreService.subscribe<ThankYouSlip>('thank_you_slips', constraints, (data) => {
        setAllSlips(data);
      });

      // Fetch users to resolve names
      firestoreService.list<UserProfile>('users', []).then(users => {
        setAllUsers(users);
        const names: Record<string, string> = {};
        users.forEach(u => {
          names[u.uid] = u.name || u.displayName || 'Unknown Member';
        });
        setMemberNames(prev => ({ ...prev, ...names }));
      });

      // Fetch categories
      firestoreService.list<Category>('categories', []).then(setAllCategories);
    }

    // Fetch members to show names
    firestoreService.list<UserProfile>('users', []).then(users => {
      const names: Record<string, string> = {};
      users.forEach(u => {
        names[u.uid] = u.name || u.displayName || 'Unknown Member';
      });
      setMemberNames(prev => ({ ...prev, ...names }));
    });

    // Fetch converted referrals for the form
    firestoreService.list<Referral>('referrals', [
      where('toUserId', '==', profile.uid),
      where('status', '==', 'CONVERTED')
    ]).then(setReferrals);

    return () => {
      unsubscribeSent();
      unsubscribeReceived();
      unsubscribeAll();
    };
  }, [profile, isMasterAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const selectedReferral = referrals.find(r => r.id === formData.referralId);
    if (!selectedReferral) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const newSlip: Omit<ThankYouSlip, 'id'> = {
        referralId: formData.referralId,
        fromUserId: profile.uid,
        toUserId: selectedReferral.fromUserId,
        customerName: formData.customerName,
        businessValue: Number(formData.businessValue),
        notes: formData.notes,
        createdAt: new Date().toISOString()
      };

      await firestoreService.create('thank_you_slips', newSlip);
      
      // Close the referral status
      await firestoreService.update('referrals', formData.referralId, { status: 'CLOSED' });
      
      setShowSuccess(true);
      setFormData({ referralId: '', customerName: '', businessValue: '', notes: '' });
      
      setTimeout(() => {
        setIsModalOpen(false);
        setShowSuccess(false);
      }, 2000);
    } catch (err: any) {
      console.error("Error creating thank you slip:", err);
      setError(err.message || "Failed to submit thank you slip. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBusinessSent = slips.reduce((acc, slip) => acc + slip.businessValue, 0);
  const totalBusinessReceived = receivedSlips.reduce((acc, slip) => acc + slip.businessValue, 0);
  
  const filteredSlips = allSlips.filter(slip => {
    if (isChapterAdmin) {
      const associatedMemberIds = [...allUsers.filter(m => m.adminId === profile?.uid).map(m => m.uid), profile?.uid];
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
    const dataToExport = isMasterAdmin || isChapterAdmin ? filteredSlips : (activeTab === 'sent' ? slips : receivedSlips);
    
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

  if (isMasterAdmin || isChapterAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-200/80 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0 shadow-sm shadow-primary/10">
              <Award size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-neutral-900 tracking-tight">
                Thank You Slips
              </h1>
              <p className="text-sm text-neutral-500 font-medium mt-0.5">
                Business value generated through the network
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={downloadReport}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-neutral-700 rounded-xl font-bold border border-neutral-200 hover:bg-neutral-50 transition-all text-sm hover:-translate-y-0.5 shadow-sm"
            >
              <Download size={18} />
              <span>Export Report</span>
            </button>
          </div>
        </header>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-[20px] border border-neutral-200/80 shadow-sm space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Filter Reports</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-500 ml-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm font-semibold text-neutral-900 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-500 ml-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm font-semibold text-neutral-900 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ startDate: '', endDate: '', category: '', fromUserId: '', toUserId: '' })}
                className="px-5 py-2.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-xl transition-all"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="group relative bg-navy p-6 rounded-[20px] shadow-xl shadow-navy/20 overflow-hidden hover:-translate-y-1 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/20 transition-colors duration-500" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-5">
                <TrendingUp size={24} />
              </div>
              <p className="text-xs font-semibold text-neutral-300 mb-2">Total Generated</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="text-emerald-500">₹</span>
                {totalBusinessGenerated.toLocaleString()}
              </h2>
              <p className="text-xs font-medium text-neutral-300 mt-4">Network-wide business passed</p>
            </div>
          </div>

          <div className="group relative bg-white p-6 rounded-[20px] border border-neutral-200/80 shadow-sm hover:shadow-md overflow-hidden hover:-translate-y-1 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-5">
                <Award size={24} />
              </div>
              <p className="text-xs font-semibold text-neutral-500 mb-2">Total Received</p>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                <span className="text-primary">₹</span>
                {totalBusinessReceivedFiltered.toLocaleString()}
              </h2>
              <p className="text-xs font-medium text-neutral-500 mt-4">Network-wide business received</p>
            </div>
          </div>

          <div className="group relative bg-white p-6 rounded-[20px] border border-neutral-200/80 shadow-sm hover:shadow-md overflow-hidden hover:-translate-y-1 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-amber-500/10 transition-colors duration-500" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-5">
                <TrendingUp size={24} />
              </div>
              <p className="text-xs font-semibold text-neutral-500 mb-2">Network Volume</p>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                <span className="text-amber-500">₹</span>
                {totalNetworkBusiness.toLocaleString()}
              </h2>
              <p className="text-xs font-medium text-neutral-500 mt-4">Total transaction volume</p>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-[20px] border border-neutral-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-100">
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Slip ID</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Generated By</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Received From</th>
                  {isMasterAdmin && <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Chapter</th>}
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-xs font-bold text-neutral-400">Loading data...</p>
                    </td>
                  </tr>
                ) : filteredSlips.length > 0 ? (
                  filteredSlips.map((slip) => {
                    const fromUser = allUsers.find(u => u.uid === slip.fromUserId);
                    const toUser = allUsers.find(u => u.uid === slip.toUserId);
                    const chapterAdmin = allUsers.find(u => u.uid === (toUser?.adminId || fromUser?.adminId));

                    return (
                      <tr key={slip.id} className="hover:bg-neutral-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-[14px] font-mono font-bold text-neutral-400">
                            #{slip.id.slice(-6)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[14px] font-bold text-neutral-900">{memberNames[slip.fromUserId] || 'Unknown'}</span>
                            <span className="text-xs text-neutral-400 font-medium">{fromUser?.category || 'Member'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[14px] font-bold text-neutral-900">{memberNames[slip.toUserId] || 'Unknown'}</span>
                            <span className="text-xs text-neutral-400 font-medium">{toUser?.category || 'Member'}</span>
                          </div>
                        </td>
                        {isMasterAdmin && (
                          <td className="px-6 py-4">
                            <span className="text-[14px] font-bold text-primary">
                              {chapterAdmin?.businessName || 'Independent'}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <span className="text-[14px] font-semibold text-neutral-600">
                            {format(new Date(slip.createdAt), 'dd MMM yyyy')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[14px] font-bold text-emerald-600">
                            ₹{slip.businessValue.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[14px] font-medium text-neutral-500 line-clamp-1 max-w-[200px]" title={slip.notes}>
                            {slip.notes || '-'}
                          </p>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-300">
                        <Award size={32} />
                      </div>
                      <h3 className="text-base font-bold text-neutral-900">No slips found</h3>
                      <p className="text-sm text-neutral-500 mt-1">The thank you slip history is currently empty.</p>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-200/80 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0 shadow-sm shadow-primary/10">
            <Award size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-neutral-900 tracking-tight">
              My Thank You Slips
            </h1>
            <p className="text-sm text-neutral-500 font-medium mt-0.5">
              Value generated and received in your network
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={downloadReport}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-neutral-700 rounded-xl font-bold border border-neutral-200 hover:bg-neutral-50 transition-all text-sm hover:-translate-y-0.5 shadow-sm"
          >
            <Download size={18} />
            <span>Export Report</span>
          </button>
          {!isMasterAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5"
            >
              <Plus size={18} />
              <span>Submit Slip</span>
            </button>
          )}
        </div>
      </header>

      {/* Filters for Admin */}
      {(isMasterAdmin || isChapterAdmin) && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-[20px] border border-neutral-200/80 shadow-sm space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Filter Reports</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-500 ml-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm font-semibold text-neutral-900 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-500 ml-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm font-semibold text-neutral-900 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ startDate: '', endDate: '', category: '', fromUserId: '', toUserId: '' })}
                className="px-5 py-2.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-xl transition-all"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {!isMasterAdmin && !isChapterAdmin ? (
          <>
            <div className="group relative bg-navy p-6 rounded-[20px] shadow-xl shadow-navy/20 overflow-hidden hover:-translate-y-1 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-xl group-hover:bg-emerald-500/20 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-5">
                  <TrendingUp size={24} />
                </div>
                <p className="text-xs font-semibold text-neutral-300 mb-2">Business Generated (Sent)</p>
                <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span className="text-emerald-500">₹</span>
                  {totalBusinessSent.toLocaleString()}
                </h2>
                <div className="flex items-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-xs font-medium text-neutral-300">{slips.length} slips submitted</p>
                </div>
              </div>
            </div>

            <div className="group relative bg-white p-6 rounded-[20px] border border-neutral-200/80 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all overflow-hidden hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-xl group-hover:bg-primary/10 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-5">
                  <Award size={24} />
                </div>
                <p className="text-xs font-semibold text-neutral-500 mb-2">Business Received</p>
                <h2 className="text-3xl font-bold text-neutral-900 tracking-tight flex items-center gap-1.5">
                  <span className="text-primary">₹</span>
                  {totalBusinessReceived.toLocaleString()}
                </h2>
                <div className="flex items-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <p className="text-xs font-medium text-neutral-500">{receivedSlips.length} slips received</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="group relative bg-navy p-6 rounded-[20px] shadow-xl shadow-navy/20 overflow-hidden hover:-translate-y-1 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-xl group-hover:bg-emerald-500/20 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-5">
                  <TrendingUp size={24} />
                </div>
                <p className="text-xs font-semibold text-neutral-300 mb-2">Total Generated</p>
                <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span className="text-emerald-500">₹</span>
                  {totalBusinessGenerated.toLocaleString()}
                </h2>
                <p className="text-xs font-medium text-neutral-300 mt-4">Network-wide business passed</p>
              </div>
            </div>

            <div className="group relative bg-white p-6 rounded-[20px] border border-neutral-200/80 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all overflow-hidden hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-xl group-hover:bg-primary/10 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-5">
                  <Award size={24} />
                </div>
                <p className="text-xs font-semibold text-neutral-500 mb-2">Total Received</p>
                <h2 className="text-3xl font-bold text-neutral-900 tracking-tight flex items-center gap-1.5">
                  <span className="text-primary">₹</span>
                  {totalBusinessReceivedFiltered.toLocaleString()}
                </h2>
                <p className="text-xs font-medium text-neutral-500 mt-4">Network-wide business received</p>
              </div>
            </div>

            <div className="group relative bg-white p-6 rounded-[20px] border border-neutral-200/80 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all overflow-hidden hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-xl group-hover:bg-amber-500/10 transition-colors duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-5">
                  <TrendingUp size={24} />
                </div>
                <p className="text-xs font-semibold text-neutral-500 mb-2">Network Volume</p>
                <h2 className="text-3xl font-bold text-neutral-900 tracking-tight flex items-center gap-1.5">
                  <span className="text-amber-500">₹</span>
                  {totalNetworkBusiness.toLocaleString()}
                </h2>
                <p className="text-xs font-medium text-neutral-500 mt-4">Total transaction volume</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tabs / Section Header */}
      {!isMasterAdmin && !isChapterAdmin ? (
        <div className="flex p-1.5 bg-neutral-100 rounded-xl w-full md:w-fit border border-neutral-200">
          <button
            onClick={() => setActiveTab('sent')}
            className={cn(
              "flex-1 md:flex-none px-8 py-2.5 rounded-lg text-xs font-semibold transition-all duration-300",
              activeTab === 'sent' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
            )}
          >
            Sent
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={cn(
              "flex-1 md:flex-none px-8 py-2.5 rounded-lg text-xs font-semibold transition-all duration-300",
              activeTab === 'received' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
            )}
          >
            Received
          </button>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-[20px] border border-neutral-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <div>
              <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                Business Activity Reports
              </h2>
              <p className="text-neutral-500 text-xs font-medium">Viewing all business activity across the network.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-bold border border-primary/20">
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
            <p className="text-xs font-bold text-neutral-400">Loading slips...</p>
          </div>
        ) : (activeTab === 'sent' ? slips : activeTab === 'received' ? receivedSlips : filteredSlips).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(activeTab === 'sent' ? slips : activeTab === 'received' ? receivedSlips : filteredSlips).map((slip) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={slip.id}
                className="group bg-white p-6 rounded-[20px] border border-neutral-200/80 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300",
                    activeTab === 'sent' ? "bg-emerald-50 text-emerald-600" : 
                    activeTab === 'received' ? "bg-primary/10 text-primary" : "bg-neutral-100 text-neutral-600"
                  )}>
                    {activeTab === 'sent' ? <TrendingUp size={20} /> : <Award size={20} />}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-neutral-500 block mb-1">
                      {format(new Date(slip.createdAt), 'dd MMM yyyy')}
                    </span>
                    {activeTab === 'all' && (
                      <span className="text-[11px] font-semibold text-primary bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10">
                        {allUsers.find(u => u.uid === slip.toUserId)?.category || 'General'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-neutral-500">Customer</p>
                    <p className="text-sm font-semibold text-neutral-900 truncate">{slip.customerName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-neutral-500">
                      {activeTab === 'sent' ? 'Referred To' : activeTab === 'received' ? 'Referred By' : 'Members'}
                    </p>
                    <div className="flex flex-col gap-1">
                      {activeTab === 'sent' 
                        ? (
                          <Link 
                            to={`/profile?id=${slip.fromUserId}`}
                            className="text-sm font-semibold text-neutral-900 hover:text-primary transition-colors truncate"
                          >
                            {memberNames[slip.fromUserId] || '...'}
                          </Link>
                        ) 
                        : activeTab === 'received'
                        ? (
                          <Link 
                            to={`/profile?id=${slip.toUserId}`}
                            className="text-sm font-semibold text-neutral-900 hover:text-primary transition-colors truncate"
                          >
                            {memberNames[slip.toUserId] || '...'}
                          </Link>
                        )
                        : (
                          <>
                            <Link 
                              to={`/profile?id=${slip.fromUserId}`}
                              className="text-xs font-medium text-neutral-900 hover:text-primary transition-colors truncate"
                            >
                              From: {memberNames[slip.fromUserId] || '...'}
                            </Link>
                            <Link 
                              to={`/profile?id=${slip.toUserId}`}
                              className="text-xs font-medium text-neutral-900 hover:text-primary transition-colors truncate"
                            >
                              To: {memberNames[slip.toUserId] || '...'}
                            </Link>
                          </>
                        )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-neutral-100">
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 mb-1">Business Value</p>
                    <p className="text-xl font-bold text-emerald-600 tracking-tight">
                      <span className="text-lg mr-1">₹</span>
                      {slip.businessValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right max-w-[50%]">
                    <p className="text-xs text-neutral-500 italic line-clamp-2 leading-relaxed">"{slip.notes || 'No notes provided'}"</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-32 text-center bg-white rounded-[18px] border border-dashed border-neutral-300 hover:border-neutral-400 transition-colors">
            <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6 text-neutral-300">
              {activeTab === 'sent' ? <TrendingUp size={40} /> : <Award size={40} />}
            </div>
            <h3 className="text-xl font-bold text-neutral-900 tracking-tight mb-2">
              {activeTab === 'sent' ? 'No slips sent yet' : 'No slips received yet'}
            </h3>
            <p className="text-neutral-500 text-sm font-medium max-w-md mx-auto">
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
          <div className="py-12 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">Slip Submitted!</h3>
            <p className="text-neutral-500 font-medium">Thank you for sharing your business success.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700">Select Referral</label>
            <select
              required
              value={formData.referralId}
              onChange={(e) => setFormData({ ...formData, referralId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-neutral-900"
            >
              <option value="">Choose a converted referral...</option>
              {referrals.map((r) => (
                <option key={r.id} value={r.id}>{r.contactName} - {r.requirement}</option>
              ))}
            </select>
            <p className="text-xs text-neutral-500">Only referrals marked as 'Converted' will appear here.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700">Customer Name</label>
            <input
              required
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="Who was the customer?"
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700">Transaction Value (₹)</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                <IndianRupee size={18} />
              </div>
              <input
                required
                type="number"
                value={formData.businessValue}
                onChange={(e) => setFormData({ ...formData, businessValue: e.target.value })}
                placeholder="0.00"
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700">Thank You Message (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Write a thank you message to the referrer..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all resize-none text-neutral-900 placeholder:text-neutral-400"
            />
            <p className="text-xs text-neutral-500 italic">This message will be visible to the member who provided the referral.</p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98] flex items-center justify-center gap-2 hover:-translate-y-0.5",
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
    </div>
  );
}
