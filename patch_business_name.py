import re
with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

old_func = r"""  const formatBusinessAddress = \(user\?: UserProfile \| null\) => \{
    if \(\!user\) return null;
    const \{ businessName, address, city, state, pincode \} = user;"""

new_func = """  const formatBusinessAddress = (user?: any | null) => {
    if (!user) return null;
    const businessName = user.businessName || user.business_name;
    const { address, city, state, pincode } = user;"""

content = re.sub(old_func, new_func, content)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
