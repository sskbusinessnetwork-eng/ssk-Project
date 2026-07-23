const fs = require('fs');
let code = fs.readFileSync('src/pages/Meetings.tsx', 'utf8');

const regex = /<Modal\s+isOpen=\{isUpdateModalOpen\}[\s\S]*?<\/Modal>/;
const match = code.match(regex);

if (match) {
  const newModalContent = `<Modal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsUpdateModalOpen(false);
            setError(null);
            setSuccess(null);
          }
        }}
        title="Update Meeting Data"
      >
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-[12px] text-sm font-bold flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-[12px] text-sm font-bold flex items-center gap-2">
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}
          <div className="p-4 bg-emerald-500/10 rounded-[16px] border border-emerald-500/20">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Meeting Update</p>
            <p className="text-sm font-bold text-white">Update attendance and amounts for Members and Guests</p>
          </div>
          
          {/* Members Section */}
          <div className="bg-[#111827] rounded-[16px] border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-[#151C2E]">
              <h3 className="text-sm font-bold text-white">Members</h3>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[600px] px-4 sm:px-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="py-3 px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Member</th>
                      <th className="py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">Attendance</th>
                      <th className="py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">Amount (₹)</th>
                      <th className="py-3 px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {members.filter(m => m.chapter_id === selectedMeeting?.adminId).map((member) => {
                      const status = tempAttendance[member.uid];
                      const amount = tempAmount[member.uid] || 0;
                      const note = tempMemberNotes[member.uid] || '';
                      return (
                        <tr key={member.uid} className="hover:bg-[#1C2538] transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={member.photoURL || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(member.name || '')}&background=random\`} 
                                className="w-8 h-8 rounded-lg shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-white truncate">{member.name || member.displayName}</p>
                                <p className="text-[10px] text-neutral-400 truncate">{member.businessName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            <select
                              id={\`attendance-select-\${member.uid}\`}
                              value={status || ''}
                              onChange={(e) => setTempAttendance(prev => ({ ...prev, [member.uid]: e.target.value as any }))}
                              className={cn(
                                "px-3 py-1.5 rounded-lg border focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold transition-all bg-[#151C2E] text-white border-white/5 cursor-pointer",
                                status === 'Yes' || status === 'PRESENT' ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" :
                                status === 'No' || status === 'ABSENT' ? "border-red-500/30 text-red-400 bg-red-500/10" :
                                status === 'Substitute' ? "border-amber-500/30 text-amber-400 bg-amber-500/10" :
                                "border-white/5 text-neutral-400"
                              )}
                            >
                              <option value="" className="bg-[#111827] text-white">Select Status</option>
                              <option value="Yes" className="bg-[#111827] text-white">Yes</option>
                              <option value="No" className="bg-[#111827] text-white">No</option>
                              <option value="Substitute" className="bg-[#111827] text-white">Substitute</option>
                            </select>
                          </td>
                          <td className="py-4">
                            <input
                              type="number"
                              value={amount}
                              onChange={(e) => setTempAmount(prev => ({ ...prev, [member.uid]: parseInt(e.target.value) || 0 }))}
                              className="w-20 px-2 py-1.5 rounded-lg border border-white/5 bg-[#151C2E] focus:ring-2 focus:ring-blue-500 outline-none text-right text-sm font-bold text-white float-right"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="text"
                              value={note}
                              onChange={(e) => setTempMemberNotes(prev => ({ ...prev, [member.uid]: e.target.value }))}
                              placeholder="Private note..."
                              className="w-full px-2 py-1.5 rounded-lg border border-white/5 bg-[#151C2E] focus:ring-2 focus:ring-indigo-500 outline-none text-xs text-white placeholder-neutral-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Guests Section */}
          <div className="bg-[#111827] rounded-[16px] border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-[#151C2E]">
              <h3 className="text-sm font-bold text-white">Guests</h3>
            </div>
            {meetingGuests.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="min-w-[600px] px-4 sm:px-0">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="py-3 px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Guest Info</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Invited By</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {meetingGuests.map((guest) => {
                        const status = tempGuestAttendance[guest.id] || '';
                        const inviter = guestInviters[guest.invited_by];
                        
                        return (
                          <tr key={guest.id} className="hover:bg-[#1C2538] transition-colors">
                            <td className="py-4 px-4">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-white truncate">{guest.guest_name}</p>
                                <p className="text-[10px] text-neutral-400 truncate mt-0.5">{guest.business_category} • {guest.guest_phone}</p>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-emerald-400 truncate">{inviter?.name || guest.invited_by_name || 'Member'}</p>
                                <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                                  {inviter?.position || 'Member'} • {inviter?.chapter_id || guest.invited_by_chapter || 'Chapter'}
                                </p>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <select
                                value={status}
                                onChange={(e) => setTempGuestAttendance(prev => ({ ...prev, [guest.id]: e.target.value }))}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg border focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold transition-all bg-[#151C2E] text-white border-white/5 cursor-pointer",
                                  status === 'Present' ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" :
                                  status === 'Absent' ? "border-red-500/30 text-red-400 bg-red-500/10" :
                                  "border-white/5 text-neutral-400"
                                )}
                              >
                                <option value="" className="bg-[#111827] text-white">Select Status</option>
                                <option value="Present" className="bg-[#111827] text-white">Present</option>
                                <option value="Absent" className="bg-[#111827] text-white">Absent</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-sm font-medium text-neutral-400">
                No guests invited for this meeting.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-500/10 rounded-[16px] border border-emerald-500/20">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Total Present</p>
              <p className="text-xl font-bold text-emerald-400 flex items-end gap-2">
                {Object.values(tempAttendance).filter(s => s === 'PRESENT' || s === 'Yes' || s === 'Substitute').length}
                {Object.values(tempGuestAttendance).filter(s => s === 'Present').length > 0 && (
                  <span className="text-xs text-emerald-400/70 font-medium mb-1">
                    (+{Object.values(tempGuestAttendance).filter(s => s === 'Present').length} Guests)
                  </span>
                )}
              </p>
            </div>
            <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 text-right">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Total Collected</p>
              <p className="text-xl font-bold text-white">
                ₹{Object.values(tempAmount).reduce((a, b) => a + (parseInt(b) || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveUpdate}
            disabled={isSubmitting}
            className="w-full py-4 bg-primary text-white rounded-[12px] font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
          >
            {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save & Complete Meeting'}
          </button>
        </div>
      </Modal>`;

  code = code.replace(regex, newModalContent);
  fs.writeFileSync('src/pages/Meetings.tsx', code);
  console.log('Update Modal rewritten.');
} else {
  console.log('Update Modal not found!');
}
