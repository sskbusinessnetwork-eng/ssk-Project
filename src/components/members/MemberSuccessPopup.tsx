import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, MessageCircle, Copy, X } from 'lucide-react';

interface MemberSuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  memberData: {
    name: string;
    userId: string;
    phone: string;
    password?: string;
  } | null;
}

export function MemberSuccessPopup({ isOpen, onClose, memberData }: MemberSuccessPopupProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !memberData) return null;

  const message = `Hello *${memberData.name}*,

Welcome to *Business Network*! 🎉

Your account has been created successfully.

Your login details are:

👤 User ID: ${memberData.userId}
📱 Mobile Number: ${memberData.phone}
🔑 Temporary Password: ${memberData.password}

Please log in using these credentials.

⚠️ For security reasons, you must change your password immediately after your first login.

Steps:
1. Log in to your account.
2. Enter your temporary password.
3. Create a new secure password.
4. Save the new password.
5. Your account will then be fully activated.

If you experience any issues, please contact your Chapter Admin.

Welcome aboard, and we wish you great success with Business Network! 🚀`;

  const handleSendWelcomeMessage = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${memberData.phone.replace(/\D/g, '')}?text=${encodedMessage}`;
    
    // Try to open WhatsApp
    const win = window.open(whatsappUrl, '_blank');
    if (!win) {
       // Fallback to copy if popup blocked
       navigator.clipboard.writeText(message)
         .then(() => {
           setCopied(true);
           setTimeout(() => setCopied(false), 2000);
           alert("Message copied successfully.");
         })
         .catch(err => console.error("Failed to copy:", err));
    }
  };

  const handleCopyCredentials = async () => {
    try {
      await navigator.clipboard.writeText(`User ID: ${memberData.userId}\nPhone: ${memberData.phone}\nTemporary Password: ${memberData.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#1A1F2B] border border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-full relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">✅ Member Created Successfully</h3>
          <p className="text-sm text-neutral-400 mb-6">
            The member account has been created successfully. You can now send the login credentials to activate their account.
          </p>

          <div className="w-full space-y-3">
            <button
              onClick={handleSendWelcomeMessage}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle size={16} />
              Send Welcome Message
            </button>

            <button
              onClick={handleCopyCredentials}
              className="w-full py-3 bg-[#0F172A] text-white border border-white/10 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
            >
              <Copy size={16} />
              {copied ? '✅ Credentials Copied!' : 'Copy Credentials'}
            </button>
            
            <button
              onClick={onClose}
              className="w-full py-3 text-neutral-400 font-bold uppercase tracking-wider text-xs hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
