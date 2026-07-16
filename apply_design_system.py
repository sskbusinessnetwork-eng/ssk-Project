import os
import glob
import re

directories = ['src/pages', 'src/components']
files_to_process = []
for d in directories:
    files_to_process.extend(glob.glob(os.path.join(d, '*.tsx')))
    files_to_process.extend(glob.glob(os.path.join(d, '**/*.tsx'), recursive=True))

# Filter out Landing.tsx, Login.tsx, Register.tsx, Auth.tsx, Layout.tsx, Sidebar.tsx
exclude = ['Landing.tsx', 'Login.tsx', 'Register.tsx', 'Layout.tsx', 'Sidebar.tsx']
files_to_process = [f for f in files_to_process if os.path.basename(f) not in exclude]

replacements = {
    # Buttons
    'bg-blue-600': 'bg-primary',
    'hover:bg-blue-700': 'hover:bg-primary/90',
    'text-blue-600': 'text-primary',
    'hover:text-blue-700': 'hover:text-primary/80',
    'border-blue-600': 'border-primary',
    'bg-blue-50': 'bg-primary/5',
    'text-blue-700': 'text-primary',
    
    'bg-indigo-600': 'bg-primary',
    'hover:bg-indigo-700': 'hover:bg-primary/90',
    'text-indigo-600': 'text-primary',
    'hover:text-indigo-700': 'hover:text-primary/80',
    'border-indigo-600': 'border-primary',
    'bg-indigo-50': 'bg-primary/5',
    'text-indigo-700': 'text-primary',

    # Text Colors
    'text-slate-900': 'text-[#111827]',
    'text-slate-800': 'text-[#111827]',
    'text-slate-700': 'text-[#374151]',
    'text-slate-600': 'text-[#4B5563]',
    'text-slate-500': 'text-[#6B7280]',
    'text-slate-400': 'text-[#9CA3AF]',
    'text-gray-900': 'text-[#111827]',
    'text-gray-800': 'text-[#111827]',
    'text-gray-500': 'text-[#6B7280]',

    # Background Colors
    'bg-slate-50': 'bg-[#F9FAFB]',
    'bg-slate-100': 'bg-[#F3F4F6]',
    'bg-slate-800': 'bg-[#1F2937]',
    'bg-slate-900': 'bg-[#111827]',
    'bg-gray-50': 'bg-[#F9FAFB]',
    
    # Border Colors
    'border-slate-200': 'border-[#E5E7EB]',
    'border-slate-100': 'border-[#F3F4F6]',
    'border-slate-300': 'border-[#D1D5DB]',
    'border-gray-200': 'border-[#E5E7EB]',

    # Shadows & Cards
    'shadow-xl': 'shadow-[0_4px_20px_rgba(0,0,0,0.03)]',
    'shadow-lg': 'shadow-[0_2px_10px_rgba(0,0,0,0.02)]',
    'shadow-md': 'shadow-[0_1px_3px_rgba(0,0,0,0.02)]',
    'rounded-3xl': 'rounded-[24px]',
    'rounded-2xl': 'rounded-[16px]',
    'rounded-xl': 'rounded-[12px]',
    
    # Spacing & Sizing for Compactness
    'p-8': 'p-6',
    'px-8': 'px-6',
    'py-8': 'py-6',
    'gap-8': 'gap-6',
    'p-10': 'p-8',
    'py-12': 'py-8',
    'py-16': 'py-10',

    # Typography
    'font-black': 'font-bold',
    'font-extrabold': 'font-bold',
}

for filepath in set(files_to_process):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)

print(f"Processed {len(files_to_process)} files.")
