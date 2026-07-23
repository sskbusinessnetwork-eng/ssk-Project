import re

with open('src/components/members/AddMemberForm.tsx', 'r') as f:
    content = f.read()

# Add tempSupabase
import_pattern = r"import \{ supabase \} from '\.\./\.\./lib/supabaseClient';"
import_replacement = """import { supabase } from '../../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';

const tempSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://wfbkgfotpzscjyaanzpx.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4',
  { auth: { persistSession: false, autoRefreshToken: false } }
);"""

if "createClient" not in content:
    content = content.replace("import { supabase } from '../../lib/supabaseClient';", import_replacement)


# Replace auth_data insertion
insertion_pattern = r"// 4\. Create auth record\s*await setDoc\(doc\(db, 'auth_data', uid\), \{\s*password: formData\.password,\s*phone: cleanPhone\s*\}\);"

replacement_insertion = """// 4. Create auth record
      const { error: signUpError } = await tempSupabase.auth.signUp({
        phone: cleanPhone,
        password: formData.password,
      });
      if (signUpError && signUpError.message !== 'User already registered') {
        throw new Error(`Authentication account creation failed: ${signUpError.message}`);
      }"""

content = re.sub(insertion_pattern, replacement_insertion, content)

with open('src/components/members/AddMemberForm.tsx', 'w') as f:
    f.write(content)
