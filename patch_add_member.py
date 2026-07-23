import re

with open('src/components/members/AddMemberForm.tsx', 'r') as f:
    content = f.read()

# Add bcrypt import
if "import bcrypt from 'bcryptjs';" not in content:
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport bcrypt from 'bcryptjs';")

# Remove tempSupabase
content = re.sub(r"const tempSupabase = createClient\([\s\S]*?\);\n", "", content)
content = re.sub(r"import \{ createClient \} from '@supabase/supabase-js';\n", "", content)

# Remove the signUp block
signUp_pattern = r"// 4\. Create auth record\s*const \{ error: signUpError \} = await tempSupabase\.auth\.signUp\(\{\s*phone: cleanPhone,\s*password: formData\.password,\s*\}\);\s*if \(signUpError && signUpError\.message !== 'User already registered'\) \{\s*throw new Error\(`Authentication account creation failed: \$\{signUpError\.message\}`\);\s*\}"
content = re.sub(signUp_pattern, "", content)

# Hash password
content = re.sub(r"password: formData\.password,", "password: bcrypt.hashSync(formData.password, 10),", content)

with open('src/components/members/AddMemberForm.tsx', 'w') as f:
    f.write(content)
