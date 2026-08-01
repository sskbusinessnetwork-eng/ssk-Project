const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetFuncStart = '  const renderAnalyticsDetails = () => {';

const targetBlockStart = 'if (!analyticsModalCategory) return null;';

const replacement = `if (!analyticsModalCategory) return null;

    if (analyticsLoading) {
      return (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-5 bg-gradient-to-b from-[#151C2E] to-[#111827] rounded-[20px] border border-white/5 shadow-xl flex flex-col gap-4 animate-pulse">
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-white/5 shrink-0" />
                  <div className="flex flex-col gap-2">
                    <div className="w-32 h-4 bg-white/10 rounded-md" />
                    <div className="w-24 h-3 bg-white/5 rounded-md" />
                  </div>
                </div>
                <div className="w-16 h-6 bg-white/10 rounded-md shrink-0" />
              </div>
              <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                <div className="flex justify-between">
                  <div className="w-12 h-3 bg-white/5 rounded-md" />
                  <div className="w-20 h-3 bg-white/10 rounded-md" />
                </div>
                <div className="flex justify-between">
                  <div className="w-16 h-3 bg-white/5 rounded-md" />
                  <div className="w-24 h-3 bg-white/10 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (analyticsError) {
      return (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-red-500/10 rounded-[24px] flex items-center justify-center mb-6 border border-red-500/20 shadow-2xl">
            <AlertTriangle className="text-red-400 w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Failed to load records</h3>
          <p className="text-neutral-400 text-sm max-w-sm mb-8 leading-relaxed">
            There was an error while preparing the data. Please try again.
          </p>
          <button 
            onClick={() => {
              setAnalyticsLoading(true);
              setAnalyticsError(false);
              setTimeout(() => setAnalyticsLoading(false), 600);
            }}
            className="px-6 py-3 bg-[#151C2E] hover:bg-[#1E293B] border border-white/5 text-white rounded-[12px] font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2"
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      );
    }`;

code = code.replace(targetBlockStart, replacement);
fs.writeFileSync(file, code);
console.log('Patched loading/error state');
