import re

with open('src/components/CreateChapter.tsx', 'r') as f:
    content = f.read()

# Replace auth_data insertion
insertion_pattern = r"await setDoc\(doc\(db, 'auth_data', uid\), \{\s*id: uid,\s*uid: uid,\s*password: defaultPassword,\s*phone: phone,\s*updatedAt: new Date\(\)\.toISOString\(\)\s*\}\);"

replacement_insertion = """const { error: signUpError } = await tempSupabase.auth.signUp({
            phone: phone,
            password: defaultPassword,
          });
          if (signUpError && signUpError.message !== 'User already registered') {
            throw new Error(`Authentication account creation failed for ${leader.fullName}: ${signUpError.message}`);
          }"""

content = re.sub(insertion_pattern, replacement_insertion, content)

# Replace auth_data deletion
deletion_pattern = r"await supabase\.from\('auth_data'\)\.delete\(\)\.in\('id', createdUsers\);"
content = re.sub(deletion_pattern, "", content)

# Add tempSupabase
import_pattern = r"import \{ supabase \} from '\.\./lib/supabaseClient';"
import_replacement = """import { supabase } from '../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';

const tempSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://wfbkgfotpzscjyaanzpx.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4',
  { auth: { persistSession: false, autoRefreshToken: false } }
);"""

if "createClient" not in content:
    content = content.replace("import { supabase } from '../lib/supabaseClient';", import_replacement)

with open('src/components/CreateChapter.tsx', 'w') as f:
    f.write(content)
