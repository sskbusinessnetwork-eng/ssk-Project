export function deduplicateSlips<T extends Record<string, any>>(slips: T[]): T[] {
  if (!slips || !Array.isArray(slips)) return [];

  const byReferralMap = new Map<string, T>();
  const byIdMap = new Map<string, T>();
  const withoutReferral: T[] = [];

  for (const s of slips) {
    if (!s) continue;
    const refId = String(s.referral_id || s.referralId || '').trim();
    const slipId = String(s.id || '').trim();

    if (refId && refId !== 'null' && refId !== 'undefined' && refId !== 'N/A') {
      if (!byReferralMap.has(refId)) {
        byReferralMap.set(refId, s);
      } else {
        const refExisting = byReferralMap.get(refId)!;
        const refExistingTime = new Date(refExisting.created_at || refExisting.createdAt || 0).getTime();
        const refCurrentTime = new Date(s.created_at || s.createdAt || 0).getTime();
        if (refCurrentTime >= refExistingTime) {
          byReferralMap.set(refId, s);
        }
      }
    } else if (slipId) {
      if (!byIdMap.has(slipId)) {
        byIdMap.set(slipId, s);
      } else {
        const idExisting = byIdMap.get(slipId)!;
        const idExistingTime = new Date(idExisting.created_at || idExisting.createdAt || 0).getTime();
        const idCurrentTime = new Date(s.created_at || s.createdAt || 0).getTime();
        if (idCurrentTime >= idExistingTime) {
          byIdMap.set(slipId, s);
        }
      }
    } else {
      withoutReferral.push(s);
    }
  }

  const result = [
    ...Array.from(byReferralMap.values()),
    ...Array.from(byIdMap.values()),
    ...withoutReferral
  ];

  const finalMap = new Map<string, T>();
  for (const item of result) {
    const id = String(item.id || '').trim();
    if (id) {
      if (!finalMap.has(id)) {
        finalMap.set(id, item);
      }
    } else {
      finalMap.set(Math.random().toString(), item);
    }
  }

  return Array.from(finalMap.values()).sort((a, b) => {
    const tA = new Date(a.created_at || a.createdAt || 0).getTime();
    const tB = new Date(b.created_at || b.createdAt || 0).getTime();
    return tB - tA;
  });
}
