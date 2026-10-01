import { supabase } from '../lib/supabaseClient';
import { WalletPaymentType, WalletSummary, WalletTransaction, WalletTransactionType } from '../types';
import { canManageWallet, getCleanFullName, getDisplayPosition } from '../utils/authUtils';

function normalizeTransaction(raw: any, fallbackMemberId: string): WalletTransaction | null {
  if (!raw || typeof raw !== 'object') return null;
  const amount = Number(raw.amount);
  if (isNaN(amount) || amount <= 0) return null;

  const rawType = String(raw.type || 'CREDIT').trim().toUpperCase();
  const type: WalletTransactionType = rawType === 'DEBIT' ? 'DEBIT' : 'CREDIT';

  const rawPay = String(raw.paymentType || raw.payment_type || (type === 'DEBIT' && raw.meetingId ? 'WALLET' : 'UPI')).trim().toUpperCase();
  const paymentType: WalletPaymentType =
    rawPay === 'CASH' ? 'CASH' : rawPay === 'WALLET' ? 'WALLET' : 'UPI';

  const dateStr = raw.date || (raw.createdAt ? String(raw.createdAt).split('T')[0] : new Date().toISOString().split('T')[0]);
  const createdAtStr = raw.createdAt || raw.created_at || new Date().toISOString();
  const meetingIdVal = raw.meetingId || raw.meeting_id ? String(raw.meetingId || raw.meeting_id) : undefined;
  const isMeetingTx = Boolean(meetingIdVal || rawPay === 'WALLET' || String(raw.description || '').toLowerCase().includes('meeting'));
  const resolvedReason =
    raw.reason ||
    (isMeetingTx ? 'Meeting Contribution' : type === 'CREDIT' ? 'Wallet Deposit' : 'Wallet Adjustment');
  const resolvedMeetingDate =
    raw.meetingDate || raw.meeting_date || (isMeetingTx ? dateStr : undefined);

  return {
    id: String(raw.id || `wtx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    memberId: String(raw.memberId || raw.member_id || fallbackMemberId),
    memberName: raw.memberName || raw.member_name || undefined,
    chapterId: raw.chapterId || raw.chapter_id || undefined,
    type,
    amount,
    paymentType,
    date: dateStr,
    reason: String(resolvedReason),
    description: raw.description !== undefined ? String(raw.description) : '',
    meetingId: meetingIdVal,
    meetingDate: resolvedMeetingDate ? String(resolvedMeetingDate) : undefined,
    createdBy: raw.createdBy || raw.created_by || undefined,
    createdByName: raw.createdByName || raw.created_by_name || undefined,
    createdByRole: raw.createdByRole || raw.created_by_role || undefined,
    createdAt: createdAtStr
  };
}

export function extractWalletTransactionsFromUserRow(userRow: any): WalletTransaction[] {
  if (!userRow) return [];
  const memberId = String(userRow.id || userRow.uid || '');
  let rawList: any[] | null = null;

  if (Array.isArray(userRow.walletTransactions)) {
    rawList = userRow.walletTransactions;
  } else if (Array.isArray(userRow.wallet_transactions)) {
    rawList = userRow.wallet_transactions;
  }

  const photoStr = String(userRow.profile_photo || userRow.photoURL || '').trim();
  if (!rawList && photoStr.startsWith('{')) {
    try {
      const parsed = JSON.parse(photoStr);
      const extra = parsed?.extra || {};
      const fromExtra = extra.wallet_transactions || extra.walletTransactions;
      if (Array.isArray(fromExtra)) {
        rawList = fromExtra;
      }
    } catch {
      // ignore malformed JSON
    }
  } else if (!rawList && photoStr.includes('|||')) {
    try {
      const extra = JSON.parse(photoStr.split('|||')[1] || '{}');
      const fromExtra = extra.wallet_transactions || extra.walletTransactions;
      if (Array.isArray(fromExtra)) {
        rawList = fromExtra;
      }
    } catch {
      // ignore malformed JSON
    }
  }

  if (!Array.isArray(rawList)) return [];

  const seenIds = new Set<string>();
  const normalized: WalletTransaction[] = [];
  for (const item of rawList) {
    const tx = normalizeTransaction(item, memberId);
    if (tx && !seenIds.has(tx.id)) {
      seenIds.add(tx.id);
      normalized.push(tx);
    }
  }

  // Sort newest first by date, then by createdAt
  normalized.sort((a, b) => {
    const dCmp = String(b.date || '').localeCompare(String(a.date || ''));
    if (dCmp !== 0) return dCmp;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });

  return normalized;
}

export function calculateWalletSummary(memberId: string, rawTransactions: WalletTransaction[]): WalletSummary {
  const seen = new Set<string>();
  const transactions: WalletTransaction[] = [];

  for (const t of rawTransactions || []) {
    const norm = normalizeTransaction(t, memberId);
    if (norm && !seen.has(norm.id)) {
      seen.add(norm.id);
      transactions.push(norm);
    }
  }

  transactions.sort((a, b) => {
    const dCmp = String(b.date || '').localeCompare(String(a.date || ''));
    if (dCmp !== 0) return dCmp;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });

  let totalCredits = 0;
  let totalDebits = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'CREDIT') {
      totalCredits += amt;
    } else if (tx.type === 'DEBIT') {
      totalDebits += amt;
    }
  }

  const availableBalance = Math.max(0, totalCredits - totalDebits);
  const depositHistory = transactions.filter(t => t.type === 'CREDIT');

  return {
    memberId,
    availableBalance,
    totalCredits,
    totalDebits,
    transactions,
    depositHistory
  };
}

export const walletService = {
  /**
   * Synchronously compute a member's wallet summary from a user row/object
   */
  getMemberWalletSummary(userRow: any): WalletSummary {
    const memberId = String(userRow?.id || userRow?.uid || '');
    const txs = extractWalletTransactionsFromUserRow(userRow);
    return calculateWalletSummary(memberId, txs);
  },

  /**
   * Fetch a single member's live wallet summary & transactions from Supabase
   */
  async getMemberWallet(memberId: string): Promise<WalletSummary> {
    if (!memberId) {
      return calculateWalletSummary('', []);
    }
    const cleanId = String(memberId).trim();
    const { data: userRow, error } = await supabase
      .from('users')
      .select('id, uid, name, role, position, chapter_id, profile_photo')
      .or(`id.eq.${cleanId},uid.eq.${cleanId}`)
      .maybeSingle();

    if (error || !userRow) {
      return calculateWalletSummary(cleanId, []);
    }

    const txs = extractWalletTransactionsFromUserRow(userRow);
    return calculateWalletSummary(String(userRow.id || userRow.uid || cleanId), txs);
  },

  /**
   * Persist a member's wallet transaction list and recalculated balance to Supabase
   */
  async saveMemberWalletTransactions(
    memberId: string,
    transactions: WalletTransaction[],
    callerId?: string
  ): Promise<WalletSummary> {
    const cleanId = String(memberId).trim();
    const summary = calculateWalletSummary(cleanId, transactions);

    // 1. Fetch current profile_photo from Supabase so we never lose other extra fields
    const { data: memberRow, error: fetchErr } = await supabase
      .from('users')
      .select('id, uid, profile_photo')
      .or(`id.eq.${cleanId},uid.eq.${cleanId}`)
      .maybeSingle();

    if (fetchErr || !memberRow) {
      throw new Error(fetchErr?.message || 'Member record not found in Supabase.');
    }

    let photoUrl = '';
    let extraData: Record<string, any> = {};
    const existingPhoto = String(memberRow.profile_photo || '').trim();
    if (existingPhoto.startsWith('{')) {
      try {
        const parsed = JSON.parse(existingPhoto);
        if (parsed && typeof parsed === 'object') {
          photoUrl = parsed.url || '';
          extraData = parsed.extra && typeof parsed.extra === 'object' ? { ...parsed.extra } : {};
        }
      } catch {
        extraData = {};
      }
    } else if (existingPhoto.includes('|||')) {
      const parts = existingPhoto.split('|||');
      photoUrl = parts[0] || '';
      try {
        extraData = JSON.parse(parts[1] || '{}');
      } catch {
        extraData = {};
      }
    } else {
      photoUrl = existingPhoto;
    }

    extraData.wallet_transactions = summary.transactions;
    extraData.walletTransactions = summary.transactions;
    extraData.wallet_balance = summary.availableBalance;
    extraData.walletBalance = summary.availableBalance;

    const newProfilePhoto = JSON.stringify({ url: photoUrl, extra: extraData });

    // 2. Try direct Supabase update first
    let persisted = false;
    const { error: directUpdateErr } = await supabase
      .from('users')
      .update({
        profile_photo: newProfilePhoto,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberRow.id);

    if (!directUpdateErr) {
      persisted = true;
    }

    // 3. Also call backend /api/wallet/update if callerId is provided or if direct update had an error
    if (!persisted && callerId) {
      const res = await fetch('/api/wallet/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerId,
          memberId: memberRow.id,
          walletTransactions: summary.transactions,
          walletBalance: summary.availableBalance
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || directUpdateErr?.message || 'Failed to save wallet update to Supabase.');
      }
      persisted = true;
    }

    if (!persisted && directUpdateErr) {
      throw new Error(directUpdateErr.message || 'Failed to save wallet update to Supabase.');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wallet-updated', { detail: { memberId: cleanId, summary } }));
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    }

    return summary;
  },

  /**
   * Add a manual Credit or Debit transaction to a member's wallet (Authorized Chapter Leaders only)
   */
  async addManualTransaction(params: {
    caller: any;
    memberId: string;
    memberName?: string;
    chapterId?: string;
    type: WalletTransactionType;
    amount: number;
    paymentType: 'UPI' | 'CASH';
    date: string;
    description?: string;
  }): Promise<WalletSummary> {
    const { caller, memberId, memberName, chapterId, type, amount, paymentType, date, description } = params;

    if (!canManageWallet(caller)) {
      throw new Error('Only Chapter Admin, Treasurer, Vice President, or President can modify wallet balances.');
    }

    if (!memberId) {
      throw new Error('Please select a member.');
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Please enter a valid amount greater than 0.');
    }

    if (paymentType !== 'UPI' && paymentType !== 'CASH') {
      throw new Error('Please select a valid payment type (UPI or Cash).');
    }

    if (!date || !String(date).trim()) {
      throw new Error('Please select a transaction date.');
    }

    // Fetch existing transactions from Supabase so we append without overwriting
    const currentWallet = await this.getMemberWallet(memberId);

    if (type === 'DEBIT' && numericAmount > currentWallet.availableBalance) {
      throw new Error(`Insufficient wallet balance. Available balance: ₹${currentWallet.availableBalance}.`);
    }

    const callerId = String(caller?.uid || caller?.id || '');
    const callerName = getCleanFullName(caller?.name || caller?.displayName || 'Chapter Leader');
    const callerRole = getDisplayPosition(caller?.position, caller?.role);

    const newTx: WalletTransaction = {
      id: `wtx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      memberId: String(memberId),
      memberName: memberName ? getCleanFullName(memberName) : undefined,
      chapterId: chapterId || caller?.chapter_id || caller?.chapterId || undefined,
      type,
      amount: numericAmount,
      paymentType,
      date: String(date).trim(),
      reason: type === 'CREDIT' ? 'Wallet Deposit' : 'Wallet Adjustment',
      description: description?.trim() || '',
      createdBy: callerId,
      createdByName: callerName,
      createdByRole: callerRole,
      createdAt: new Date().toISOString()
    };

    const updatedTxs = [newTx, ...currentWallet.transactions];
    return await this.saveMemberWalletTransactions(memberId, updatedTxs, callerId);
  },

  /**
   * Validate and synchronize member wallet deductions during Meeting Update:
   * - Checks all members paying with WALLET for sufficient balance first (atomic pre-check)
   * - Prevents duplicate deductions when editing/saving the same meeting again
   * - Reverses previous Wallet debit if payment method changed from WALLET to UPI/CASH or NOT PAID/Absent
   */
  async validateAndSyncMeetingWalletPayments(params: {
    meetingId: string;
    meetingDate: string;
    meetingTitle?: string;
    chapterId?: string;
    meetingMembers?: any[];
    chapterMembers?: any[];
    attendance?: Record<string, string>;
    attendanceMap?: Record<string, string>;
    paymentStatus?: Record<string, string>;
    paymentStatusMap?: Record<string, string>;
    paymentMethods?: Record<string, string>;
    paymentMethodsMap?: Record<string, string>;
    amountCollected?: Record<string, number>;
    amountCollectedMap?: Record<string, number>;
    configuredMeetingAmount?: number;
    caller?: any;
    callerProfile?: any;
  }): Promise<{
    valid: boolean;
    error?: string;
    errorMessage?: string;
    updatedBalances: Record<string, number>;
  }> {
    const meetingId = params.meetingId;
    const meetingDate = params.meetingDate;
    const chapterId = params.chapterId;
    const meetingMembers = params.meetingMembers || params.chapterMembers || [];
    const attendance = params.attendance || params.attendanceMap || {};
    const paymentStatus = params.paymentStatus || params.paymentStatusMap || {};
    const paymentMethods = params.paymentMethods || params.paymentMethodsMap || {};
    const amountCollected = params.amountCollected || params.amountCollectedMap || {};
    const caller = params.caller || params.callerProfile;
    const configuredAmt = Number(params.configuredMeetingAmount) || 0;

    const cleanMeetingId = String(meetingId || '').trim();
    if (!cleanMeetingId) {
      return { valid: true, updatedBalances: {} };
    }

    const callerId = String(caller?.uid || caller?.id || '');
    const callerName = getCleanFullName(caller?.name || caller?.displayName || 'Chapter Admin');
    const callerRole = getDisplayPosition(caller?.position, caller?.role);

    // Fetch fresh wallet data for all chapter members from Supabase
    const memberIds = meetingMembers
      .map(m => String(m.id || m.uid || '').trim())
      .filter(Boolean);

    const memberWalletsMap = new Map<string, { member: any; summary: WalletSummary }>();
    await Promise.all(
      meetingMembers.map(async (member) => {
        const mId = String(member.id || member.uid || '').trim();
        if (!mId) return;
        const summary = await this.getMemberWallet(mId);
        memberWalletsMap.set(mId, { member, summary });
      })
    );

    // Phase 1: Validate all members who have WALLET selected as payment method
    for (const mId of memberIds) {
      const entry = memberWalletsMap.get(mId);
      if (!entry) continue;

      const att = String(attendance[mId] || '').trim().toUpperCase();
      const isAttended = ['PRESENT', 'SUBSTITUTE', 'LATE', 'YES'].includes(att);
      const pStatus = String(paymentStatus[mId] || 'NOT PAID').trim().toUpperCase();
      const pMethod = String(paymentMethods[mId] || '').trim().toUpperCase();
      const requiredAmount = Number(amountCollected[mId]) || configuredAmt || 0;

      if (isAttended && pStatus === 'PAID' && pMethod === 'WALLET') {
        const existingMeetingDebit = entry.summary.transactions.find(
          tx => String(tx.meetingId || '') === cleanMeetingId && tx.type === 'DEBIT'
        );
        const previousDeductionForThisMeeting = existingMeetingDebit ? (Number(existingMeetingDebit.amount) || 0) : 0;
        const effectiveAvailableBalance = entry.summary.availableBalance + previousDeductionForThisMeeting;

        if (effectiveAvailableBalance < requiredAmount) {
          const errMsg = `Insufficient wallet balance. Available balance: ₹${effectiveAvailableBalance}.`;
          return {
            valid: false,
            error: errMsg,
            errorMessage: errMsg,
            updatedBalances: {}
          };
        }
      }
    }

    // Phase 2: Perform deductions, in-place updates, or reversals per member
    const updatedBalances: Record<string, number> = {};

    for (const mId of memberIds) {
      const entry = memberWalletsMap.get(mId);
      if (!entry) continue;

      const att = String(attendance[mId] || '').trim().toUpperCase();
      const isAttended = ['PRESENT', 'SUBSTITUTE', 'LATE', 'YES'].includes(att);
      const pStatus = String(paymentStatus[mId] || 'NOT PAID').trim().toUpperCase();
      const pMethod = String(paymentMethods[mId] || '').trim().toUpperCase();
      const requiredAmount = Number(amountCollected[mId]) || configuredAmt || 0;

      const shouldHaveWalletDebit = isAttended && pStatus === 'PAID' && pMethod === 'WALLET' && requiredAmount > 0;
      const existingTxs = entry.summary.transactions;
      const existingMeetingDebits = existingTxs.filter(
        tx => String(tx.meetingId || '') === cleanMeetingId && tx.type === 'DEBIT'
      );

      if (shouldHaveWalletDebit) {
        if (existingMeetingDebits.length === 1 && Number(existingMeetingDebits[0].amount) === requiredAmount) {
          // Exact deduction already exists for this meeting — do NOT deduct again
          updatedBalances[mId] = entry.summary.availableBalance;
          continue;
        }

        // Remove any prior debit record for this meeting and insert a single accurate debit record
        const otherTxs = existingTxs.filter(
          tx => !(String(tx.meetingId || '') === cleanMeetingId && tx.type === 'DEBIT')
        );

        const deductionTx: WalletTransaction = {
          id: existingMeetingDebits[0]?.id || `mtg_debit_${cleanMeetingId}_${mId}`,
          memberId: mId,
          memberName: getCleanFullName(entry.member?.name || entry.member?.displayName || 'Member'),
          chapterId: chapterId || entry.member?.chapter_id || entry.member?.chapterId || undefined,
          type: 'DEBIT',
          amount: requiredAmount,
          paymentType: 'WALLET',
          date: meetingDate || new Date().toISOString().split('T')[0],
          reason: 'Meeting Contribution',
          description: params.meetingTitle ? `${params.meetingTitle}` : '',
          meetingId: cleanMeetingId,
          meetingDate: meetingDate || new Date().toISOString().split('T')[0],
          createdBy: callerId,
          createdByName: callerName,
          createdByRole: callerRole,
          createdAt: existingMeetingDebits[0]?.createdAt || new Date().toISOString()
        };

        const savedSummary = await this.saveMemberWalletTransactions(
          mId,
          [deductionTx, ...otherTxs],
          callerId
        );
        updatedBalances[mId] = savedSummary.availableBalance;
      } else if (existingMeetingDebits.length > 0) {
        // Payment changed from WALLET to UPI/CASH or NOT PAID or Absent -> reverse previous Wallet debit!
        const remainingTxs = existingTxs.filter(
          tx => !(String(tx.meetingId || '') === cleanMeetingId && tx.type === 'DEBIT')
        );
        const savedSummary = await this.saveMemberWalletTransactions(
          mId,
          remainingTxs,
          callerId
        );
        updatedBalances[mId] = savedSummary.availableBalance;
      } else {
        updatedBalances[mId] = entry.summary.availableBalance;
      }
    }

    return {
      valid: true,
      updatedBalances
    };
  },

  /**
   * Reverse any wallet debits associated with a cancelled meeting
   */
  async reverseAllMeetingWalletDeductions(
    meetingId: string,
    meetingMembersOrCaller?: any,
    callerId?: string
  ): Promise<void> {
    const cleanMeetingId = String(meetingId || '').trim();
    if (!cleanMeetingId) return;

    let membersList: any[] = [];
    let resolvedCallerId = callerId;

    if (Array.isArray(meetingMembersOrCaller)) {
      membersList = meetingMembersOrCaller;
    } else {
      resolvedCallerId = String(meetingMembersOrCaller?.uid || meetingMembersOrCaller?.id || callerId || '');
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, uid, profile_photo');
      membersList = allUsers || [];
    }

    for (const member of membersList) {
      const mId = String(member.id || member.uid || '').trim();
      if (!mId) continue;
      try {
        const wallet = await this.getMemberWallet(mId);
        const hasMeetingDebit = wallet.transactions.some(
          tx => String(tx.meetingId || '') === cleanMeetingId && tx.type === 'DEBIT'
        );
        if (hasMeetingDebit) {
          const remaining = wallet.transactions.filter(
            tx => !(String(tx.meetingId || '') === cleanMeetingId && tx.type === 'DEBIT')
          );
          await this.saveMemberWalletTransactions(mId, remaining, resolvedCallerId);
        }
      } catch (err) {
        console.warn('Error reversing wallet debit on meeting cancel for member', mId, err);
      }
    }
  }
};
