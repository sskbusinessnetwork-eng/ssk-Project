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
        const existing = byReferralMap.get(refId)!;
        const existingTime = new Date(existing.created_at || existing.createdAt || 0).getTime();
        const currentTime = new Date(s.created_at || s.createdAt || 0).getTime();
        if (currentTime >= existingTime) {
          byReferralMap.set(refId, s);
        }
      }
    } else if (slipId) {
      if (!byIdMap.has(slipId)) {
        byIdMap.set(slipId, s);
      } else {
        const existing = byIdMap.get(slipId)!;
        const existingTime = new Date(existing.created_at || existing.createdAt || 0).getTime();
        const currentTime = new Date(s.created_at || s.createdAt || 0).getTime();
        if (currentTime >= existingTime) {
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
