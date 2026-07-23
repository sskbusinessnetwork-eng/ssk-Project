with open('src/pages/Profile.tsx', 'r') as f:
    content = f.read()

content = content.replace('<Avatar src={targetProfile.photoURL} name={targetProfile.name} size="w-24 h-24" className="" />', '<Avatar src={targetProfile.photoURL} name={targetProfile.name} size="w-24 h-24" className="mx-auto border-4 border-[#111827] shadow-[0_1px_3px_rgba(0,0,0,0.02)]" fallbackClassName="mx-auto border-4 border-[#111827]" />')

content = content.replace('<Avatar src={formData.photoURL} name={formData.name} size="w-full h-full" className="" />', '<Avatar src={formData.photoURL} name={formData.name} size="w-full h-full" className="" fallbackClassName="text-4xl" />')

with open('src/pages/Profile.tsx', 'w') as f:
    f.write(content)
