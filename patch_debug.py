import re
with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

debug_ui = """                <AlertCircle size={18} />
                {error}
              </div>
            )}
            
            <div className="text-white text-xs mb-4">
              DEBUG: members length: {members.length}, profile chapter: {profile?.chapter_id || 'N/A'}, isAdmin: {isAdmin ? 'yes' : 'no'}
            </div>
            
            {/* Member Selection - Searchable Dropdown */}"""

content = content.replace("                <AlertCircle size={18} />\n                {error}\n              </div>\n            )}\n            {/* Member Selection - Searchable Dropdown */}", debug_ui)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
