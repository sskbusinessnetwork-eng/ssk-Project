import re

with open('src/components/CreateChapter.tsx', 'r') as f:
    content = f.read()

# Add bcrypt import
if "import bcrypt from 'bcryptjs';" not in content:
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport bcrypt from 'bcryptjs';")

# Remove tempSupabase
content = re.sub(r"const tempSupabase = createClient\([\s\S]*?\);\n", "", content)
content = re.sub(r"import \{ createClient \} from '@supabase/supabase-js';\n", "", content)

# Remove the signUp block
signUp_pattern = r"\s*const \{ error: signUpError \} = await tempSupabase\.auth\.signUp\(\{\s*phone: phone,\s*password: defaultPassword,\s*\}\);\s*if \(signUpError && signUpError\.message !== 'User already registered'\) \{\s*throw new Error\(`Authentication account creation failed for \$\{leader\.fullName\}: \$\{signUpError\.message\}`\);\s*\}"
content = re.sub(signUp_pattern, "", content)

# Replace password: defaultPassword with hashed password
content = re.sub(r"password: defaultPassword,", "password: bcrypt.hashSync(defaultPassword, 10),", content)

with open('src/components/CreateChapter.tsx', 'w') as f:
    f.write(content)
