const fs = require('fs');

let content = fs.readFileSync('src/pages/Login.tsx', 'utf8');

// Remove firebase/auth imports
content = content.replace(/import \{.*\} from 'firebase\/auth';\n?/g, '');
content = content.replace(/import \{ auth, db \} from '\.\.\/lib\/firebase';\n?/g, "import { supabase } from '../lib/supabaseClient';\n");

// Replace ConfirmationResult usage
content = content.replace(/ConfirmationResult \| null/g, 'any | null');

// Replace signInWithPhoneNumber
content = content.replace(/const result = await signInWithPhoneNumber\(auth, normalizedPhone, appVerifier\);/g, `
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalizedPhone });
      if (otpError) throw otpError;
      const result = { confirm: async (code) => {
        const { data, error } = await supabase.auth.verifyOtp({ phone: normalizedPhone, token: code, type: 'sms' });
        if (error) throw error;
        return { user: { uid: data.user?.id } };
      } };
`);

// Replace sendPasswordResetEmail
content = content.replace(/await sendPasswordResetEmail\(auth, email\);/g, `
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      if (resetError) throw resetError;
`);

// Replace signOut(auth)
content = content.replace(/await signOut\(auth\);/g, `await supabase.auth.signOut();`);

fs.writeFileSync('src/pages/Login.tsx', content);
console.log('Login.tsx patched.');
