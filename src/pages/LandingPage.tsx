import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { 
  ArrowRight, Users, ShieldCheck, TrendingUp, Target, Globe, CheckCircle2, 
  Handshake, Hammer, Clock, Sprout, HardHat, Palette, Headset, Telescope, 
  Coins, Settings, Briefcase, GraduationCap, Scale, Shield, Map, Calendar, X
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { UserProfile } from '../types';
import { where } from 'firebase/firestore';

// Reusable animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

export function LandingPage() {
  const { user, profile, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 1000], [0, 250]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    businessName: '',
    businessCategory: '',
    city: '',
    adminId: ''
  });
  const [chapterAdmins, setChapterAdmins] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchAdmins = async () => {
      const admins = await firestoreService.list<UserProfile>('users', [where('role', '==', 'CHAPTER_ADMIN')]);
      setChapterAdmins(admins);
    };
    fetchAdmins();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const guestId = await firestoreService.create('guest_registrations', {
        ...formData,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
        isWhatsAppShared: false,
        isCalled: false
      });

      // Send notification to the selected Chapter Admin
      if (formData.adminId) {
        const selectedAdmin = chapterAdmins.find(a => a.uid === formData.adminId);
        const chapterName = selectedAdmin?.chapterName || 'your chapter';
        
        await firestoreService.create('notifications', {
          userId: formData.adminId,
          role: 'CHAPTER_ADMIN',
          type: 'GUEST_REGISTRATION',
          message: `New Guest Registration received. Guest: ${formData.fullName}, Contact: ${formData.phone}, Chapter: ${chapterName}`,
          read: false,
          relatedUserId: guestId, // Store guest ID to highlight it
          createdAt: new Date().toISOString()
        });
      }

      setFormSuccess(true);
      setFormData({
        fullName: '',
        phone: '',
        businessName: '',
        businessCategory: '',
        city: '',
        adminId: ''
      });
    } catch (error) {
      console.error('Error submitting guest registration:', error);
      alert('Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToForm = () => {
    document.getElementById('guest-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading || (user && !profile)) return (
    <div className="min-h-screen bg-[#0F2040] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F97316]"></div>
    </div>
  );
  if (user && profile) return <Navigate to="/network" replace />;

  return (
    <div className="min-h-screen bg-white text-[#0F2040] overflow-x-hidden font-sans selection:bg-[#F97316] selection:text-[#0F2040]">
      
      {/* Top Announcement Banner */}
      <div className="bg-gradient-to-r from-[#F97316] via-[#FB923C] to-[#F97316] text-white py-2.5 px-4 text-center text-[10px] md:text-sm font-black relative z-[60] flex items-center justify-center gap-2 shadow-md">
        <motion.span 
          animate={{ scale: [1, 1.2, 1] }} 
          transition={{ repeat: Infinity, duration: 2 }}
        >✨</motion.span>
        <span>SSK Business Network is expanding! Join our upcoming chapter launch.</span>
        <button onClick={scrollToForm} className="ml-2 underline decoration-white/50 hover:decoration-white transition-all">
          Reserve &rarr;
        </button>
      </div>

      {/* Sticky Navbar */}
      <nav className={`fixed top-[40px] left-0 right-0 z-50 px-6 py-4 transition-all duration-500 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-lg border-b border-white/10' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.img 
              whileHover={{ scale: 1.05, rotate: 5 }}
              src="https://i.pinimg.com/736x/f3/63/13/f363133013d828ffadc4ce4c61dedcd4.jpg" 
              alt="Logo" 
              className="w-10 h-10 rounded-lg object-cover shadow-lg"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className={`font-black leading-none tracking-tight transition-colors text-sm md:text-base ${scrolled ? 'text-[#0F2040]' : 'text-white'}`}>SSK BUSINESS NETWORK</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/login" className={`text-sm font-bold transition-colors hover:text-[#F97316] ${scrolled ? 'text-[#0F2040]' : 'text-white'}`}>
              Login
            </Link>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToForm} 
              className="px-4 md:px-6 py-2 md:py-2.5 bg-[#F97316] text-white text-[10px] md:text-sm font-black uppercase tracking-widest rounded-full hover:bg-[#EA580C] transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)]"
            >
              Join Meeting
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#0F2040]">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1556761175-5973dc0f32d7?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            alt="Business Meeting"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F2040]/80 via-[#0F2040]/90 to-[#0F2040]"></div>
        </motion.div>

        {/* Animated Particles */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-[#F97316] rounded-full opacity-30"
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: Math.random() * window.innerHeight 
              }}
              animate={{ 
                y: [null, Math.random() * -500],
                opacity: [0.3, 0.8, 0]
              }}
              transition={{ 
                duration: Math.random() * 10 + 10, 
                repeat: Infinity, 
                ease: "linear" 
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto mt-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.h1 variants={fadeUp} className="text-4xl md:text-7xl font-black tracking-tighter text-white mb-6 leading-[1.1]">
              We Built Our Community with Values.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F97316] to-[#FB923C] drop-shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                Now Let’s Build Our Businesses Together.
              </span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg md:text-2xl text-white/90 mb-4 font-medium max-w-3xl mx-auto">
              A powerful movement to Ignite, Nurture & Grow SSK Entrepreneurs across India.
            </motion.p>
            <motion.p variants={fadeUp} className="text-xl md:text-3xl font-black text-white mb-12 tracking-tight">
              By the <span className="text-[#EF4444]">SSK People</span>. For the <span className="text-[#EF4444]">SSK People</span>.
            </motion.p>
            <motion.div variants={fadeUp}>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0px 0px 30px rgba(249, 115, 22, 0.6)" }}
                whileTap={{ scale: 0.95 }}
                onClick={scrollToForm}
                className="px-8 md:px-10 py-4 md:py-5 bg-gradient-to-r from-[#F97316] to-[#FB923C] text-white rounded-full font-black uppercase tracking-widest text-xs md:text-sm transition-all shadow-xl shadow-[#F97316]/20"
              >
                Join a Chapter Meeting
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-1">
            <div className="w-1.5 h-3 bg-[#F97316] rounded-full" />
          </div>
        </motion.div>
      </header>

      {/* The Story Begins */}
      <section className="py-20 md:py-32 px-6 bg-[#FDF8F0] text-center relative">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
            className="text-3xl md:text-5xl font-black text-[#0F2040] mb-12 md:mb-20 uppercase tracking-tight"
          >
            The Story Begins
          </motion.h2>
          
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-16 md:mb-24"
          >
            {[
              { icon: Handshake, label: 'Values' },
              { icon: Hammer, label: 'Hard Work' },
              { icon: Clock, label: 'Discipline' },
              { icon: Sprout, label: 'Build Families,\nCareers, and Respect' }
            ].map((item, i) => (
              <motion.div 
                variants={fadeUp}
                whileHover={{ y: -10 }}
                key={i} 
                className="flex flex-col items-center gap-4 md:gap-6 group"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-3xl shadow-xl shadow-slate-200/50 flex items-center justify-center text-[#0F2040] border border-slate-100 group-hover:border-[#F97316] group-hover:text-[#F97316] transition-colors duration-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#F97316]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <item.icon size={32} md:size={40} strokeWidth={1.5} className="relative z-10" />
                </div>
                <p className="font-black text-[#0F2040] text-sm md:text-lg whitespace-pre-line uppercase tracking-widest">{item.label}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
            className="inline-block relative"
          >
            <div className="absolute inset-0 bg-[#F97316]/10 blur-3xl rounded-full" />
            <p className="text-xl md:text-4xl font-black text-[#0F2040] relative z-10 px-4">
              Are we truly supporting each other in business?
            </p>
          </motion.div>
        </div>
      </section>

      {/* The Reality */}
      <section className="py-20 md:py-32 px-6 bg-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50/50 -skew-x-12 translate-x-32 hidden md:block" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.h2 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
            className="text-3xl md:text-5xl font-black text-[#0F2040] mb-12 md:mb-20 uppercase tracking-tight text-center"
          >
            The Reality
          </motion.h2>
          
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center mb-20 md:mb-32">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="text-center md:text-left">
              <motion.h3 
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5, duration: 1 }}
                viewport={{ once: true }}
                className="text-5xl md:text-8xl font-black text-[#0F2040] mb-4 tracking-tighter"
              >
                1,00,000+
              </motion.h3>
              <p className="text-lg md:text-2xl font-bold text-slate-500 uppercase tracking-widest">SSK People in Bangalore alone.</p>
              
              {/* Animated Cityscape */}
              <div className="mt-8 md:mt-12 flex items-end gap-2 md:gap-3 h-32 md:h-40 opacity-30 justify-center md:justify-start">
                {[40, 70, 50, 90, 60, 80, 45, 100, 65, 85].map((h, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="w-4 md:flex-1 bg-gradient-to-t from-[#0F2040] to-[#0F2040]/50 rounded-t-md" 
                  />
                ))}
              </div>
            </motion.div>
            
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
              className="bg-white/60 backdrop-blur-xl p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/50 relative group hover:border-[#F97316]/50 transition-colors duration-500"
            >
              <div className="absolute -top-4 md:-top-6 -right-4 md:-right-6 w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-[#F97316] to-[#FB923C] rounded-full shadow-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-500">
                <ShieldCheck size={24} md:size={32} />
              </div>
              <h4 className="text-xl md:text-2xl font-black text-[#0F2040] mb-6 uppercase tracking-widest">The Challenge</h4>
              <p className="text-lg md:text-xl text-slate-600 font-medium mb-8">Most of our businesses grow alone.</p>
              <ul className="space-y-4 md:space-y-6 font-bold text-[#0F2040] text-base md:text-lg">
                <motion.li whileHover={{ x: 10 }} className="flex items-center gap-4 transition-transform"><div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-rose-100 flex items-center justify-center"><X size={14} md:size={18} className="text-rose-500" /></div> No structured support.</motion.li>
                <motion.li whileHover={{ x: 10 }} className="flex items-center gap-4 transition-transform"><div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-rose-100 flex items-center justify-center"><X size={14} md:size={18} className="text-rose-500" /></div> No consistent referrals.</motion.li>
                <motion.li whileHover={{ x: 10 }} className="flex items-center gap-4 transition-transform"><div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-rose-100 flex items-center justify-center"><X size={14} md:size={18} className="text-rose-500" /></div> No unified network.</motion.li>
              </ul>
            </motion.div>
          </div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            {[
              { icon: HardHat, label: 'Builders', color: 'from-blue-500/20 to-blue-500/5 text-blue-600 border-blue-100' },
              { icon: Palette, label: 'Creators', color: 'from-orange-500/20 to-orange-500/5 text-orange-600 border-orange-100' },
              { icon: Headset, label: 'Service\nProviders', color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 border-emerald-100' },
              { icon: Telescope, label: 'Dreamers', color: 'from-purple-500/20 to-purple-500/5 text-purple-600 border-purple-100' }
            ].map((item, i) => (
              <motion.div variants={fadeUp} whileHover={{ y: -10, scale: 1.02 }} key={i} className="flex flex-col items-center gap-4 md:gap-6">
                <div className={`w-24 h-24 md:w-32 md:h-32 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center shadow-lg bg-gradient-to-br border ${item.color} backdrop-blur-sm`}>
                  <item.icon size={36} md:size={48} strokeWidth={1.5} />
                </div>
                <p className="font-black text-[#0F2040] text-lg md:text-xl whitespace-pre-line uppercase tracking-widest">{item.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* A Simple Thought */}
      <section className="py-20 md:py-32 px-6 bg-[#FDF8F0] text-center relative overflow-hidden">
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.h2 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
            className="text-3xl md:text-5xl font-black text-[#0F2040] mb-16 md:mb-24 uppercase tracking-tight"
          >
            A Simple Thought
          </motion.h2>
          
          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-16 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-[#F97316] to-transparent opacity-50" />
            
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 relative"
            >
              {[
                { icon: Users, text: 'What if...\nEvery SSK entrepreneur decided to support another SSK entrepreneur?' },
                { icon: Coins, text: 'What if...\nWe trusted each other enough to refer business?' },
                { icon: Settings, text: 'What if...\nWe built a system where growth is not individual, but collective?' }
              ].map((item, i) => (
                <motion.div 
                  variants={fadeUp}
                  whileHover={{ y: -15 }}
                  key={i} 
                  className="flex flex-col items-center gap-6 md:gap-8 bg-white p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#FDF8F0]/50 rounded-[2rem] md:rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-[#FDF8F0] rounded-full shadow-inner flex items-center justify-center text-[#0F2040] border-4 border-white relative z-10 group-hover:scale-110 transition-transform duration-500">
                    <item.icon size={36} md:size={48} strokeWidth={1.5} />
                  </div>
                  <p className="font-bold text-[#0F2040] text-lg md:text-xl whitespace-pre-line leading-relaxed relative z-10">{item.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Introducing SSK Business Network */}
      <section className="py-24 md:py-40 px-6 bg-[#0F2040] text-center relative overflow-hidden">
        {/* Animated Network Background */}
        <div className="absolute inset-0 opacity-30">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <motion.line initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 2 }} x1="20%" y1="20%" x2="50%" y2="50%" stroke="#F97316" strokeWidth="1" strokeDasharray="5,5" />
            <motion.line initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 2, delay: 0.2 }} x1="80%" y1="30%" x2="50%" y2="50%" stroke="#F97316" strokeWidth="1" strokeDasharray="5,5" />
            <motion.line initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 2, delay: 0.4 }} x1="30%" y1="80%" x2="50%" y2="50%" stroke="#F97316" strokeWidth="1" strokeDasharray="5,5" />
            <motion.line initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 2, delay: 0.6 }} x1="70%" y1="70%" x2="50%" y2="50%" stroke="#F97316" strokeWidth="1" strokeDasharray="5,5" />
          </svg>
          {[
            { top: '20%', left: '20%' }, { top: '30%', right: '20%' }, 
            { bottom: '20%', left: '30%' }, { bottom: '30%', right: '30%' }
          ].map((pos, i) => (
            <motion.div 
              key={i}
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
              className="absolute w-3 h-3 bg-[#F97316] rounded-full shadow-[0_0_20px_#F97316]"
              style={pos}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <motion.h2 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-xl md:text-4xl font-black text-white/50 mb-12 md:mb-16 uppercase tracking-[0.2em] md:tracking-[0.3em]"
          >
            Introducing SSK Business Network
          </motion.h2>
          
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5, duration: 1 }}
            viewport={{ once: true }}
            className="w-48 h-48 md:w-64 md:h-64 mx-auto bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center mb-12 md:mb-16 border border-white/10 relative"
          >
            <motion.div 
              animate={{ boxShadow: ["0 0 0px rgba(249,115,22,0)", "0 0 60px rgba(249,115,22,0.4)", "0 0 0px rgba(249,115,22,0)"] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-3 md:inset-4 bg-white rounded-full flex items-center justify-center border-4 border-[#F97316]"
            >
              <div className="text-center">
                <Shield size={60} md:size={80} className="mx-auto text-[#0F2040] mb-1 md:mb-2" />
                <p className="font-black text-[#0F2040] text-2xl md:text-3xl leading-none">SSK</p>
                <p className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Business Network</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="bg-white/5 backdrop-blur-md border border-white/10 p-8 md:p-10 rounded-2xl md:rounded-3xl"
          >
            <p className="text-xl md:text-5xl font-medium text-white leading-tight">
              <span className="text-[#F97316] font-black">Not just a platform.</span><br/>
              It is a movement to bring SSK entrepreneurs together... connect, collaborate, and grow as one strong business community.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How This Movement Works & Power of One Category */}
      <section className="py-20 md:py-32 px-6 bg-[#FDF8F0] relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 md:mb-24">
            <motion.h2 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              className="text-3xl md:text-5xl font-black text-[#0F2040] mb-6 uppercase tracking-tight"
            >
              The Power of One Category
            </motion.h2>
            <motion.p 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              className="text-lg md:text-2xl font-black text-[#F97316] bg-white inline-block px-6 md:px-8 py-3 rounded-full shadow-sm border border-slate-100 uppercase tracking-widest"
            >
              👉 Only ONE person per category.
            </motion.p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 items-center mt-16 md:mt-24">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="space-y-8 md:space-y-12">
                <motion.div variants={fadeUp} className="flex flex-col items-center gap-4 group">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-lg flex items-center justify-center text-[#0F2040] group-hover:scale-110 group-hover:bg-[#0F2040] group-hover:text-white transition-all duration-500">
                    <Calendar size={32} md:size={40} />
                  </div>
                  <p className="font-black text-[#0F2040] text-lg md:text-xl uppercase tracking-widest">Show up consistently</p>
                </motion.div>
                <motion.div variants={fadeUp} className="flex flex-col items-center gap-4 group">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-lg flex items-center justify-center text-[#0F2040] group-hover:scale-110 group-hover:bg-[#0F2040] group-hover:text-white transition-all duration-500">
                    <ArrowRight size={32} md:size={40} />
                  </div>
                  <p className="font-black text-[#0F2040] text-lg md:text-xl uppercase tracking-widest">Pass genuine referrals</p>
                </motion.div>
              </motion.div>
              
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5, duration: 1 }}
                viewport={{ once: true }}
                className="flex flex-col items-center relative"
              >
                <div className="absolute inset-0 bg-[#F97316]/10 blur-3xl rounded-full" />
                <div className="w-48 h-48 md:w-64 md:h-64 bg-white rounded-full shadow-2xl flex items-center justify-center border-8 border-[#FDF8F0] relative z-10">
                  <Users size={80} md:size={100} className="text-[#0F2040]" />
                </div>
                <p className="font-black text-[#0F2040] text-xl md:text-2xl mt-8 text-center uppercase tracking-widest relative z-10">Understand each other deeply</p>
              </motion.div>

              <motion.div 
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
                className="bg-white p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-slate-100 text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-[#F97316]/5 rounded-bl-full" />
                <ul className="space-y-8 md:space-y-10 relative z-10">
                  {['Clarity', 'Focus', 'Commitment'].map((text, i) => (
                    <motion.li variants={fadeUp} key={i} className="flex items-center gap-4 md:gap-6 text-xl md:text-3xl font-black text-[#0F2040] uppercase tracking-widest">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#F97316]/10 flex items-center justify-center text-[#F97316]">
                        <CheckCircle2 size={24} md:size={32} />
                      </div>
                      {text}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>
            
            <motion.p 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              className="text-lg md:text-3xl font-black text-white mt-16 md:mt-24 bg-[#0F2040] inline-block px-8 md:px-12 py-4 md:py-6 rounded-2xl md:rounded-full shadow-2xl shadow-[#0F2040]/20"
            >
              When you join, the entire chapter supports YOUR business — not competes with it.
            </motion.p>
          </div>
        </div>
      </section>

      {/* More Than Networking */}
      <section className="py-20 md:py-32 px-6 bg-white text-center relative">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-3xl md:text-5xl font-black text-[#0F2040] mb-6 uppercase tracking-tight"
          >
            More Than Networking
          </motion.h2>
          <motion.p 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-lg md:text-2xl font-bold text-slate-500 mb-16 md:mb-20 uppercase tracking-widest"
          >
            Building a strong economic ecosystem.
          </motion.p>
          
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-12"
          >
            {[
              { icon: Briefcase, title: 'Real business\nopportunities' },
              { icon: GraduationCap, title: 'Continuous\nlearning' },
              { icon: Scale, title: 'Ethical business\npractices' },
              { icon: ShieldCheck, title: 'Ethical business\npractices' },
              { icon: Handshake, title: 'Strong\nrelationships' },
              { icon: Globe, title: 'Cross-community\ncollaborations' }
            ].map((item, i) => (
              <motion.div 
                variants={fadeUp}
                whileHover={{ y: -10, scale: 1.02 }}
                key={i} 
                className="bg-white p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center gap-6 md:gap-8 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#FDF8F0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-20 h-20 md:w-24 md:h-24 bg-[#FDF8F0] rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-[#0F2040] group-hover:bg-[#F97316] group-hover:text-white transition-colors duration-500 relative z-10">
                  <item.icon size={36} md:size={48} strokeWidth={1.5} />
                </div>
                <p className="font-black text-[#0F2040] text-base md:text-lg whitespace-pre-line uppercase tracking-widest relative z-10">{item.title}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* A Vision For The Future */}
      <section className="py-24 md:py-40 px-6 bg-[#0F2040] text-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            alt="World Map"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F2040] via-[#0F2040]/80 to-[#0F2040]"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <motion.h2 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-xl md:text-4xl font-black text-white/50 mb-12 md:mb-20 uppercase tracking-[0.2em] md:tracking-[0.3em]"
          >
            A Vision For The Future
          </motion.h2>
          
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 md:p-16 rounded-[2rem] md:rounded-[3rem] mb-12 md:mb-20 shadow-2xl"
          >
            <p className="text-xl md:text-5xl font-medium text-white leading-relaxed">
              Imagine this: <span className="text-[#F97316] font-black">10,000 SSK entrepreneurs</span> connected... refers business... building wealth within the community.
            </p>
          </motion.div>
          
          <motion.p 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-2xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F97316] to-[#FB923C] drop-shadow-[0_0_30px_rgba(249,115,22,0.3)]"
          >
            This is what we are building.
          </motion.p>
        </div>
      </section>

      {/* This Is Your Invitation */}
      <section className="py-20 md:py-32 px-6 bg-white text-center">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-3xl md:text-5xl font-black text-[#0F2040] mb-16 md:mb-24 uppercase tracking-tight"
          >
            This Is Your Invitation
          </motion.h2>
          
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 mb-16 md:mb-24"
          >
            {[
              { icon: Users, title: 'How people\nconnect' },
              { icon: ArrowRight, title: 'How referrals\nare shared' },
              { icon: Handshake, title: 'How trust\nis built' }
            ].map((item, i) => (
              <motion.div variants={fadeUp} whileHover={{ y: -10 }} key={i} className="flex flex-col items-center gap-6 md:gap-8">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-[#FDF8F0] rounded-full flex items-center justify-center text-[#0F2040] border-4 border-slate-100 shadow-xl shadow-slate-200/50">
                  <item.icon size={36} md:size={48} strokeWidth={1.5} />
                </div>
                <p className="font-black text-[#0F2040] text-xl md:text-2xl whitespace-pre-line uppercase tracking-widest">{item.title}</p>
              </motion.div>
            ))}
          </motion.div>
          
          <motion.p 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-lg md:text-2xl font-bold text-slate-500 uppercase tracking-widest px-4"
          >
            You just need to experience it once. Attend as a guest.
          </motion.p>
        </div>
      </section>

      {/* Call To Action */}
      <section className="py-24 md:py-32 px-6 bg-gradient-to-br from-[#0F2040] to-[#1a365d] text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-xs font-black text-[#F97316] uppercase tracking-[0.3em] md:tracking-[0.5em] mb-6 md:mb-8">Call To Action</motion.h2>
          <motion.h3 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-3xl md:text-6xl font-black mb-6 md:mb-8 leading-tight">Take the First Step Towards Collective Growth.</motion.h3>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-xl md:text-2xl text-white/80 mb-12 md:mb-16 font-medium">Your business deserves a community.</motion.p>
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-8">
            <motion.button
              variants={fadeUp}
              whileHover={{ scale: 1.05, boxShadow: "0px 0px 30px rgba(255, 255, 255, 0.3)" }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToForm}
              className="w-full sm:w-auto px-10 py-5 bg-white text-[#0F2040] rounded-full font-black uppercase tracking-widest text-xs md:text-sm transition-all"
            >
              Join a Chapter Meeting
            </motion.button>
            <motion.button
              variants={fadeUp}
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToForm}
              className="w-full sm:w-auto px-10 py-5 bg-transparent border-2 border-white/50 text-white rounded-full font-black uppercase tracking-widest text-xs md:text-sm transition-all"
            >
              Experience the Network
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Sign-Up Section */}
      <section id="guest-form" className="py-20 md:py-32 px-6 bg-[#FDF8F0] relative">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[#0F2040] to-transparent opacity-5" />
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-white p-8 md:p-16 rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#F97316] to-[#FB923C]" />
            <h3 className="text-2xl md:text-4xl font-black text-[#0F2040] mb-8 md:mb-12 text-center tracking-tight">Register as a Guest for a Chapter Meeting</h3>
            
            {formSuccess ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#FDF8F0] p-8 md:p-12 rounded-2xl md:rounded-3xl text-center space-y-6 border border-[#F97316]/20">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                  <CheckCircle2 size={32} md:size={48} />
                </div>
                <h4 className="text-2xl md:text-3xl font-black text-[#0F2040]">Registration Successful!</h4>
                <p className="text-lg md:text-xl text-slate-600 font-medium">We have received your details and will contact you shortly.</p>
                <button 
                  onClick={() => setFormSuccess(false)}
                  className="mt-6 md:mt-8 px-6 md:px-8 py-3 md:py-4 bg-[#0F2040] text-white rounded-full font-black uppercase tracking-widest text-xs md:text-sm hover:bg-[#0F2040]/90 transition-all"
                >
                  Register Another Guest
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleGuestSubmit} className="space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-2 md:space-y-3">
                    <label className="block text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Full Name</label>
                    <input required type="text" placeholder="e.g. John D." value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full h-12 md:h-14 px-5 md:px-6 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/10 outline-none transition-all font-bold text-[#0F2040] placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <label className="block text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Phone Number</label>
                    <input required type="tel" placeholder="e.g. +91 9..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full h-12 md:h-14 px-5 md:px-6 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/10 outline-none transition-all font-bold text-[#0F2040] placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <label className="block text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Business Name</label>
                    <input required type="text" placeholder="e.g. SSK Creations" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="w-full h-12 md:h-14 px-5 md:px-6 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/10 outline-none transition-all font-bold text-[#0F2040] placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <label className="block text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Business Category</label>
                    <select required value={formData.businessCategory} onChange={e => setFormData({...formData, businessCategory: e.target.value})} className="w-full h-12 md:h-14 px-5 md:px-6 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/10 outline-none transition-all font-bold text-[#0F2040]">
                      <option value="">Select</option>
                      <option value="IT">IT Services</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Retail">Retail</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <label className="block text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest ml-2">City</label>
                    <input required type="text" placeholder="e.g. Bangalore" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full h-12 md:h-14 px-5 md:px-6 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/10 outline-none transition-all font-bold text-[#0F2040] placeholder:text-slate-400" />
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <label className="block text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Preferred Chapter Admin</label>
                    <select required value={formData.adminId} onChange={e => setFormData({...formData, adminId: e.target.value})} className="w-full h-12 md:h-14 px-5 md:px-6 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/10 outline-none transition-all font-bold text-[#0F2040]">
                      <option value="">Select Admin</option>
                      {chapterAdmins.map(admin => (
                        <option key={admin.uid} value={admin.uid}>{admin.name || admin.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-14 md:h-16 mt-6 md:mt-8 bg-[#0F2040] text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm hover:bg-[#1a365d] transition-all shadow-xl shadow-[#0F2040]/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Reserving...' : 'Reserve My Seat'}
                </motion.button>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      {/* Final Message & Footer */}
      <footer className="py-16 md:py-24 bg-white text-center px-6 border-t border-slate-100">
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-[#FDF8F0] rounded-full flex items-center justify-center shadow-inner text-[#0F2040]">
            <Users size={32} md:size={40} />
          </motion.div>
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-3xl md:text-6xl font-black text-[#0F2040] leading-tight tracking-tighter">
            We have <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F97316] to-[#FB923C]">always grown</span> as a community.<br/>
            Now it’s time to grow as a business community.
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-xl md:text-3xl font-black text-slate-400 uppercase tracking-widest">
            Together, we rise. Together, we grow.
          </motion.p>
          
          <div className="pt-12 md:pt-20 flex flex-col md:flex-row items-center justify-between border-t border-slate-100 mt-12 md:mt-20 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <Shield size={16} md:size={18} className="text-[#F97316]" /> SSK Business Network
            </div>
            <div className="flex gap-6 md:gap-8">
              <a href="#" className="hover:text-[#0F2040] transition-colors">Contact</a>
              <a href="#" className="hover:text-[#0F2040] transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
