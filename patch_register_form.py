import re

with open('src/components/RegisterForm.tsx', 'r') as f:
    content = f.read()

# Add bcrypt import
if "import bcrypt from 'bcryptjs';" not in content:
    content = content.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport bcrypt from 'bcryptjs';")

# Hash password
content = re.sub(r"password: password, // Store plain text password as requested", "password: bcrypt.hashSync(password, 10), // Store hashed password securely", content)

# Remove signUp block
signUp_pattern = r"// Create authentication account\s*const \{ error: signUpError \} = await supabase\.auth\.signUp\(\{\s*phone: normalizedPhone,\s*password: password\s*\}\);\s*if \(signUpError && signUpError\.message !== 'User already registered'\) \{\s*throw new Error\(`Authentication account creation failed: \$\{signUpError\.message\}`\);\s*\}"
content = re.sub(signUp_pattern, "", content)

with open('src/components/RegisterForm.tsx', 'w') as f:
    f.write(content)
