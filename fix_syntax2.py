import re

with open('src/pages/ManageSubscriptions.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if line.strip() == '// Listen to changes' and not skip:
        # Check if next lines are the bad ones
        if i + 7 < len(lines) and '];' in lines[i+7] and '}' in lines[i+8]:
            new_lines.append('    // Listen to changes\n')
            new_lines.append('    let constraints: any[] = [];\n')
            new_lines.append('    if (profile.role !== \'MASTER_ADMIN\') {\n')
            new_lines.append('      constraints = [{ type: \'where\', field: \'chapter_id\', operator: \'==\', value: profile.chapter_id }];\n')
            new_lines.append('    }\n')
            skip = True
            # Skip until the subscribe line
            continue
    
    if skip:
        if 'unsubUsers =' in line:
            skip = False
            new_lines.append(line)
        continue
    
    new_lines.append(line)

with open('src/pages/ManageSubscriptions.tsx', 'w') as f:
    f.writelines(new_lines)

