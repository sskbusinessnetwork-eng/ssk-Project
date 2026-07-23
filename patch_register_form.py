import re

with open('src/components/RegisterForm.tsx', 'r') as f:
    content = f.read()

# Replace auth_data insertion
insertion_pattern = r"// Also store in auth_data for consistency with rules if needed\s*await setDoc\(doc\(db, 'auth_data', uid\), \{\s*uid,\s*password: password,\s*updatedAt: new Date\(\)\.toISOString\(\)\s*\}\);"

replacement_insertion = """// Create authentication account
      const { error: signUpError } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password: password
      });
      if (signUpError && signUpError.message !== 'User already registered') {
        throw new Error(`Authentication account creation failed: ${signUpError.message}`);
      }"""

content = re.sub(insertion_pattern, replacement_insertion, content)

with open('src/components/RegisterForm.tsx', 'w') as f:
    f.write(content)
