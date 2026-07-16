import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# I will replace the hero section
start_marker = "{/* 1. PERSONALIZED WELCOME BANNER (Premium Dashboard Hero) */}"
end_marker = "{/* Premium Animated StatGrid (Dynamic Live Data / High-Value Fallbacks) */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    hero_replacement = """{/* 1. PERSONALIZED WELCOME BANNER (Premium Dashboard Hero) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white border border-neutral-200 rounded-[32px] p-6 md:p-8 lg:p-10 relative overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.04)] flex flex-col justify-center min-h-[340px]"
      >
        {/* Subtle animated gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-50/50 to-white pointer-events-none" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/[0.03] rounded-full blur-[100px] animate-float pointer-events-none" />
        <div className="absolute -bottom-[200px] -left-[200px] w-[600px] h-[600px] bg-neutral-100/50 rounded-full blur-[80px] animate-float-delayed pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full relative z-10">
          
          {/* Welcome Text & Navigation Tabs */}
          <div className="lg:col-span-5 space-y-8 flex flex-col justify-center h-full text-center lg:text-left items-center lg:items-start w-full">
            <div className="space-y-3">
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-[14px] font-semibold uppercase tracking-[0.2em] text-neutral-500 block"
              >
                {getGreeting()},
              </motion.span>
              <motion.h2 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-[40px] md:text-[48px] font-semibold text-[#111827] tracking-tight flex items-center justify-center lg:justify-start gap-2 flex-wrap leading-tight"
              >
                {profile?.name || 'Partner'}
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-[16px] text-neutral-500 font-medium max-w-md leading-relaxed"
              >
                Welcome back to <span className="text-primary font-semibold">SSK Business Network</span>. Here is your enterprise operations overview for today.
              </motion.p>
            </div>

            {/* Dynamic Companion Tabs */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex bg-[#F7F8FA] p-1.5 rounded-[20px] border border-neutral-200/60 w-full max-w-sm gap-2"
            >
              <button
                onClick={() => setActiveTab('companion')}
                className={cn(
                  "flex-1 h-12 rounded-[14px] text-[15px] font-semibold transition-all duration-300 flex items-center justify-center gap-2",
                  activeTab === 'companion' 
                    ? "bg-white text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.06)]" 
                    : "text-neutral-500 hover:text-[#111827] hover:bg-neutral-200/50"
                )}
              >
                <Sparkles size={18} className={activeTab === 'companion' ? "text-primary" : "text-neutral-400"} />
                Companion
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={cn(
                  "flex-1 h-12 rounded-[14px] text-[15px] font-semibold transition-all duration-300 flex items-center justify-center gap-2",
                  activeTab === 'reports' 
                    ? "bg-white text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.06)]" 
                    : "text-neutral-500 hover:text-[#111827] hover:bg-neutral-200/50"
                )}
              >
                <Activity size={18} className={activeTab === 'reports' ? "text-primary" : "text-neutral-400"} />
                Reports
              </button>
            </motion.div>
          </div>

          {/* Large Animated Business Health Score */}
          <div className="lg:col-span-3 hidden lg:flex flex-col items-center justify-center relative">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-48 h-48 flex flex-col items-center justify-center group"
            >
              {/* Soft glowing ring */}
              <div className="absolute inset-0 rounded-full border border-neutral-100 shadow-[0_0_40px_rgba(220,38,38,0.08)] group-hover:shadow-[0_0_60px_rgba(220,38,38,0.12)] transition-shadow duration-500" />
              
              <svg className="w-full h-full -rotate-90 absolute inset-0" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" stroke="#F7F8FA" strokeWidth="4" fill="transparent" />
                <motion.circle 
                  cx="50" cy="50" r="46" stroke="#DC2626" strokeWidth="4" fill="transparent"
                  strokeDasharray="289.02" strokeDashoffset="289.02" strokeLinecap="round" 
                  initial={{ strokeDashoffset: 289.02 }}
                  animate={{ strokeDashoffset: 289.02 - (289.02 * 0.92) }}
                  transition={{ delay: 0.6, duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              
              <div className="flex flex-col items-center justify-center z-10 bg-white w-[140px] h-[140px] rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-neutral-50/50">
                <span className="text-[48px] font-semibold text-[#111827] leading-none tracking-tight">92</span>
                <span className="text-[12px] font-semibold text-neutral-400 uppercase tracking-[0.2em] mt-1">Health</span>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="mt-6 flex items-center gap-6"
            >
              <div className="flex flex-col items-center">
                <span className="text-[14px] text-emerald-600 font-semibold flex items-center gap-1"><TrendingUp size={14} /> +4%</span>
                <span className="text-[11px] text-neutral-400 uppercase tracking-widest font-semibold mt-1">Weekly</span>
              </div>
              <div className="w-px h-8 bg-neutral-200" />
              <div className="flex flex-col items-center">
                <span className="text-[14px] text-emerald-600 font-semibold flex items-center gap-1"><TrendingUp size={14} /> +12%</span>
                <span className="text-[11px] text-neutral-400 uppercase tracking-widest font-semibold mt-1">Monthly</span>
              </div>
            </motion.div>
          </div>

          {/* Premium Rightmost Membership Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-4 h-full flex items-center justify-center lg:justify-end w-full"
          >
            <div className="bg-[#0B0B0D] rounded-[24px] p-8 shadow-[0_20px_40px_rgba(11,11,13,0.15)] relative overflow-hidden w-full max-w-sm h-full min-h-[260px] flex flex-col justify-between group hover:shadow-[0_30px_60px_rgba(11,11,13,0.2)] transition-shadow duration-500">
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-primary/20 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 group-hover:bg-primary/30 transition-all duration-700" />
              <div className="absolute -bottom-10 -left-10 w-[150px] h-[150px] bg-white/5 rounded-full blur-[60px] pointer-events-none" />
              
              <div className="relative z-10 flex items-start justify-between">
                <div className="space-y-1.5">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Access
                  </span>
                  <h3 className="text-white text-[24px] font-semibold tracking-tight">
                    {profile?.role === 'MASTER_ADMIN' ? 'Platinum Director' : profile?.role === 'CHAPTER_ADMIN' ? 'Platinum President' : 'Platinum Member'}
                  </h3>
                  <p className="text-[14px] text-neutral-400 font-medium pt-1">
                    {profile?.chapterName || 'SSK Business Network'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400 backdrop-blur-md border border-white/5 shadow-inner">
                  <Trophy size={24} />
                </div>
              </div>

              <div className="relative z-10 mt-auto pt-6 space-y-4">
                <div className="flex items-center justify-between text-[13px] font-medium">
                  <span className="text-neutral-400">Next Milestone</span>
                  <span className="text-white">Diamond Partner</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "75%" }}
                    transition={{ delay: 1, duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary to-rose-400 rounded-full" 
                  />
                </div>
                
                <div className="pt-4 mt-2 flex items-center justify-between border-t border-white/10">
                  <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-[0.2em]">ENTERPRISE SEAT</span>
                  <button className="text-white bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg text-[13px] font-semibold tracking-wide">
                    Manage
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>

      """
    
    new_content = content[:start_idx] + hero_replacement + content[end_idx:]
    with open('src/pages/Dashboard.tsx', 'w') as f:
        f.write(new_content)
    print("Dashboard hero rewritten.")
else:
    print("Could not find markers.")
