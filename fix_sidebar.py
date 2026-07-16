with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '"hidden md:flex", \n      isOpen ? "translate-x-0" : "md:-translate-x-full lg:translate-x-0",\n      isCollapsed ? "lg:w-[78px]" : "lg:w-[290px] md:w-[290px]"',
    'isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",\n      isCollapsed ? "lg:w-[78px]" : "w-[290px] sm:w-[320px] lg:w-[290px]"'
)

# Ensure the close button is visible on mobile as well (lg:hidden covers both md and sm)
content = content.replace('className="lg:hidden p-1.5 hover:bg-[#1F2937] rounded-lg text-[#9CA3AF] hover:text-white transition-colors"',
                          'className="lg:hidden p-2 hover:bg-[#1F2937] rounded-xl text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"')


with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
