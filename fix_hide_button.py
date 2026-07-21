import re

with open('src/components/MemberCompanionView.tsx', 'r') as f:
    content = f.read()

# Replace the conditional rendering
old_render = """              ) : (
                <div className="flex flex-col items-center md:items-end gap-1.5 w-full">
                  <motion.button 
                    onClick={isEligibleForRenewal ? handleRequestRenewal : undefined}
                    disabled={!isEligibleForRenewal || isSubmitting}
                    whileHover={isEligibleForRenewal ? { scale: 1.03, y: -2, boxShadow: "0 0 15px rgba(229,57,53,0.3)" } : {}}
                    whileTap={isEligibleForRenewal ? { scale: 0.97 } : {}}
                    className={cn(
                      "w-full md:w-auto text-white px-5 py-2.5 rounded-[16px] font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-lg transition-all",
                      isEligibleForRenewal 
                        ? "bg-gradient-to-r from-red-600 to-[#E53935] hover:opacity-90 shadow-red-900/30 cursor-pointer"
                        : "bg-[#1F2937]/50 text-[#6B7280] border border-white/5 cursor-not-allowed shadow-none"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Upgrade / Renew Membership
                        <ChevronRight size={14} />
                      </>
                    )}
                  </motion.button>
                  {!isEligibleForRenewal && (
                    <span className="text-[10px] text-[#6B7280] font-medium text-center md:text-right">
                      Enabled only within 30 days of expiry.
                    </span>
                  )}
                </div>
              )}"""

new_render = """              ) : isEligibleForRenewal ? (
                <div className="flex flex-col items-center md:items-end gap-1.5 w-full">
                  <motion.button 
                    onClick={handleRequestRenewal}
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.03, y: -2, boxShadow: "0 0 15px rgba(229,57,53,0.3)" }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "w-full md:w-auto text-white px-5 py-2.5 rounded-[16px] font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-lg transition-all",
                      "bg-gradient-to-r from-red-600 to-[#E53935] hover:opacity-90 shadow-red-900/30 cursor-pointer"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Renew Subscription
                        <ChevronRight size={14} />
                      </>
                    )}
                  </motion.button>
                </div>
              ) : null}"""

content = content.replace(old_render, new_render)

with open('src/components/MemberCompanionView.tsx', 'w') as f:
    f.write(content)
