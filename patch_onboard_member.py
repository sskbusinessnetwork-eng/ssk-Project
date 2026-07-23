import re

with open('src/pages/OnboardMember.tsx', 'r') as f:
    content = f.read()

# Add tempSupabase
import_pattern = r"import \{ db, collection, doc, setDoc, getDoc, updateDoc, deleteDoc \} from '\.\./lib/database';"
import_replacement = """import { db, collection, doc, setDoc, getDoc, updateDoc, deleteDoc } from '../lib/database';
import { createClient } from '@supabase/supabase-js';

const tempSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://wfbkgfotpzscjyaanzpx.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4',
  { auth: { persistSession: false, autoRefreshToken: false } }
);"""

if "createClient" not in content:
    content = content.replace("import { db, collection, doc, setDoc, getDoc, updateDoc, deleteDoc } from '../lib/database';", import_replacement)

# Remove auth_data update phone
content = re.sub(r"// Update phone in auth_data just in case\s*await setDoc\(doc\(db, 'auth_data', editingId\), \{\s*phone: formData\.phone\s*\}, \{ merge: true \}\);", "", content)

# Replace auth_data creation
creation_pattern = r"await setDoc\(doc\(db, 'auth_data', uid\), \{\s*password: 'Welcometosskbusiness',\s*phone: formData\.phone\s*\}\);"
creation_replacement = """const { error: signUpError } = await tempSupabase.auth.signUp({
          phone: formData.phone,
          password: 'Welcometosskbusiness',
        });
        if (signUpError && signUpError.message !== 'User already registered') {
          console.warn(`Authentication account creation failed: ${signUpError.message}`);
        }"""
content = re.sub(creation_pattern, creation_replacement, content)

# Remove auth_data reset password
content = re.sub(r"await setDoc\(doc\(db, 'auth_data', uid\), \{ password: 'Welcometosskbusiness' \}, \{ merge: true \}\);", "", content)
# Add update to users table for password
content = re.sub(r"await updateDoc\(doc\(db, 'users', uid\), \{ must_change_password: true \}\);", r"await updateDoc(doc(db, 'users', uid), { must_change_password: true, password: 'Welcometosskbusiness' });", content)

# Remove auth_data delete
content = re.sub(r"await deleteDoc\(doc\(db, 'auth_data', uid\)\);", "", content)

with open('src/pages/OnboardMember.tsx', 'w') as f:
    f.write(content)
