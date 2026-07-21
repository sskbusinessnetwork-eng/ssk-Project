import re
with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

# I need to add state for locationSelection
state_pattern = r'  const \[historyType, setHistoryType\] = useState<\'scheduled\' \| \'attended\' \| \'all\'>\(\'all\'\);'
state_replacement = """  const [historyType, setHistoryType] = useState<'scheduled' | 'attended' | 'all'>('all');
  const [locationSelection, setLocationSelection] = useState('');"""
content = re.sub(state_pattern, state_replacement, content)

# I need to update the onChange of participant to clear locationSelection
participant_onChange_pattern = r"                              setFormData\(prev => \(\{ \.\.\.prev, participantId: member\.uid, venue: '' \}\)\);"
participant_onChange_replacement = """                              setFormData(prev => ({ ...prev, participantId: member.uid, venue: '' }));
                              setLocationSelection('');"""
content = re.sub(participant_onChange_pattern, participant_onChange_replacement, content)

# I need to update the venue select and add text field
old_select = r"""            \{formData\.participantId && \(
              <div className="space-y-2">
                <label className="text-\[10px\] font-bold text-neutral-400 uppercase tracking-\[0\.2em\]">Meeting Location</label>
                <select
                  required
                  value=\{formData\.venue\}
                  onChange=\{\(e\) => setFormData\(\{ \.\.\.formData, venue: e\.target\.value \}\)\}
                  className="w-full px-4 py-4 rounded-\[16px\] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm bg-\[\#151C2E\] text-white"
                >
                  <option value="" className="bg-\[\#111827\] text-white">Select a location\.\.\.</option>
                  \{locationOptions\.map\(\(opt, idx\) => \(
                    <option key=\{idx\} value=\{opt\.value\} className="bg-\[\#111827\] text-white">\{opt\.label\}</option>
                  \)\)\}
                </select>
              </div>
            \)\}"""

new_select = """            {formData.participantId && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Meeting Location</label>
                  <select
                    required
                    value={locationSelection}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocationSelection(val);
                      if (val !== 'Other') {
                        setFormData({ ...formData, venue: val });
                      } else {
                        setFormData({ ...formData, venue: '' });
                      }
                    }}
                    className="w-full px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm bg-[#151C2E] text-white"
                  >
                    <option value="" className="bg-[#111827] text-white">Select a location...</option>
                    {locationOptions.map((opt, idx) => (
                      <option key={idx} value={opt.value} className="bg-[#111827] text-white">{opt.label}</option>
                    ))}
                  </select>
                </div>
                
                {locationSelection === 'Other' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Enter Meeting Location</label>
                    <input
                      required
                      type="text"
                      placeholder="E.g., Starbucks, MG Road"
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                      className="w-full px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm bg-[#151C2E] text-white"
                    />
                  </div>
                )}
              </div>
            )}"""

content = re.sub(old_select, new_select, content)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
