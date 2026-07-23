import re

with open("src/pages/Members.tsx", "r") as f:
    content = f.read()

old_btn = """            <button 
              onClick={() => {
                setActiveTab('positions');
                setSearchParams({ tab: 'positions' });
              }}
              className={cn(
                "px-6 py-2 text-xs font-bold rounded-lg transition-all",
                activeTab === 'positions' ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-500/10" : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              Positions
            </button>"""

new_btn = """            {isMasterAdmin && (
              <button 
                onClick={() => {
                  setActiveTab('positions');
                  setSearchParams({ tab: 'positions' });
                }}
                className={cn(
                  "px-6 py-2 text-xs font-bold rounded-lg transition-all",
                  activeTab === 'positions' ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-500/10" : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                Positions
              </button>
            )}"""

content = content.replace(old_btn, new_btn)

with open("src/pages/Members.tsx", "w") as f:
    f.write(content)
