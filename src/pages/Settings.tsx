import React, { useState, useEffect } from 'react';
import { 
  Trophy, Sliders, Calendar, CheckCircle2, RefreshCw, Eye, EyeOff, 
  Award, ShieldCheck, Sparkles, Filter
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { 
  getTopPerformanceSettings, 
  saveTopPerformanceSettings, 
  fetchTopPerformingMembers, 
  TopPerformanceSettings, 
  TopMemberPublicItem 
} from '../utils/topPerformance';

export function Settings() {
  const { profile } = useAuth();
  const isMasterAdmin = profile?.position === 'master_admin' || (profile?.role || '').toUpperCase() === 'MASTER_ADMIN';

  const [settings, setSettings] = useState<TopPerformanceSettings>({
    showOnLandingPage: true,
    startDate: '',
    endDate: '',
  });

  const [startDateInput, setStartDateInput] = useState<string>('');
  const [endDateInput, setEndDateInput] = useState<string>('');
  const [previewMembers, setPreviewMembers] = useState<TopMemberPublicItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentSettings = await getTopPerformanceSettings();
      setSettings(currentSettings);
      setStartDateInput(currentSettings.startDate || '');
      setEndDateInput(currentSettings.endDate || '');

      const members = await fetchTopPerformingMembers(currentSettings);
      setPreviewMembers(members);
    } catch (err) {
      console.error('Error loading top performance settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShow = async (value: boolean) => {
    const updatedSettings = {
      ...settings,
      showOnLandingPage: value,
    };
    setSettings(updatedSettings);
    await saveTopPerformanceSettings(updatedSettings);

    if (value) {
      const members = await fetchTopPerformingMembers(updatedSettings);
      setPreviewMembers(members);
    } else {
      setPreviewMembers([]);
    }

    setMessage({
      type: 'success',
      text: value
        ? 'Top Performance section is now ENABLED on the public Landing Page.'
        : 'Top Performance section is now HIDDEN from the public Landing Page.',
    });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleApplyDateRange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const newSettings: TopPerformanceSettings = {
        showOnLandingPage: settings.showOnLandingPage,
        startDate: startDateInput ? startDateInput : null,
        endDate: endDateInput ? endDateInput : null,
      };

      await saveTopPerformanceSettings(newSettings);
      setSettings(newSettings);

      const members = await fetchTopPerformingMembers(newSettings);
      setPreviewMembers(members);

      setMessage({
        type: 'success',
        text: 'Top Performance date range applied successfully! Preview updated below.',
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: 'Failed to update settings. Please try again.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleResetDateRange = async () => {
    setStartDateInput('');
    setEndDateInput('');
    setSaving(true);
    try {
      const newSettings: TopPerformanceSettings = {
        showOnLandingPage: settings.showOnLandingPage,
        startDate: null,
        endDate: null,
      };
      await saveTopPerformanceSettings(newSettings);
      setSettings(newSettings);
      const members = await fetchTopPerformingMembers(newSettings);
      setPreviewMembers(members);
      setMessage({
        type: 'success',
        text: 'Date range filter reset to default (All time / Today).',
      });
    } catch (err) {
      console.error('Error resetting date range:', err);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'M';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Sliders size={14} /> Master Admin Control Center
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Settings & Configurations
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Manage public landing page features and portal preferences.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold transition-all shadow-lg ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {!isMasterAdmin ? (
        <div className="p-8 bg-[#0B1220] border border-white/10 rounded-2xl text-center space-y-3">
          <ShieldCheck size={36} className="mx-auto text-amber-400" />
          <h2 className="text-lg font-bold text-white">Master Admin Restricted Area</h2>
          <p className="text-neutral-400 text-sm max-w-md mx-auto">
            Top Performance configurations are managed exclusively by Master Admins.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Performance Settings Box */}
          <div className="bg-[#0B1220] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                  <Trophy size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Top Performance Section</h2>
                  <p className="text-xs text-neutral-400">
                    Controls the Top Performing Members showcase on the public Landing Page.
                  </p>
                </div>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#111827]/80 border border-white/10 rounded-xl gap-4">
              <div>
                <label className="text-sm font-bold text-white block mb-0.5">
                  Show Top Performance on Landing Page
                </label>
                <p className="text-xs text-neutral-400">
                  When enabled, public visitors can view the Top 10 Members carousel on the homepage.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    settings.showOnLandingPage
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  {settings.showOnLandingPage ? 'ON' : 'OFF'}
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleShow(!settings.showOnLandingPage)}
                  className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${
                    settings.showOnLandingPage ? 'bg-amber-500' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center text-neutral-900 ${
                      settings.showOnLandingPage ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  >
                    {settings.showOnLandingPage ? <Eye size={12} /> : <EyeOff size={12} />}
                  </div>
                </button>
              </div>
            </div>

            {/* Date Range Selection */}
            <form onSubmit={handleApplyDateRange} className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Calendar size={14} /> Performance Date Range Filter
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    className="w-full bg-[#111827] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    className="w-full bg-[#111827] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>

                <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-neutral-950 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Filter size={16} />
                    )}
                    <span>Apply</span>
                  </button>

                  {(startDateInput || endDateInput) && (
                    <button
                      type="button"
                      onClick={handleResetDateRange}
                      disabled={saving}
                      className="bg-[#111827] hover:bg-white/10 border border-white/10 text-neutral-300 font-semibold px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-neutral-400 italic">
                Note: Growth Scores for the Top 10 will be calculated using Daily Task Workspace records strictly between Start Date and End Date.
              </p>
            </form>

            {/* Admin Settings Preview */}
            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" /> Settings Preview (Master Admin View Only)
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Calculated Top 10 preview. Note: Scores are shown here for verification, but hidden on the public Landing Page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  disabled={loading}
                  className="p-2 bg-[#111827] border border-white/10 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Refresh Preview"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              {loading ? (
                <div className="p-8 bg-[#111827]/50 rounded-xl border border-white/5 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin text-amber-400" />
                  Calculating Top 10 Member Growth Scores...
                </div>
              ) : previewMembers.length === 0 ? (
                <div className="p-8 bg-[#111827]/50 rounded-xl border border-white/5 text-center text-xs text-neutral-400">
                  No members qualify for the current filter settings or Top Performance is turned OFF.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#111827]">
                  <table className="w-full text-left text-xs text-neutral-300">
                    <thead className="bg-[#1E293B] text-neutral-400 uppercase text-[10px] font-bold border-b border-white/10">
                      <tr>
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Member Name</th>
                        <th className="py-3 px-4">Business</th>
                        <th className="py-3 px-4 text-right text-emerald-400">Growth Score</th>
                        <th className="py-3 px-4 text-right">Earned Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {previewMembers.map((m) => (
                        <tr key={m.uid} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                                m.rank === 1
                                  ? 'bg-amber-500 text-neutral-950 font-black shadow-sm shadow-amber-500/50'
                                  : m.rank === 2
                                  ? 'bg-slate-300 text-neutral-950 font-black shadow-sm shadow-slate-300/50'
                                  : m.rank === 3
                                  ? 'bg-amber-700 text-white font-black shadow-sm shadow-amber-700/50'
                                  : 'bg-white/10 text-neutral-300'
                              }`}
                            >
                              {m.rank}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {m.profilePhoto ? (
                                <img
                                  src={m.profilePhoto}
                                  alt={m.name}
                                  className="w-7 h-7 rounded-full object-cover border border-white/20"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px] border border-amber-500/30">
                                  {getInitials(m.name)}
                                </div>
                              )}
                              <span className="font-bold text-white">{m.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-neutral-400">
                            {m.businessName || '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-400">
                            {m.growthScore}%
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-white">
                            {m.totalEarned?.toLocaleString() || 0} pts
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
