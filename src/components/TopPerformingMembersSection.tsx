import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Award, Crown, Sparkles, Star } from 'lucide-react';
import { 
  subscribeTopPerformanceSettings, 
  fetchTopPerformingMembers, 
  TopPerformanceSettings, 
  TopMemberPublicItem 
} from '../utils/topPerformance';

export function TopPerformingMembersSection() {
  const [settings, setSettings] = useState<TopPerformanceSettings | null>(null);
  const [members, setMembers] = useState<TopMemberPublicItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = subscribeTopPerformanceSettings(async (s) => {
      if (!isMounted) return;
      setSettings(s);
      
      if (s.showOnLandingPage) {
        try {
          const m = await fetchTopPerformingMembers(s);
          if (isMounted) setMembers(m);
        } catch (e) {
          console.error('Error loading top performing members:', e);
        }
      }
      if (isMounted) setLoading(false);
    });

    return () => { 
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (loading) return null;
  if (!settings || !settings.showOnLandingPage || members.length === 0) {
    return null;
  }

  // Duplicate members for infinite loop right-to-left marquee animation
  const displayList = members.length < 5
    ? [...members, ...members, ...members, ...members, ...members, ...members]
    : [...members, ...members, ...members];

  const getInitials = (fullName: string) => {
    if (!fullName) return 'M';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  return (
    <section className="py-16 md:py-24 bg-[#0B1220] text-white relative overflow-hidden border-y border-white/10">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 mb-12 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs md:text-sm uppercase tracking-widest mb-4 shadow-inner"
        >
          <Trophy className="w-4 h-4 md:w-5 md:h-5" /> Leaderboard Showcase
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight uppercase px-4"
        >
          Top Performing Members
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-neutral-400 text-xs sm:text-sm md:text-base font-medium max-w-xl mx-auto mt-3 px-4"
        >
          Recognizing exemplary commitment, active chapter contributions, and business collaboration.
        </motion.p>
      </div>

      {/* Infinite Horizontal Carousel Container */}
      <div 
        className="relative w-full overflow-hidden py-6"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Left & Right subtle gradient masks for smooth fade edge */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-[#0B1220] to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-[#0B1220] to-transparent z-20 pointer-events-none" />

        <div
          className="flex gap-6 w-max animate-marquee-rtl"
          style={{
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {displayList.map((m, idx) => (
            <TopMemberCard key={`${m.uid}-${idx}`} member={m} getInitials={getInitials} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marqueeRtl {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-rtl {
          animation: marqueeRtl 38s linear infinite;
        }
      `}</style>
    </section>
  );
}

const TopMemberCard: React.FC<{
  member: TopMemberPublicItem;
  getInitials: (name: string) => string;
}> = ({
  member,
  getInitials,
}) => {
  const [imgError, setImgError] = useState(false);
  const isRank1 = member.rank === 1;
  const isRank2 = member.rank === 2;
  const isRank3 = member.rank === 3;

  let rankContainerStyle = "bg-[#111827] border-white/10 text-neutral-300";
  let rankBadgeStyle = "bg-white/10 text-white border-white/20";
  let ringStyle = "border-white/10";
  let glowStyle = "";

  if (isRank1) {
    rankContainerStyle = "bg-gradient-to-b from-[#1E1B11] via-[#15130C] to-[#0D0B06] border-amber-500/50 text-white shadow-[0_0_30px_rgba(245,158,11,0.25)] scale-105 z-10";
    rankBadgeStyle = "bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 border-amber-300 font-black shadow-lg shadow-amber-500/40";
    ringStyle = "border-amber-400 ring-2 ring-amber-400/40";
    glowStyle = "from-amber-500/20 via-yellow-500/10";
  } else if (isRank2) {
    rankContainerStyle = "bg-gradient-to-b from-[#181E29] via-[#10141D] to-[#0A0D14] border-slate-300/50 text-white shadow-[0_0_25px_rgba(203,213,225,0.2)]";
    rankBadgeStyle = "bg-gradient-to-r from-slate-200 to-slate-400 text-neutral-950 border-slate-100 font-black shadow-lg shadow-slate-300/30";
    ringStyle = "border-slate-300 ring-2 ring-slate-300/30";
    glowStyle = "from-slate-300/20 via-slate-400/10";
  } else if (isRank3) {
    rankContainerStyle = "bg-gradient-to-b from-[#1C1613] via-[#140F0C] to-[#0B0806] border-amber-700/50 text-white shadow-[0_0_25px_rgba(180,83,9,0.2)]";
    rankBadgeStyle = "bg-gradient-to-r from-amber-600 to-amber-800 text-white border-amber-500 font-black shadow-lg shadow-amber-700/30";
    ringStyle = "border-amber-600 ring-2 ring-amber-600/30";
    glowStyle = "from-amber-700/20 via-amber-800/10";
  }

  const getRankText = (rank: number) => {
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `${rank}th`;
  };

  return (
    <div
      className={`shrink-0 w-64 sm:w-72 p-5 sm:p-6 rounded-2xl md:rounded-3xl border ${rankContainerStyle} relative flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl group overflow-hidden cursor-default`}
    >
      <div className={`absolute inset-0 bg-gradient-to-b ${glowStyle || 'from-white/5'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

      {/* Rank Badge */}
      <div className="w-full flex items-center justify-between mb-4 z-10">
        <div
          className={`px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${rankBadgeStyle}`}
        >
          {isRank1 && <Crown className="w-3.5 h-3.5 animate-pulse" />}
          {isRank2 && <Award className="w-3.5 h-3.5" />}
          {isRank3 && <Star className="w-3.5 h-3.5" />}
          <span>{getRankText(member.rank)}</span>
        </div>

        {isRank1 && (
          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            <Sparkles size={10} /> Top Leader
          </span>
        )}
      </div>

      {/* Profile Picture */}
      <div className="relative mb-4 z-10">
        <div className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden border-2 ${ringStyle} shadow-xl flex items-center justify-center bg-[#0F172A] transition-transform duration-300 group-hover:scale-105`}>
          {member.profilePhoto && !imgError ? (
            <img
              src={member.profilePhoto}
              alt={member.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex items-center justify-center text-amber-400 font-black text-xl tracking-wider">
              {getInitials(member.name)}
            </div>
          )}
        </div>
      </div>

      {/* Member Info */}
      <div className="z-10 w-full space-y-1">
        <h3 className="font-extrabold text-white text-base sm:text-lg line-clamp-1 group-hover:text-amber-400 transition-colors">
          {member.name}
        </h3>
        {member.businessName && (
          <p className="text-xs font-medium text-neutral-400 line-clamp-1">
            {member.businessName}
          </p>
        )}
      </div>
    </div>
  );
}
