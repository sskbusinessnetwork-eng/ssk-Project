const fs = require('fs');
const file = 'src/components/MemberCompanionView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the old useMemo for revenuePoints etc with the new calculations.

const searchMemo = `  const { revenuePoints, referralsPoints, areaPoints, maxRevenue, maxReferrals, latestRevenue } = React.useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Filter to current month slips
    const monthlySlips = allSlips.filter(s => {
      const d = new Date(s.createdAt || s.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    // Filter to current month referrals
    const monthlyRefs = allReferrals.filter(r => {
      const d = new Date(r.createdAt || r.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });`;

const newMemo = `  const { revenuePoints, referralsPoints, areaPoints, maxRevenue, maxReferrals, latestRevenue, userBusinessStats } = React.useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const userId = profile?.uid || profile?.id || '';

    // Filter to only the user's data
    const userSlips = allSlips.filter(s => s.fromUserId === userId || s.toUserId === userId);
    const userRefs = allReferrals.filter(r => r.fromUserId === userId || r.toUserId === userId);

    // Business Analytics Calculations
    let businessSent = 0;
    let businessReceived = 0;
    let thisMonthBusiness = 0;
    let todayBusiness = 0;

    const todayStr = now.toDateString();

    userSlips.forEach(s => {
      const val = Number(s.businessValue || s.transactionValue) || 0;
      const d = new Date(s.createdAt || s.date);
      
      if (s.fromUserId === userId) businessSent += val;
      if (s.toUserId === userId) businessReceived += val;
      
      const isThisMonth = d.getFullYear() === year && d.getMonth() === month;
      if (isThisMonth) {
        if (s.fromUserId === userId || s.toUserId === userId) {
           thisMonthBusiness += val;
        }
      }

      if (d.toDateString() === todayStr) {
        if (s.fromUserId === userId || s.toUserId === userId) {
           todayBusiness += val;
        }
      }
    });

    const totalBusiness = businessSent + businessReceived;

    const userBusinessStats = {
      businessSent,
      businessReceived,
      totalBusiness,
      thisMonthBusiness,
      todayBusiness
    };

    // Filter to current month slips for the chart (ONLY user's)
    const monthlySlips = userSlips.filter(s => {
      const d = new Date(s.createdAt || s.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    // Filter to current month referrals for the chart (ONLY user's)
    const monthlyRefs = userRefs.filter(r => {
      const d = new Date(r.createdAt || r.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });`;

content = content.replace(searchMemo, newMemo);

// Replace the grid display
const searchGrid = `<div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5 text-center md:text-left">
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Revenue</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">
              {memberRevenue >= 100000 ? \`₹\${(memberRevenue / 100000).toFixed(2)}L\` : \`₹\${memberRevenue.toLocaleString('en-IN')}\`}
            </div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> Dynamic</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Referrals</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">{memberReferrals}</div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> Dynamic</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Deals</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">{memberDeals} Clsd</div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> Dynamic</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Attend</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">{memberAttendance}%</div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> Dynamic</span>
          </div>
        </div>`;

const newGrid = `<div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-white/5 text-center md:text-left">
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Business Sent</span>
            <div className="text-[15px] font-extrabold text-white leading-tight">
              {userBusinessStats.businessSent >= 100000 ? \`₹\${(userBusinessStats.businessSent / 100000).toFixed(2)}L\` : \`₹\${Math.round(userBusinessStats.businessSent).toLocaleString('en-IN')}\`}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Business Received</span>
            <div className="text-[15px] font-extrabold text-white leading-tight">
              {userBusinessStats.businessReceived >= 100000 ? \`₹\${(userBusinessStats.businessReceived / 100000).toFixed(2)}L\` : \`₹\${Math.round(userBusinessStats.businessReceived).toLocaleString('en-IN')}\`}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Total Business</span>
            <div className="text-[15px] font-extrabold text-white leading-tight">
              {userBusinessStats.totalBusiness >= 100000 ? \`₹\${(userBusinessStats.totalBusiness / 100000).toFixed(2)}L\` : \`₹\${Math.round(userBusinessStats.totalBusiness).toLocaleString('en-IN')}\`}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">This Month</span>
            <div className="text-[15px] font-extrabold text-white leading-tight">
              {userBusinessStats.thisMonthBusiness >= 100000 ? \`₹\${(userBusinessStats.thisMonthBusiness / 100000).toFixed(2)}L\` : \`₹\${Math.round(userBusinessStats.thisMonthBusiness).toLocaleString('en-IN')}\`}
            </div>
          </div>
          {userBusinessStats.todayBusiness > 0 && (
            <div>
              <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Today's Business</span>
              <div className="text-[15px] font-extrabold text-white leading-tight">
                {userBusinessStats.todayBusiness >= 100000 ? \`₹\${(userBusinessStats.todayBusiness / 100000).toFixed(2)}L\` : \`₹\${Math.round(userBusinessStats.todayBusiness).toLocaleString('en-IN')}\`}
              </div>
            </div>
          )}
        </div>`;

content = content.replace(searchGrid, newGrid);

// Also replace the header of Business Overview
const searchHeader = `{chapterName ? \`\${chapterName} Business Overview\` : 'Business Overview'}`;
const newHeader = `'Business Overview'`;
content = content.replace(searchHeader, newHeader);

fs.writeFileSync(file, content);
