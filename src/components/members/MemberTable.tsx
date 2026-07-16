import React, { useState } from 'react';
import { Phone, Briefcase, Tags, UserCheck, UserMinus, CreditCard, Trash2, Building2, CreditCard as Edit2, Shield, TriangleAlert as AlertTriangle, Bell, Users, Settings, MapPin, Calendar, MoveVertical as MoreVertical } from 'lucide-react';
import { UserProfile } from '../../types';
import { cn } from '../../lib/utils';
import { differenceInDays, format } from 'date-fns';
import { usePositions } from '../../hooks/usePositions';
import { useNavigate } from 'react-router-dom';

interface MemberTableProps {
  members: UserProfile[];
  adminMap: Record<string, string>;
  loading: boolean;
  isMasterAdmin: boolean;
  isChapterAdmin: boolean;
  onUpdateStatus: (uid: string, status: UserProfile['membershipStatus']) => void;
  onOpenSubModal: (member: UserProfile) => void;
  onEditMember: (member: UserProfile) => void;
  onDeleteMember: (member: UserProfile) => void;
}

export function MemberTable({
  members,
  adminMap,
  loading,
  isMasterAdmin,
  isChapterAdmin,
  onUpdateStatus,
  onOpenSubModal,
  onEditMember,
  onDeleteMember
}: MemberTableProps) {
  const navigate = useNavigate();
  const { getPositionForUser } = usePositions();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const getPositionText = (userId: string) => {
    const position = getPositionForUser(userId);
    if (!position) return null;
    return (
      <span className="text-[9px] font-black text-primary uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
        {position}
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
      <div className="bg-white rounded-[20px] border border-neutral-200/80 p-16 text-center shadow-sm shadow-neutral-200/50">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-neutral-500 font-bold">Loading roster...</p>
      </div>
    );
  }

  const showActions = isMasterAdmin || isChapterAdmin;

  return (
    <div className="space-y-6">
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-[20px] border border-neutral-200/80 shadow-sm shadow-neutral-200/50 overflow-visible">
        <div className="overflow-visible">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-neutral-50/80 border-b border-neutral-200/80">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider w-[32%]">Member</th>
                <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider w-[28%]">Business & Sector</th>
                <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider w-[18%]">Chapter Admin</th>
                <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider w-[12%]">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-right w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 overflow-visible">
              {members.length > 0 ? (
                members.map((member) => (
                  <tr key={member.uid} className="hover:bg-neutral-50/80 transition-colors group overflow-visible">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-full bg-neutral-100 border border-neutral-200/60 overflow-hidden shrink-0 shadow-sm">
                          <img 
                            src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || '')}&background=random`} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-bold text-neutral-900 text-[14px] leading-tight truncate">{member.name || member.displayName}</p>
                            {getPositionText(member.uid)}
                          </div>
                          <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-medium">
                            <Phone size={11} className="text-neutral-400" />
                            <span>{member.phone || 'No phone'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1.5">
                        <p className="text-[14px] font-bold text-neutral-900 truncate leading-snug">
                          {member.businessName || 'N/A'}
                        </p>
                        <span className="inline-flex items-center text-[10px] text-primary font-bold bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                          {member.category || 'General'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-neutral-50 rounded-lg flex items-center justify-center text-neutral-400 border border-neutral-100">
                          <Shield size={11} />
                        </div>
                        <span className="text-[14px] font-semibold text-neutral-600 truncate max-w-[150px]">
                          {member.associatedChapterAdminId ? (adminMap[member.associatedChapterAdminId] || 'Unknown Admin') : (member.adminId ? (adminMap[member.adminId] || 'Unknown Admin') : 'Not Assigned')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border leading-tight",
                          member.membershipStatus === 'ACTIVE' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          member.membershipStatus === 'SUSPENDED' ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full animate-pulse-subtle",
                            member.membershipStatus === 'ACTIVE' ? "bg-emerald-500" :
                            member.membershipStatus === 'SUSPENDED' ? "bg-red-500" :
                            "bg-amber-500"
                          )} />
                          {member.membershipStatus}
                        </div>
                        {member.subscriptionEnd && (
                          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wide">
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
                            className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-700 transition-all active:scale-90"
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {activeMenuId === member.uid && (
                            <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl border border-neutral-200/80 shadow-xl shadow-neutral-300/30 py-1 z-[999] animate-in fade-in slide-in-from-top-2 duration-150">
                              <button
                                onClick={() => onEditMember(member)}
                                className="w-full px-4 py-2.5 text-left text-sm font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2.5 transition-colors"
                              >
                                <Edit2 size={14} className="text-neutral-400" />
                                Edit Profile
                              </button>
                              <button
                                onClick={() => onOpenSubModal(member)}
                                className="w-full px-4 py-2.5 text-left text-sm font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2.5 transition-colors"
                              >
                                <CreditCard size={14} className="text-neutral-400" />
                                Subscription dates
                              </button>
                              
                              {member.membershipStatus === 'ACTIVE' ? (
                                <button
                                  onClick={() => onUpdateStatus(member.uid, 'SUSPENDED')}
                                  className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                                >
                                  <UserMinus size={14} className="text-red-400" />
                                  Suspend Member
                                </button>
                              ) : (
                                <button
                                  onClick={() => onUpdateStatus(member.uid, 'ACTIVE')}
                                  className="w-full px-4 py-2.5 text-left text-sm font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors"
                                >
                                  <UserCheck size={14} className="text-emerald-400" />
                                  Activate Member
                                </button>
                              )}
                              
                              <div className="border-t border-neutral-100 my-1" />
                              <button
                                onClick={() => onDeleteMember(member)}
                                className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                              >
                                <Trash2 size={14} className="text-red-400" />
                                Delete Account
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-neutral-400">
                          Roster
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 bg-neutral-100 text-neutral-300 rounded-full flex items-center justify-center">
                        <Users size={28} />
                      </div>
                      <p className="text-sm font-bold text-neutral-500">No members found</p>
                      <p className="text-xs text-neutral-400 font-medium">Try adjusting your search or filters</p>
                    </div>
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
            <div key={member.uid} className="bg-white p-5 rounded-[20px] border border-neutral-200/80 shadow-sm shadow-neutral-200/50 space-y-4 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200/60 overflow-hidden shrink-0 shadow-sm">
                    <img 
                      src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || '')}&background=random`} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-neutral-900 text-[14px] leading-tight truncate">{member.name || member.displayName}</p>
                      {getPositionText(member.uid)}
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-medium mt-1">
                      <Phone size={11} className="text-neutral-400" />
                      <span>{member.phone || 'No phone'}</span>
                    </div>
                  </div>
                </div>
                
                <div className={cn(
                  "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border leading-tight shrink-0",
                  member.membershipStatus === 'ACTIVE' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  member.membershipStatus === 'SUSPENDED' ? "bg-red-50 text-red-700 border-red-200" :
                  "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  {member.membershipStatus}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 p-3.5 bg-neutral-50/80 rounded-[16px] border border-neutral-200/60">
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Business</p>
                  <p className="text-[14px] font-bold text-neutral-800 truncate">{member.businessName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Category</p>
                  <p className="text-[14px] font-bold text-primary truncate">{member.category || 'General'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-xs text-neutral-500 font-medium">
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Joined on</p>
                  <p className="text-[14px] font-bold text-neutral-700">
                    {member.createdAt ? format(new Date(member.createdAt), 'dd/MM/yyyy') : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Chapter Admin</p>
                  <p className="text-[14px] font-bold text-neutral-700 truncate max-w-[140px]">
                    {member.associatedChapterAdminId ? (adminMap[member.associatedChapterAdminId] || 'Unknown Admin') : (member.adminId ? (adminMap[member.adminId] || 'Unknown Admin') : 'Not Assigned')}
                  </p>
                </div>
              </div>

              {/* Mobile Admin Action bar */}
              {showActions && (
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEditMember(member)}
                    className="h-9 px-3.5 bg-neutral-100 text-neutral-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 hover:bg-neutral-200"
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => onOpenSubModal(member)}
                    className="h-9 px-3.5 bg-neutral-100 text-neutral-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 hover:bg-neutral-200"
                  >
                    <CreditCard size={12} />
                    Sub
                  </button>
                  
                  {member.membershipStatus === 'ACTIVE' ? (
                    <button
                      onClick={() => onUpdateStatus(member.uid, 'SUSPENDED')}
                      className="h-9 px-3.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 hover:bg-red-100"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(member.uid, 'ACTIVE')}
                      className="h-9 px-3.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 hover:bg-emerald-100"
                    >
                      Activate
                    </button>
                  )}
                  
                  <button
                    onClick={() => onDeleteMember(member)}
                    className="h-9 w-9 bg-red-50 text-red-600 rounded-xl flex items-center justify-center transition-all active:scale-95 hover:bg-red-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-[18px] border border-2 border-dashed border-neutral-300/80 text-center">
            <div className="w-14 h-14 bg-neutral-100 text-neutral-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={28} />
            </div>
            <p className="text-sm font-bold text-neutral-500">No members found</p>
            <p className="text-xs text-neutral-400 font-medium mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
