import { Avatar } from '../../components/Avatar';
import React, { useState } from 'react';
import { 
  Phone, 
  Briefcase, 
  Tags, 
  UserCheck, 
  UserMinus, 
  CreditCard, 
  Trash2,
  Building2,
  Edit2,
  Shield,
  AlertTriangle,
  Bell,
  Users,
  Settings,
  MapPin,
  Calendar,
  MoreVertical,
  Eye,
  Lock
} from 'lucide-react';
import { UserProfile } from '../../types';
import { cn } from '../../lib/utils';
import { differenceInDays, format as originalFormat, isValid } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { isMemberActive } from '../../utils/memberStatus';

const format = (date: any, formatStr: string, options?: any) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return isValid(d) ? originalFormat(d, formatStr, options) : 'N/A';
};

interface MemberTableProps {
  currentUserId?: string;
  members: UserProfile[];
  adminMap: Record<string, string>;
  loading: boolean;
  isMasterAdmin: boolean;
  isChapterAdmin: boolean;
  onUpdateStatus: (uid: string, status: UserProfile['membershipStatus']) => void;
  onOpenSubModal: (member: UserProfile) => void;
  onEditMember: (member: UserProfile) => void;
  onDeleteMember: (member: UserProfile) => void;
  onResetPassword: (member: UserProfile) => void;
}

const getDisplayPosition = (pos?: string, r?: string) => {
  if (pos && pos.toLowerCase() !== 'member') {
    return pos.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  }
  if (r === 'MASTER_ADMIN') return 'Master Admin';
  if (r === 'CHAPTER_ADMIN') return 'Chapter Admin';
  return '';
};

export function MemberTable({
  currentUserId,
  members,
  adminMap,
  loading,
  isMasterAdmin,
  isChapterAdmin,
  onUpdateStatus,
  onOpenSubModal,
  onEditMember,
  onDeleteMember,
  onResetPassword
}: MemberTableProps) {
  const navigate = useNavigate();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const getPositionText = (member: UserProfile) => {
    const position = member.position;
    if (!position || position === 'member') return null;
    return (
      <span className="text-[9px] font-bold text-primary uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
        {position.replace('_', ' ')}
      </span>
    );
  };

  const toggleActionsMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  React.useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  if (loading) {
    return (
      <div className="bg-[#111827] rounded-[24px] border border-white/5 p-16 text-center shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="w-10 h-10 border-4 border-primary/25 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Loading Roster...</p>
      </div>
    );
  }

  const showActions = isMasterAdmin || isChapterAdmin;

  return (
    <div className="space-y-6">
      {/* Desktop Table View */}
      <div className="hidden md:block bg-card rounded-[16px] border border-white/5 shadow-card overflow-visible">
        <div className="overflow-visible">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-[#151C2E] border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider w-[32%]">Member</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider w-[28%]">Business & Sector</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider w-[18%]">Chapter Admin</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider w-[12%]">Status</th>
                <th className="px-6 py-4 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider text-right w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 overflow-visible">
              {members.length > 0 ? (
                members.map((member) => (
                  <tr key={member.uid} className="hover:bg-[#1C2538] transition-colors group overflow-visible">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3.5">
                        <Avatar src={member.photoURL} name={member.name} size="w-11 h-11" className="border border-white/5 shrink-0 shadow-sm" fallbackClassName="text-sm" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white text-sm leading-tight truncate mb-1.5">{member.name || member.displayName}</p>
                          <div className="flex flex-col gap-0.5 text-[11px] font-medium text-neutral-400">
                            <div>
                              <span className="text-neutral-500 font-semibold text-[9px] uppercase tracking-wider mr-1">Chapter:</span> 
                              {member.chapterName || (member.chapter_id ? (adminMap[member.chapter_id] ? adminMap[member.chapter_id].replace(' Admin', '') : 'SSK Chapter') : 'SSK Chapter')}
                            </div>
                            {(getDisplayPosition(member.position, member.role) !== '') && (
                              <div>
                                <span className="text-neutral-500 font-semibold text-[9px] uppercase tracking-wider mr-1">Position:</span> 
                                <span className="text-primary font-bold">
                                  {getDisplayPosition(member.position, member.role)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-0.5">
                              <Phone size={9} className="text-neutral-500" />
                              <span>{member.phone || 'No Phone'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-white truncate leading-snug">
                          {member.businessName || 'N/A'}
                        </p>
                        <span className="inline-flex items-center text-[9px] text-primary font-bold uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                          {member.category || 'General'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#151C2E] rounded-lg flex items-center justify-center text-neutral-400 border border-white/5">
                          <Shield size={11} />
                        </div>
                        <span className="text-xs font-semibold text-neutral-300 truncate max-w-[150px]">
                          {((member as any).created_by || member.adminId) ? (adminMap[(member as any).created_by || member.adminId || ''] || (member as any).createdByName || 'Master Admin') : 'Master Admin'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        {(() => {
                          const active = isMemberActive(member);
                          return (
                            <div className={cn(
                              "inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border leading-tight",
                              active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"
                            )}>
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full animate-pulse-subtle",
                                active ? "bg-emerald-500" : "bg-red-500"
                              )} />
                              {active ? 'ACTIVE' : 'INACTIVE'}
                            </div>
                          );
                        })()}
                        {member.subscriptionEnd && (
                          <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wide">
                            Exp: {format(new Date(member.subscriptionEnd), 'dd/MM/yyyy')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right overflow-visible">
                      {showActions ? (
                        <div className="relative inline-block text-left overflow-visible">
                          <button
                            onClick={(e) => toggleActionsMenu(member.uid, e)}
                            className="p-1.5 hover:bg-[#1C2538] rounded-lg text-neutral-400 hover:text-white transition-all active:scale-90"
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                           {activeMenuId === member.uid && (
                            <div className="absolute right-0 mt-1 w-48 bg-[#151C2E] rounded-[12px] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] py-1 z-[999] animate-in fade-in slide-in-from-top-2 duration-150">
                              <button
                                onClick={() => navigate(`/profile?id=${member.uid}`)}
                                className="w-full px-4 py-2 text-left text-xs font-bold text-neutral-200 hover:bg-[#1C2538] flex items-center gap-2"
                              >
                                <Eye size={12} className="text-neutral-400" />
                                View Profile
                              </button>
                              {currentUserId === member.uid && (<button
                                onClick={() => onEditMember(member)}
                                className="w-full px-4 py-2 text-left text-xs font-bold text-neutral-200 hover:bg-[#1C2538] flex items-center gap-2"
                              >
                                <Edit2 size={12} className="text-neutral-400" />
                                Edit Profile
                              </button>)}
                              <button
                                onClick={() => onResetPassword(member)}
                                className="w-full px-4 py-2 text-left text-xs font-bold text-neutral-200 hover:bg-[#1C2538] flex items-center gap-2"
                              >
                                <Lock size={12} className="text-neutral-400" />
                                Reset Password
                              </button>
                              <button
                                onClick={() => onOpenSubModal(member)}
                                className="w-full px-4 py-2 text-left text-xs font-bold text-neutral-200 hover:bg-[#1C2538] flex items-center gap-2"
                              >
                                <CreditCard size={12} className="text-neutral-400" />
                                Subscription dates
                              </button>
                              
                              {member.membershipStatus === 'ACTIVE' ? (
                                <button
                                  onClick={() => onUpdateStatus(member.uid, 'SUSPENDED')}
                                  className="w-full px-4 py-2 text-left text-xs font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                >
                                  <UserMinus size={12} className="text-red-400" />
                                  Suspend Member
                                </button>
                              ) : (
                                <button
                                  onClick={() => onUpdateStatus(member.uid, 'ACTIVE')}
                                  className="w-full px-4 py-2 text-left text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"
                                >
                                  <UserCheck size={12} className="text-emerald-400" />
                                  Activate Member
                                </button>
                              )}
                              
                              <div className="border-t border-white/5 my-1" />
                              <button
                                onClick={() => onDeleteMember(member)}
                                className="w-full px-4 py-2 text-left text-xs font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                              >
                                <Trash2 size={12} className="text-red-400" />
                                Delete Account
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                          Roster
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">No members found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {members.length > 0 ? (
          members.map((member) => (
            <div key={member.uid} className="bg-card p-5 rounded-[24px] border border-white/5 shadow-card space-y-4 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <Avatar src={member.photoURL} name={member.name} size="w-12 h-12" className="rounded-[12px] border border-white/5 shrink-0 shadow-sm" fallbackClassName="rounded-[12px] text-lg" />
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm leading-tight truncate mb-1.5">{member.name || member.displayName}</p>
                    <div className="flex flex-col gap-0.5 text-[11px] font-medium text-neutral-400">
                      <div>
                        <span className="text-neutral-500 font-semibold text-[9px] uppercase tracking-wider mr-1">Chapter:</span> 
                        {member.chapterName || (member.chapter_id ? (adminMap[member.chapter_id] ? adminMap[member.chapter_id].replace(' Admin', '') : 'SSK Chapter') : 'SSK Chapter')}
                      </div>
                      {(getDisplayPosition(member.position, member.role) !== '') && (
                              <div>
                                <span className="text-neutral-500 font-semibold text-[9px] uppercase tracking-wider mr-1">Position:</span> 
                                <span className="text-primary font-bold">
                                  {getDisplayPosition(member.position, member.role)}
                                </span>
                              </div>
                            )}
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone size={9} className="text-neutral-500" />
                        <span>{member.phone || 'No Phone'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={cn(
                  "inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border leading-tight shrink-0",
                  isMemberActive(member) ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"
                )}>
                  {isMemberActive(member) ? 'ACTIVE' : 'INACTIVE'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 p-3.5 bg-[#151C2E] rounded-[16px] border border-white/5">
                <div>
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Business</p>
                  <p className="text-xs font-bold text-white truncate">{member.businessName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Category</p>
                  <p className="text-xs font-bold text-primary truncate">{member.category || 'General'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-neutral-400 font-medium">
                <div>
                  <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Joined On</p>
                  <p className="text-xs font-bold text-neutral-200">
                    {member.createdAt ? format(new Date(member.createdAt), 'dd/MM/yyyy') : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Chapter Admin</p>
                  <p className="text-xs font-bold text-neutral-200 truncate max-w-[140px]">
                    {((member as any).created_by || member.adminId) ? (adminMap[(member as any).created_by || member.adminId || ''] || (member as any).createdByName || 'Master Admin') : 'Master Admin'}
                  </p>
                </div>
              </div>

              {/* Mobile Admin Action bar */}
              {showActions && (
                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => navigate(`/profile?id=${member.uid}`)}
                    className="h-8 px-2.5 bg-[#151C2E] text-neutral-200 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 hover:bg-[#1C2538]"
                  >
                    <Eye size={10} />
                    View
                  </button>
                  {currentUserId === member.uid && (<button
                    onClick={() => onEditMember(member)}
                    className="h-8 px-2.5 bg-[#151C2E] text-neutral-200 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 hover:bg-[#1C2538]"
                  >
                    <Edit2 size={10} />
                    Edit
                  </button>)}
                  <button
                    onClick={() => onResetPassword(member)}
                    className="h-8 px-2.5 bg-[#151C2E] text-neutral-200 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 hover:bg-[#1C2538]"
                  >
                    <Lock size={10} />
                    Reset
                  </button>
                  <button
                    onClick={() => onOpenSubModal(member)}
                    className="h-8 px-2.5 bg-[#151C2E] text-neutral-200 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 hover:bg-[#1C2538]"
                  >
                    <CreditCard size={10} />
                    Sub
                  </button>
                  
                  {member.membershipStatus === 'ACTIVE' ? (
                    <button
                      onClick={() => onUpdateStatus(member.uid, 'SUSPENDED')}
                      className="h-8 px-3.5 bg-red-500/10 text-red-400 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 hover:bg-red-500/20"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(member.uid, 'ACTIVE')}
                      className="h-8 px-3.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 hover:bg-emerald-500/20"
                    >
                      Activate
                    </button>
                  )}
                  
                  <button
                    onClick={() => onDeleteMember(member)}
                    className="h-8 w-8 bg-red-500/10 text-red-400 rounded-lg flex items-center justify-center transition-all active:scale-95 hover:bg-red-500/20"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-card p-12 rounded-[24px] border border-white/5 text-center shadow-card">
            <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">No members found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
