import os
import re

files_to_update = [
    'src/components/Layout.tsx',
    'src/components/Sidebar.tsx',
    'src/pages/OneToOneMeetings.tsx',
    'src/pages/LandingPage.tsx',
    'src/pages/Connections.tsx',
    'src/pages/Meetings.tsx',
    'src/pages/Positions.tsx',
    'src/pages/Referrals.tsx',
    'src/components/members/MemberTable.tsx',
    'src/components/MemberTestimonials.tsx',
    'src/pages/Testimonials.tsx',
    'src/pages/Notifications.tsx'
]

def add_import(content, level):
    if 'import { Avatar }' not in content:
        import_path = "../components/Avatar" if level == 1 else "../../components/Avatar"
        if "src/pages/" in file or "src/components/" in file:
            import_path = "../components/Avatar"
            if file.count("/") > 2:
                import_path = "../../components/Avatar"
        
        # Insert after first import
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('import '):
                lines.insert(i, f"import {{ Avatar }} from '{import_path}';")
                break
        return '\n'.join(lines)
    return content

for file in files_to_update:
    if os.path.exists(file):
        with open(file, 'r') as f:
            content = f.read()
        
        level = file.count('/') - 1
        content = add_import(content, level)

        with open(file, 'w') as f:
            f.write(content)
