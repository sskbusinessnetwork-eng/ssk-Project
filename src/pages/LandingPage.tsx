import React from 'react';
import { motion } from 'motion/react';
import { Users, Building2, TrendingUp, ShieldCheck, ArrowRight, Calendar, Clock, MapPin } from 'lucide-react';
import { AuthButton } from '../components/AuthButton';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { firestoreService } from '../services/firestoreService';
import { Chapter } from '../types';

export function LandingPage() {
  const { user, loading } = useAuth();
  const [chapters, setChapters] = React.useState<Chapter[]>([]);

  React.useEffect(() => {
    firestoreService.list<Chapter>('chapters').then(setChapters);
  }, []);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* Hero Section */}
      <header className="relative h-screen flex items-center justify-center overflow-hidden bg-slate-950">
        <div className="absolute inset-0 z-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=2070" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950"></div>
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-emerald-400 uppercase bg-emerald-400/10 rounded-full border border-emerald-400/20">
              Structured Business Networking
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-tight">
              Grow Your Business Through <span className="text-emerald-500 italic font-serif">Referrals</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              SSK Business Network connects entrepreneurs across chapters to generate business opportunities, track performance, and build lasting professional relationships.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <AuthButton />
              <a href="#chapters" className="flex items-center gap-2 px-6 py-3 text-white font-semibold hover:text-emerald-400 transition-colors group">
                View Chapters <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Chapters Section */}
      <section id="chapters" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Our Active Chapters</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Find a chapter near you and join a community of dedicated business owners.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="p-8 bg-slate-50 rounded-3xl border border-slate-200 hover:border-emerald-200 transition-all group">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors shadow-sm">
                    <Building2 size={24} />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">{chapter.location}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{chapter.name}</h3>
                <div className="space-y-2 text-sm text-slate-500">
                  <p className="flex items-center gap-2"><Calendar size={14} /> Every {chapter.meetingDay}</p>
                  <p className="flex items-center gap-2"><Clock size={14} /> {chapter.meetingTime}</p>
                  <p className="flex items-center gap-2"><MapPin size={14} /> {chapter.meetingVenue}</p>
                </div>
              </div>
            ))}
            {chapters.length === 0 && (
              <div className="col-span-full p-12 text-center text-slate-400 italic">
                No chapters available at the moment.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why Join SSK Network?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Our structured ecosystem ensures every member has a dedicated business category and a supportive network to drive growth.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Building2, title: 'Chapter System', desc: 'Join a local chapter and meet weekly with dedicated business owners.' },
              { icon: ShieldCheck, title: 'Category Exclusivity', desc: 'Only one member per business category per chapter. No competition.' },
              { icon: TrendingUp, title: 'Performance Tracking', desc: 'Track referrals, business generated, and attendance with real-time dashboards.' }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all"
              >
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Chapters', value: '50+' },
              { label: 'Members', value: '2,500+' },
              { label: 'Referrals Passed', value: '15k+' },
              { label: 'Business Generated', value: '₹10Cr+' }
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-4xl md:text-5xl font-extrabold text-emerald-500 mb-2">{stat.value}</p>
                <p className="text-slate-400 text-sm uppercase tracking-widest font-semibold">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 text-center">
        <p className="text-slate-500 text-sm">© 2026 SSK Business Network. All rights reserved.</p>
      </footer>
    </div>
  );
}
