import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  PlusCircle,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Banknote,
  RefreshCw,
  Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { databaseService } from '../services/databaseService';
import { where } from '../lib/database';
import { UserProfile, WalletSummary, WalletTransaction, WalletTransactionType } from '../types';
import {
  canManageWallet,
  getCleanFullName,
  getDisplayPosition
} from '../utils/authUtils';
import {
  walletService,
  calculateWalletSummary,
  extractWalletTransactionsFromUserRow
} from '../services/walletService';
import { showError, showSuccess } from '../services/toastService';
import { cn } from '../lib/utils';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { safeFormat as format } from '../utils/dateUtils';

export function Wallet() {
  const { profile } = useAuth();
  const isAuthorizedManager = useMemo(() => canManageWallet(profile), [profile]);
  const currentUserId = String(profile?.uid || profile?.id || '').trim();
  const userChapId = String(profile?.chapter_id || (profile as any)?.chapterId || '').trim();

  // Tab state for authorized managers (defaults to My Wallet)
  const [walletTab, setWalletTab] = useState<'my-wallet' | 'manage-members'>('my-wallet');

  // State for chapter members (for authorized managers)
  const [chapterMembers, setChapterMembers] = useState<UserProfile[]>([]);
  const [memberWalletsMap, setMemberWalletsMap] = useState<Record<string, WalletSummary>>({});
  const [selectedMemberId, setSelectedMemberId] = useState<string>(currentUserId);
  const [myWallet, setMyWallet] = useState<WalletSummary>(() =>
    calculateWalletSummary(currentUserId, [])
  );

  // Searchable member dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Add Money / Wallet Update form state
  const [txType, setTxType] = useState<WalletTransactionType>('CREDIT');
  const [amountInput, setAmountInput] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'UPI' | 'CASH'>('UPI');
  const [txDate, setTxDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Selected transaction for Transaction Details modal
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const formatTxDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatPaymentMethodLabel = (method?: string) => {
    const m = String(method || '').toUpperCase();
    if (m === 'CASH') return 'Cash';
    if (m === 'WALLET') return 'Wallet';
    return 'UPI';
  };

  const getTransactionReason = (tx: WalletTransaction) => {
    if (tx.reason) return tx.reason;
    if (tx.meetingId || tx.paymentType === 'WALLET' || String(tx.description || '').toLowerCase().includes('meeting')) {
      return 'Meeting Contribution';
    }
    return tx.type === 'CREDIT' ? 'Wallet Deposit' : 'Wallet Adjustment';
  };

  const loadWalletData = async () => {
    if (!currentUserId) return;
    try {
      const ownSummary = await walletService.getMemberWallet(currentUserId);
      setMyWallet(ownSummary);

      if (isAuthorizedManager) {
        const constraints =
          profile?.role !== 'MASTER_ADMIN' && userChapId
            ? [where('chapter_id', '==', userChapId)]
            : [];
        const rawUsers = await databaseService.list<UserProfile>('users', constraints);
        const validMembers = (rawUsers || [])
          .filter((u: any) => {
            if (u.role === 'MASTER_ADMIN') return false;
            if (u.deleted === true || u.deleted === 'true' || u.status === 'DELETED') return false;
            if (profile?.role !== 'MASTER_ADMIN' && userChapId) {
              const uChap = String(u.chapter_id || u.chapterId || '').trim();
              if (uChap && uChap !== userChapId) return false;
            }
            return true;
          })
          .sort((a, b) => getCleanFullName(a.name).localeCompare(getCleanFullName(b.name)));

        setChapterMembers(validMembers);

        const walletsObj: Record<string, WalletSummary> = {};
        validMembers.forEach((m: any) => {
          const mId = String(m.id || m.uid || '');
          const txs = extractWalletTransactionsFromUserRow(m);
          walletsObj[mId] = calculateWalletSummary(mId, txs);
        });
        walletsObj[currentUserId] = ownSummary;
        setMemberWalletsMap(walletsObj);

        setSelectedMemberId(prev => {
          if (prev && validMembers.some(m => String(m.id || m.uid) === prev)) {
            return prev;
          }
          if (validMembers.some(m => String(m.id || m.uid) === currentUserId)) {
            return currentUserId;
          }
          return validMembers[0] ? String(validMembers[0].id || validMembers[0].uid) : currentUserId;
        });
      }
    } catch (err) {
      console.error('Error loading wallet data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();

    const handleWalletRefresh = () => {
      loadWalletData();
    };

    window.addEventListener('wallet-updated', handleWalletRefresh);
    window.addEventListener('dashboard-refresh', handleWalletRefresh);
    return () => {
      window.removeEventListener('wallet-updated', handleWalletRefresh);
      window.removeEventListener('dashboard-refresh', handleWalletRefresh);
    };
  }, [currentUserId, userChapId, isAuthorizedManager]);

  // Whenever selectedMemberId changes for an authorized manager, fetch fresh wallet from Supabase
  useEffect(() => {
    if (!isAuthorizedManager || !selectedMemberId) return;
    walletService.getMemberWallet(selectedMemberId).then((freshSummary) => {
      setMemberWalletsMap(prev => ({
        ...prev,
        [selectedMemberId]: freshSummary
      }));
      if (selectedMemberId === currentUserId) {
        setMyWallet(freshSummary);
      }
    }).catch(() => {});
  }, [selectedMemberId, isAuthorizedManager, currentUserId]);

  // Close member dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const effectiveTargetMemberId = isAuthorizedManager
    ? selectedMemberId || currentUserId
    : currentUserId;

  const selectedMemberProfile = useMemo(() => {
    if (!isAuthorizedManager) {
      return profile;
    }
    return (
      chapterMembers.find(m => String(m.id || m.uid) === String(effectiveTargetMemberId)) ||
      profile
    );
  }, [isAuthorizedManager, chapterMembers, effectiveTargetMemberId, profile]);

  const activeWalletSummary: WalletSummary = useMemo(() => {
    if (!isAuthorizedManager || walletTab === 'my-wallet') {
      return myWallet;
    }
    return (
      memberWalletsMap[effectiveTargetMemberId] ||
      calculateWalletSummary(effectiveTargetMemberId, [])
    );
  }, [isAuthorizedManager, walletTab, myWallet, memberWalletsMap, effectiveTargetMemberId]);

  const filteredDropdownMembers = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    if (!q) return chapterMembers;
    return chapterMembers.filter(m => {
      const name = getCleanFullName(m.name).toLowerCase();
      const phone = String(m.phone || '').toLowerCase();
      const pos = getDisplayPosition(m.position, m.role).toLowerCase();
      const cat = String(m.category || (m as any).business_category || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || pos.includes(q) || cat.includes(q);
    });
  }, [chapterMembers, memberSearchQuery]);

  // Single unified chronological Wallet Transaction History (newest first)
  const unifiedTransactions = useMemo(() => {
    return activeWalletSummary.transactions || [];
  }, [activeWalletSummary.transactions]);

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!isAuthorizedManager) {
      const msg = 'Only Chapter Admin, Treasurer, Vice President, or President can modify wallet balances.';
      setFormError(msg);
      showError(msg);
      return;
    }

    if (!selectedMemberId) {
      const msg = 'Please select a member.';
      setFormError(msg);
      showError(msg);
      return;
    }

    const parsedAmt = Number(amountInput);
    if (!amountInput || isNaN(parsedAmt) || parsedAmt <= 0) {
      const msg = 'Please enter a valid amount greater than ₹0.';
      setFormError(msg);
      showError(msg);
      return;
    }

    if (!txDate) {
      const msg = 'Please select a transaction date.';
      setFormError(msg);
      showError(msg);
      return;
    }

    setIsSaving(true);
    try {
      const targetMember = chapterMembers.find(
        m => String(m.id || m.uid) === String(selectedMemberId)
      );
      const updatedSummary = await walletService.addManualTransaction({
        caller: profile,
        memberId: selectedMemberId,
        memberName: targetMember ? getCleanFullName(targetMember.name) : undefined,
        chapterId: userChapId || targetMember?.chapter_id,
        type: txType,
        amount: parsedAmt,
        paymentType,
        date: txDate,
        description: description.trim()
      });

      setMemberWalletsMap(prev => ({
        ...prev,
        [selectedMemberId]: updatedSummary
      }));
      if (selectedMemberId === currentUserId) {
        setMyWallet(updatedSummary);
      }

      setAmountInput('');
      setDescription('');
      const actionWord = txType === 'CREDIT' ? 'credited to' : 'debited from';
      const successMsg = `₹${parsedAmt.toLocaleString()} ${actionWord} ${getCleanFullName(targetMember?.name || 'member')}'s wallet via ${paymentType}.`;
      setFormSuccess(successMsg);
      showSuccess(successMsg);
      setTimeout(() => setFormSuccess(null), 4000);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to update wallet.';
      setFormError(errMsg);
      showError(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      {/* Authorized Manager Segmented Tabs & Refresh Control */}
      {isAuthorizedManager ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="w-full sm:w-auto">
            <div className="grid grid-cols-2 p-1 bg-[#111827] border border-white/10 rounded-xl shadow-inner gap-1 w-full sm:w-[380px]">
              <button
                type="button"
                onClick={() => setWalletTab('my-wallet')}
                className={cn(
                  "py-2 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer select-none text-center",
                  walletTab === 'my-wallet'
                    ? "bg-[#1E293B] text-emerald-400 border border-emerald-500/30 shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent"
                )}
              >
                <WalletIcon size={14} className={cn("shrink-0", walletTab === 'my-wallet' ? "text-emerald-400" : "text-neutral-400")} />
                <span className="truncate">My Wallet</span>
              </button>

              <button
                type="button"
                onClick={() => setWalletTab('manage-members')}
                className={cn(
                  "py-2 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer select-none text-center",
                  walletTab === 'manage-members'
                    ? "bg-[#1E293B] text-emerald-400 border border-emerald-500/30 shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent"
                )}
              >
                <Users size={14} className={cn("shrink-0", walletTab === 'manage-members' ? "text-emerald-400" : "text-neutral-400")} />
                <span className="truncate">Manage Member Wallets</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadWalletData()}
            className="self-end sm:self-center p-2 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold px-3"
            title="Refresh Wallet Data"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-emerald-400' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      ) : (
        /* Regular Members Header & Refresh */
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            My Wallet
          </h1>
          <button
            type="button"
            onClick={() => loadWalletData()}
            className="p-2 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold px-3"
            title="Refresh Wallet Data"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-emerald-400' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      )}

      {/* View 1: Manage Member Wallets (Authorized Managers only) */}
      {isAuthorizedManager && walletTab === 'manage-members' ? (
        <div className="space-y-6">
          {/* Top Step 1: Select Member + Selected Member Available Balance */}
          <div className="bg-[#111827] border border-white/5 rounded-[20px] p-5 sm:p-6 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Searchable Select Member Dropdown */}
              <div className="lg:col-span-6 space-y-2" ref={dropdownRef}>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
                  Select Member
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(prev => !prev)}
                    className="w-full px-4 py-3.5 rounded-xl bg-[#151C2E] hover:bg-[#1A233A] border border-white/10 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={selectedMemberProfile?.photoURL}
                        name={getCleanFullName(selectedMemberProfile?.name)}
                        size="w-9 h-9"
                        className="rounded-xl shrink-0"
                        fallbackClassName="text-xs rounded-xl"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {getCleanFullName(selectedMemberProfile?.name) || 'Select Member'}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">
                          Category: {selectedMemberProfile?.category || (selectedMemberProfile as any)?.business_category || 'No Category'} · {getDisplayPosition(selectedMemberProfile?.position, selectedMemberProfile?.role)}
                          {selectedMemberProfile?.phone ? ` · ${selectedMemberProfile.phone}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-extrabold text-emerald-400 tabular-nums">
                        ₹{activeWalletSummary.availableBalance.toLocaleString()}
                      </span>
                      <ChevronDown size={16} className="text-neutral-400" />
                    </div>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-2 bg-[#0F172A] border border-white/15 rounded-xl shadow-2xl overflow-hidden">
                      <div className="p-3 border-b border-white/10 bg-[#151C2E] flex items-center gap-2">
                        <Search size={14} className="text-neutral-400 shrink-0" />
                        <input
                          type="text"
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          placeholder="Search member by name, role, or phone..."
                          className="w-full bg-transparent text-xs text-white placeholder-neutral-500 outline-none"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                        {filteredDropdownMembers.length > 0 ? (
                          filteredDropdownMembers.map((m) => {
                            const mId = String(m.id || m.uid);
                            const mSummary = memberWalletsMap[mId];
                            const bal = mSummary ? mSummary.availableBalance : 0;
                            const isSelected = mId === String(selectedMemberId);

                            return (
                              <button
                                key={mId}
                                type="button"
                                onClick={() => {
                                  setSelectedMemberId(mId);
                                  setIsDropdownOpen(false);
                                  setMemberSearchQuery('');
                                }}
                                className={cn(
                                  'w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-[#1E293B] transition-colors cursor-pointer',
                                  isSelected && 'bg-emerald-500/10'
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Avatar
                                    src={m.photoURL}
                                    name={getCleanFullName(m.name)}
                                    size="w-8 h-8"
                                    className="rounded-lg shrink-0"
                                    fallbackClassName="text-xs rounded-lg"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate">
                                      {getCleanFullName(m.name)}
                                    </p>
                                    <p className="text-[11px] text-neutral-400 truncate">
                                      Category: {m.category || (m as any).business_category || 'No Category'} · {getDisplayPosition(m.position, m.role)}
                                      {m.phone ? ` · ${m.phone}` : ''}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-emerald-400 tabular-nums shrink-0">
                                  ₹{bal.toLocaleString()}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-xs text-neutral-400">
                            No matching members found.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Member Available Balance Display */}
              <div className="lg:col-span-6">
                <div className="p-5 rounded-2xl bg-[#151C2E] border border-emerald-500/30 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Available Balance — {getCleanFullName(selectedMemberProfile?.name)}
                    </p>
                    <p className="text-3xl sm:text-4xl font-black text-emerald-400 mt-1 tabular-nums">
                      ₹{activeWalletSummary.availableBalance.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <WalletIcon size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid: Add Money to Wallet + Unified Wallet Transaction History */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Add Money / Update Wallet Form */}
            <div className="lg:col-span-5 bg-[#111827] border border-white/5 rounded-[20px] p-5 sm:p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <PlusCircle size={18} className="text-emerald-400" />
                  <h2 className="text-base font-bold text-white">Add Money / Update Wallet</h2>
                </div>
                <span className="text-xs text-neutral-400 font-medium">
                  {getCleanFullName(selectedMemberProfile?.name)}
                </span>
              </div>

              {formError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs font-semibold">
                  <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveTransaction} className="space-y-4">
                {/* Transaction Type — Credit / Debit */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 block">
                    Transaction Type
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setTxType('CREDIT')}
                      className={cn(
                        'py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer',
                        txType === 'CREDIT'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm'
                          : 'bg-[#151C2E] text-neutral-400 border-white/5 hover:text-white'
                      )}
                    >
                      <ArrowDownLeft size={15} />
                      Credit
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('DEBIT')}
                      className={cn(
                        'py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer',
                        txType === 'DEBIT'
                          ? 'bg-red-500/15 text-red-400 border-red-500/40 shadow-sm'
                          : 'bg-[#151C2E] text-neutral-400 border-white/5 hover:text-white'
                      )}
                    >
                      <ArrowUpRight size={15} />
                      Debit
                    </button>
                  </div>
                </div>

                {/* Amount & Payment Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 block">
                      Amount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Enter amount"
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#151C2E] border border-white/10 text-sm font-bold text-white placeholder-neutral-500 focus:border-emerald-500 outline-none tabular-nums"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 block">
                      Payment Type
                    </label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value as 'UPI' | 'CASH')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#151C2E] border border-white/10 text-sm font-bold text-white focus:border-emerald-500 outline-none cursor-pointer"
                    >
                      <option value="UPI" className="bg-[#111827] text-white">UPI</option>
                      <option value="CASH" className="bg-[#111827] text-white">Cash</option>
                    </select>
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 block">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#151C2E] border border-white/10 text-sm font-semibold text-white focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Description / Note (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 block">
                    Description / Note <span className="text-neutral-500 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <FileText size={15} className="absolute left-3.5 top-3 text-neutral-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={
                        txType === 'CREDIT'
                          ? 'Optional note for this deposit'
                          : 'Optional note for this debit'
                      }
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#151C2E] border border-white/10 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <button
                  type="submit"
                  disabled={isSaving}
                  className={cn(
                    'w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50',
                    txType === 'CREDIT'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20'
                      : 'bg-[#E53935] hover:bg-[#D32F2F] shadow-lg shadow-red-600/20'
                  )}
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <PlusCircle size={16} />
                      Save
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right: Selected Member's Wallet Transaction History */}
            <div className="lg:col-span-7 bg-[#111827] border border-white/5 rounded-[20px] p-5 sm:p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Wallet Transaction History
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {getCleanFullName(selectedMemberProfile?.name)} · Click any transaction for full details
                  </p>
                </div>
                <span className="text-xs font-bold text-neutral-400">
                  {unifiedTransactions.length} {unifiedTransactions.length === 1 ? 'Transaction' : 'Transactions'}
                </span>
              </div>

              {unifiedTransactions.length > 0 ? (
                <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-[#151C2E]/60 overflow-hidden">
                  {unifiedTransactions.map((tx) => {
                    const isCredit = tx.type === 'CREDIT';
                    const payLabel = formatPaymentMethodLabel(tx.paymentType);
                    const formattedDate = formatTxDate(tx.date);

                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => setSelectedTransaction(tx)}
                        className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-4 hover:bg-[#1E293B]/80 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                              isCredit
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                : 'bg-red-500/10 text-red-400 border-red-500/25'
                            )}
                          >
                            {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={cn(
                                'text-sm sm:text-base font-extrabold tabular-nums tracking-tight',
                                isCredit ? 'text-emerald-400' : 'text-red-400'
                              )}
                            >
                              {isCredit
                                ? `Credit +₹${Number(tx.amount || 0).toLocaleString()}`
                                : `Debit -₹${Number(tx.amount || 0).toLocaleString()}`}
                            </p>
                            <p className="text-xs text-neutral-400 font-medium mt-0.5">
                              {formattedDate} · {payLabel}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-neutral-400 group-hover:text-white transition-colors">
                          <span className="text-[11px] font-semibold hidden sm:inline">View Details</span>
                          <ChevronRight size={16} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center rounded-2xl bg-[#151C2E]/50 border border-dashed border-white/10">
                  <WalletIcon size={28} className="mx-auto text-neutral-500 mb-2.5" />
                  <p className="text-sm font-bold text-white">No wallet transactions found</p>
                  <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                    Add a credit or debit on the left to record wallet activity for this member.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* View 2: My Wallet (Shown first by default for everyone, including Chapter Admin, President, VP, Treasurer, and regular members) */
        <div className="space-y-6">
          {/* Prominent Available Balance Card */}
          <div className="p-6 rounded-[20px] bg-gradient-to-br from-[#111827] to-[#151C2E] border border-emerald-500/30 shadow-lg flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Available Balance
              </span>
              <p className="text-3xl sm:text-4xl font-black text-emerald-400 mt-1 tabular-nums">
                ₹{myWallet.availableBalance.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-400 mt-1.5">
                Available for chapter meeting contributions
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
              <WalletIcon size={28} />
            </div>
          </div>

          {/* Own Wallet Transaction History */}
          <div className="bg-[#111827] border border-white/5 rounded-[20px] p-5 sm:p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Wallet Transaction History
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Click any transaction to view full details
                </p>
              </div>
              <span className="text-xs font-bold text-neutral-400">
                {myWallet.transactions.length} {myWallet.transactions.length === 1 ? 'Transaction' : 'Transactions'}
              </span>
            </div>

            {myWallet.transactions.length > 0 ? (
              <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-[#151C2E]/60 overflow-hidden">
                {myWallet.transactions.map((tx) => {
                  const isCredit = tx.type === 'CREDIT';
                  const payLabel = formatPaymentMethodLabel(tx.paymentType);
                  const formattedDate = formatTxDate(tx.date);

                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => setSelectedTransaction(tx)}
                      className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-4 hover:bg-[#1E293B]/80 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                            isCredit
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                              : 'bg-red-500/10 text-red-400 border-red-500/25'
                          )}
                        >
                          {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              'text-sm sm:text-base font-extrabold tabular-nums tracking-tight',
                              isCredit ? 'text-emerald-400' : 'text-red-400'
                            )}
                          >
                            {isCredit
                              ? `Credit +₹${Number(tx.amount || 0).toLocaleString()}`
                              : `Debit -₹${Number(tx.amount || 0).toLocaleString()}`}
                          </p>
                          <p className="text-xs text-neutral-400 font-medium mt-0.5">
                            {formattedDate} · {payLabel}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-neutral-400 group-hover:text-white transition-colors">
                        <span className="text-[11px] font-semibold hidden sm:inline">View Details</span>
                        <ChevronRight size={16} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center rounded-2xl bg-[#151C2E]/50 border border-dashed border-white/10">
                <WalletIcon size={28} className="mx-auto text-neutral-500 mb-2.5" />
                <p className="text-sm font-bold text-white">No wallet transactions found</p>
                <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                  Your wallet deposits and meeting deductions will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      <Modal
        isOpen={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransaction(null)}
        title="Transaction Details"
      >
        {selectedTransaction && (() => {
          const isCredit = selectedTransaction.type === 'CREDIT';
          const reasonText = getTransactionReason(selectedTransaction);
          const payMethodLabel = formatPaymentMethodLabel(selectedTransaction.paymentType);
          const isMeetingContribution =
            Boolean(selectedTransaction.meetingId || selectedTransaction.meetingDate) ||
            reasonText === 'Meeting Contribution';
          const meetingDateDisplay = selectedTransaction.meetingDate || selectedTransaction.date;

          return (
            <div className="space-y-5">
              {/* Top Amount & Type Highlight */}
              <div
                className={cn(
                  'p-5 rounded-2xl border flex items-center justify-between gap-4',
                  isCredit
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                )}
              >
                <div>
                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider',
                      isCredit ? 'text-emerald-400' : 'text-red-400'
                    )}
                  >
                    {isCredit ? 'Credit' : 'Debit'}
                  </span>
                  <p
                    className={cn(
                      'text-2xl sm:text-3xl font-black mt-0.5 tabular-nums',
                      isCredit ? 'text-emerald-400' : 'text-red-400'
                    )}
                  >
                    {isCredit ? '+' : '-'}₹{Number(selectedTransaction.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0',
                    isCredit
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/15 text-red-400 border-red-500/30'
                  )}
                >
                  {isCredit ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}
                </div>
              </div>

              {/* Detail Fields */}
              <div className="bg-[#151C2E] rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-neutral-400">Type</span>
                  <span
                    className={cn(
                      'text-sm font-bold',
                      isCredit ? 'text-emerald-400' : 'text-red-400'
                    )}
                  >
                    {isCredit ? 'Credit' : 'Debit'}
                  </span>
                </div>

                <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-neutral-400">Amount</span>
                  <span className="text-sm font-bold text-white tabular-nums">
                    ₹{Number(selectedTransaction.amount || 0).toLocaleString()}
                  </span>
                </div>

                <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-neutral-400">Payment Date</span>
                  <span className="text-sm font-bold text-white">
                    {formatTxDate(selectedTransaction.date)}
                  </span>
                </div>

                <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-neutral-400">For</span>
                  <span className="text-sm font-bold text-white">
                    {reasonText}
                  </span>
                </div>

                <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-neutral-400">Payment Method</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
                    {selectedTransaction.paymentType === 'UPI' && <CreditCard size={14} className="text-blue-400" />}
                    {selectedTransaction.paymentType === 'CASH' && <Banknote size={14} className="text-amber-400" />}
                    {selectedTransaction.paymentType === 'WALLET' && <WalletIcon size={14} className="text-emerald-400" />}
                    {payMethodLabel}
                  </span>
                </div>

                {isMeetingContribution && (
                  <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold text-neutral-400">Meeting Date</span>
                    <span className="text-sm font-bold text-white">
                      {formatTxDate(meetingDateDisplay)}
                    </span>
                  </div>
                )}

                {selectedTransaction.description && (
                  <div className="px-4 py-3.5 flex flex-col gap-1">
                    <span className="text-xs font-semibold text-neutral-400">Description / Note</span>
                    <span className="text-sm font-medium text-neutral-200">
                      {selectedTransaction.description}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="w-full py-3 rounded-xl bg-[#151C2E] hover:bg-[#1E293B] border border-white/10 text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
