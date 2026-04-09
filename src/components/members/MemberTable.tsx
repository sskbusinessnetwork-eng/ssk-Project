import React from 'react';
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
  Users
} from 'lucide-react';
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

  const getPositionText = (userId: string) => {
    const position = getPositionForUser(userId);
    if (!position) return null;
    return (
      <span className="text-[10px] font-bold text-primary uppercase tracking-tight bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
        {position}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-[20px] card-shadow border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Member</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Business & Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Chapter Admin</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Date of Joining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.length > 0 ? (
                members.map((member) => (
                  <tr key={member.uid} className="hover:bg-muted/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted border border-border overflow-hidden shrink-0">
                          <img 
                            src={member.photoURL || `https://picsum.photos/seed/${member.uid}/80/80`} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-text-primary text-sm truncate">{member.name || member.displayName}</p>
                            {getPositionText(member.uid)}
                          </div>
                          <p className="text-[11px] text-text-secondary font-medium truncate">
                            {member.phone || 'No Phone'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-text-primary truncate">
                          {member.businessName || 'N/A'}
                        </p>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10 w-fit">
                          {member.category || 'General'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-muted rounded-md flex items-center justify-center text-text-secondary">
                          <Shield size={12} />
                        </div>
                        <span className="text-xs font-bold text-text-primary">
                          {member.associatedChapterAdminId ? (adminMap[member.associatedChapterAdminId] || 'Unknown Admin') : (member.adminId ? (adminMap[member.adminId] || 'Unknown Admin') : 'Not Assigned')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className={cn(
                          "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border w-fit",
                          member.membershipStatus === 'ACTIVE' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          member.membershipStatus === 'SUSPENDED' ? "bg-rose-50 text-rose-600 border-rose-100" :
                          "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            member.membershipStatus === 'ACTIVE' ? "bg-emerald-500" :
                            member.membershipStatus === 'SUSPENDED' ? "bg-rose-500" :
                            "bg-amber-500"
                          )} />
                          {member.membershipStatus}
                        </div>
                        {member.subscriptionEnd && (
                          <p className="text-[9px] text-text-secondary font-medium">
                            Exp: {format(new Date(member.subscriptionEnd), 'dd/MM/yyyy')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-xs font-bold text-text-primary">
                        {member.createdAt ? format(new Date(member.createdAt), 'dd/MM/yyyy') : 'N/A'}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-sm font-bold text-text-secondary uppercase tracking-widest">No members found.</p>
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
            <div key={member.uid} className="bg-white p-4 rounded-[20px] card-shadow border border-border space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted border border-border overflow-hidden shrink-0">
                  <img 
                    src={member.photoURL || `https://picsum.photos/seed/${member.uid}/100/100`} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-text-primary text-base truncate">{member.name || member.displayName}</p>
                    {getPositionText(member.uid)}
                  </div>
                  <p className="text-xs text-text-secondary font-medium">{member.phone || 'No Phone'}</p>
                </div>
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                  member.membershipStatus === 'ACTIVE' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {member.membershipStatus}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-xl">
                <div>
                  <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Business</p>
                  <p className="text-xs font-bold text-text-primary truncate">{member.businessName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Category</p>
                  <p className="text-xs font-bold text-primary truncate">{member.category || 'General'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Joined On</p>
                  <p className="text-xs font-bold text-text-primary">
                    {member.createdAt ? format(new Date(member.createdAt), 'dd/MM/yyyy') : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Chapter Admin</p>
                  <p className="text-xs font-bold text-text-primary truncate max-w-[120px]">
                    {member.associatedChapterAdminId ? (adminMap[member.associatedChapterAdminId] || 'Unknown Admin') : (member.adminId ? (adminMap[member.adminId] || 'Unknown Admin') : 'Not Assigned')}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-8 rounded-[20px] card-shadow border border-border text-center">
            <p className="text-sm font-bold text-text-secondary uppercase tracking-widest">No members found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
