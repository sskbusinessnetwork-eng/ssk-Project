import React from 'react';
import { LogIn } from 'lucide-react';
import { signIn } from '../firebase';

export function AuthButton() {
  return (
    <button
      onClick={signIn}
      className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-full font-semibold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
    >
      <LogIn size={20} />
      <span>Join the Network</span>
    </button>
  );
}
