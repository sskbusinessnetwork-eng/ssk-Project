import re

files_to_fix = [
    "src/components/WriteTestimonialModal.tsx",
    "src/components/RegisterForm.tsx",
    "src/pages/Admins.tsx",
    "src/pages/Profile.tsx"
]

for filepath in files_to_fix:
    with open(filepath, "r") as f:
        content = f.read()
    
    # Replace the single-quoted string containing span with the actual JSX element
    # e.g., '<span className="text-red-500">*</span>' -> <span className="text-red-500">*</span>
    content = content.replace("'<span className=\"text-red-500\">*</span>'", "<span className=\"text-red-500\">*</span>")
    
    with open(filepath, "w") as f:
        f.write(content)

