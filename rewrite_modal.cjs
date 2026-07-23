const fs = require('fs');
let code = fs.readFileSync('src/pages/Guests.tsx', 'utf8');

const modalRegex = /<Modal\s+isOpen=\{isModalOpen\}[\s\S]*?<\/Modal>/;

const newModal = `<Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setShowSuccess(false);
            setLastCreatedInvitation(null);
          }
        }}
        title="Invite a New Guest"
      >
        {showSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Invitation Sent!</h3>
            <p className="text-neutral-400 mb-8 max-w-sm">
              The invitation has been saved and the WhatsApp message is ready to be sent.
            </p>
            <div className="flex gap-4 w-full">
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setIsModalOpen(false);
                  setLastCreatedInvitation(null);
                }}
                className="w-full py-4 bg-[#151C2E] text-white rounded-[12px] font-bold hover:bg-[#1C2538] transition-all border border-white/5"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-[12px] flex items-start gap-3">
                <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Guest Name <span className="text-red-400">*</span></label>
              <input
                required
                type="text"
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                placeholder="Enter guest name"
                className="w-full px-4 py-3 bg-[#151C2E] text-white border border-white/5 rounded-[12px] focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-neutral-600"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Guest Phone Number <span className="text-red-400">*</span></label>
              <input
                required
                type="tel"
                value={formData.guestPhone}
                onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                placeholder="+91"
                className="w-full px-4 py-3 bg-[#151C2E] text-white border border-white/5 rounded-[12px] focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-neutral-600"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Guest WhatsApp Number <span className="text-red-400">*</span></label>
              <input
                required
                type="tel"
                value={formData.guestWhatsapp}
                onChange={(e) => setFormData({ ...formData, guestWhatsapp: e.target.value })}
                placeholder="+91"
                className="w-full px-4 py-3 bg-[#151C2E] text-white border border-white/5 rounded-[12px] focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-neutral-600"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Business Category <span className="text-red-400">*</span></label>
              <select
                required
                value={formData.guestBusiness}
                onChange={(e) => setFormData({ ...formData, guestBusiness: e.target.value })}
                className="w-full px-4 py-3 bg-[#151C2E] text-white border border-white/5 rounded-[12px] focus:ring-2 focus:ring-primary outline-none transition-all"
              >
                <option value="" className="bg-[#111827] text-white">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name} className="bg-[#111827] text-white">{cat.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Meeting <span className="text-red-400">*</span></label>
              <select
                required
                value={formData.meetingId}
                onChange={(e) => setFormData({ ...formData, meetingId: e.target.value })}
                className="w-full px-4 py-3 bg-[#151C2E] text-white border border-white/5 rounded-[12px] focus:ring-2 focus:ring-primary outline-none transition-all"
              >
                <option value="" className="bg-[#111827] text-white">Select Upcoming Meeting</option>
                {upcomingMeetings.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#111827] text-white">
                    {m.title || 'Weekly Chapter Meeting'} - {format(new Date(m.date), 'dd MMM yyyy')} {m.time || '10:00 AM'} ({m.venue || m.location || 'SSK Business Hall'})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-primary text-white rounded-[12px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}
            </button>
          </form>
        )}
      </Modal>`;

code = code.replace(modalRegex, newModal);
fs.writeFileSync('src/pages/Guests.tsx', code);
