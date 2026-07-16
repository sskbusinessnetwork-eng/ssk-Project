with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'className="lg:hidden p-2 hover:bg-[#1F2937] rounded-xl text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"',
    'className="lg:hidden p-2 hover:bg-[#1F2937] rounded-xl text-[#9CA3AF] hover:text-white transition-colors cursor-pointer relative z-[70]"'
)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
