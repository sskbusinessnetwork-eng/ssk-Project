const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `<Modal 
        isOpen={analyticsModalCategory !== null} 
        onClose={() => setAnalyticsModalCategory(null)} 
        title={analyticsModalCategory || ''} 
        maxWidth="max-w-6xl" 
      > 
        {renderAnalyticsDetails()} 
      </Modal>`;

const replacement = `<AnimatePresence>
        {analyticsModalCategory !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAnalyticsModalCategory(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md transition-all duration-500"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-6xl max-h-[90vh] flex flex-col bg-[#0B1220] rounded-[24px] shadow-[0_16px_64px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden"
            >
              {/* Header */}
              <div className="shrink-0 p-6 sm:p-8 border-b border-white/5 relative overflow-hidden bg-[#111827]">
                <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[200%] bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="flex items-start justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[16px] bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Activity size={24} className="text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{analyticsModalCategory}</h2>
                      <p className="text-[10px] sm:text-xs font-bold text-neutral-400 mt-1.5 uppercase tracking-widest">Detailed Activity & Records</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAnalyticsModalCategory(null)}
                    className="p-2.5 sm:p-3 bg-white/5 hover:bg-white/10 rounded-[12px] border border-white/5 transition-all text-neutral-400 hover:text-white group shrink-0"
                  >
                    <X size={20} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
              
              {/* Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 bg-gradient-to-b from-[#0B1220] to-[#111827]">
                {renderAnalyticsDetails()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('Replaced successfully');
} else {
  // Try to find it line by line or with regex in case of different formatting
  const targetRegex = /<Modal\s*isOpen=\{analyticsModalCategory !== null\}\s*onClose=\{\(\) => setAnalyticsModalCategory\(null\)\}\s*title=\{analyticsModalCategory \|\| ''\}\s*maxWidth="max-w-6xl"\s*>\s*\{renderAnalyticsDetails\(\)\}\s*<\/Modal>/g;
  if (targetRegex.test(code)) {
    code = code.replace(targetRegex, replacement);
    fs.writeFileSync(file, code);
    console.log('Replaced successfully via regex');
  } else {
    console.log('Target not found in code');
  }
}
